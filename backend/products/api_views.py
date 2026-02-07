import os
import tempfile
import numpy as np
import traceback
from rest_framework import generics, views, status, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Case, When
from django.core.paginator import Paginator

from .models import Product, Category, Review
from .serializers import ProductSerializer, ProductDetailSerializer, ReviewSerializer
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION, VISUAL_COLLECTION
from recommendations.chains import get_budget_profiling_chain
from recommendations.graph import create_recommendation_graph

# LangChain / Qdrant Imports
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_qdrant import QdrantVectorStore
from fastembed import ImageEmbedding, TextEmbedding

class ProductDetailAPIView(generics.RetrieveAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductDetailSerializer
    permission_classes = [permissions.AllowAny]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        product = self.get_object()
        
        # Similar Products Logic (Visual -> Category fallback)
        similar_products = []
        try:
            client = get_qdrant_client()
            discovery_results = client.query_points(
                collection_name=VISUAL_COLLECTION,
                query=product.pk,
                limit=5
            )
            sim_ids = [point.id for point in discovery_results.points if point.id != product.pk]
            if sim_ids:
                preserved = Case(*[When(pk=pk_val, then=pos) for pos, pk_val in enumerate(sim_ids)])
                similar_products = Product.objects.filter(pk__in=sim_ids).order_by(preserved)[:4]
        except Exception as e:
            print(f"Visual similarity failed (API): {e}")

        if not similar_products:
            similar_products = Product.objects.filter(category=product.category).exclude(pk=product.pk)[:4]
        
        context['similar_products'] = similar_products
        return context

class AddReviewAPIView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        product_id = self.kwargs['product_id']
        product = get_object_or_404(Product, pk=product_id)
        serializer.save(user=self.request.user, product=product)

class VisualSearchAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if 'image' not in request.FILES:
            return Response({'error': 'No image provided'}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.FILES['image']
        text_context = request.data.get('q', '').strip()

        try:
            # 1. Image Embedding
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                for chunk in image_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            image_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
            image_embedding = list(image_model.embed([tmp_path]))[0]
            os.unlink(tmp_path)

            # 2. Zero-Shot & LLM Profiling (Simplified for API response speed, can be enhanced)
            # For now, we reuse the core retrieval logic
            
            client = get_qdrant_client()
            visual_results = client.query_points(
                collection_name=VISUAL_COLLECTION,
                query=image_embedding.tolist(),
                limit=50
            )
            
            candidate_ids = [point.id for point in visual_results.points]
            
            # Simple retrieval for now, bypassing the complex re-ranking to ensuring JSON response speed
            # Can add back strict re-ranking if needed
            
            if candidate_ids:
                preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(candidate_ids)])
                products = Product.objects.filter(pk__in=candidate_ids).order_by(preserved)
            else:
                products = Product.objects.none()

            serializer = ProductSerializer(products, many=True)
            return Response(serializer.data)

        except Exception as e:
            traceback.print_exc()
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class ResultsAPIView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        query = request.query_params.get('q', '')
        category_id = request.query_params.get('category')
        use_smart = request.query_params.get('smart', '1') == '1'
        page = request.query_params.get('page', 1)

        products = Product.objects.all()
        explanation = None
        inferred_budget = None

        if query:
            if use_smart:
                try:
                    # Use user profile if authenticated, otherwise use default profile
                    if request.user.is_authenticated:
                        user_profile = {
                            "monthly_budget": float(request.user.monthly_budget) if hasattr(request.user, 'monthly_budget') else 1000.0,
                            "spending_habits": request.user.payment_preferences if hasattr(request.user, 'payment_preferences') else 'card'
                        }
                    else:
                        # Default profile for unauthenticated users - budget will be inferred from query
                        user_profile = {
                            "monthly_budget": 1000.0,
                            "spending_habits": 'card'
                        }
                    
                    app = create_recommendation_graph()
                    state = {
                        "query": query,
                        "user_profile": user_profile,
                        "inferred_budget": {},
                        "retrieved_products": [],
                        "filtered_products": [],
                        "final_recommendations": [],
                        "explanation": "",
                        "cart_total": 0.0,
                        "visual_ids": [],
                        "diversity": 0.7
                    }
                    result = app.invoke(state)
                    if result.get("final_recommendations"):
                        p_ids = [p.get('id') for p in result["final_recommendations"] if p.get('id')]
                        if p_ids:
                            preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(p_ids)])
                            products = Product.objects.filter(pk__in=p_ids).order_by(preserved)
                            explanation = result.get("explanation")
                            inferred_budget = result.get("inferred_budget")
                        else:
                            # If no recommendations, fallback to semantic search
                            products = self.semantic_search(query)
                    else:
                        # If no recommendations, fallback to semantic search
                        products = self.semantic_search(query)
                except Exception as e:
                    print(f"Smart search failed: {e}")
                    import traceback
                    traceback.print_exc()
                    # Fallback to semantic
                    products = self.semantic_search(query)
            else:
                products = self.semantic_search(query)
        
        if category_id:
            products = products.filter(category_id=category_id)

        paginator = Paginator(products, 20)
        page_obj = paginator.get_page(page)
        
        serializer = ProductSerializer(page_obj.object_list, many=True)
        return Response({
            'results': serializer.data,
            'count': products.count() if hasattr(products, 'count') else len(products),
            'pages': paginator.num_pages,
            'explanation': explanation,
            'inferred_budget': inferred_budget
        })

    def semantic_search(self, query):
        try:
            client = get_qdrant_client()
            embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=PRODUCTS_COLLECTION,
                embedding=embeddings,
            )
            search_results = vector_store.similarity_search_with_score(query, k=50)
            ids = [doc.metadata.get('id') for doc, score in search_results]
            preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(ids)])
            return Product.objects.filter(pk__in=ids).order_by(preserved)
        except Exception:
            from django.db.models import Q
            return Product.objects.filter(title__icontains=query)

class CategoryListAPIView(generics.ListAPIView):
    """API endpoint to list all categories."""
    queryset = Category.objects.all().order_by('name')
    serializer_class = ProductSerializer  # Will use CategorySerializer
    permission_classes = [permissions.AllowAny]
    
    def list(self, request, *args, **kwargs):
        categories = self.get_queryset()
        # Return simple category data
        data = [
            {
                'id': cat.id,
                'name': cat.name
            }
            for cat in categories
        ]
        return Response(data)
