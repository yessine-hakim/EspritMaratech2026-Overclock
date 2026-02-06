from django.shortcuts import render, get_object_or_404, redirect
from django.core.paginator import Paginator
from .models import Product, Category, Review
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_qdrant import QdrantVectorStore
from django.db.models import Case, When
from django.contrib.auth.decorators import login_required
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION, VISUAL_COLLECTION
from fastembed import ImageEmbedding
import os
from django.urls import reverse
from recommendations.chains import get_budget_profiling_chain
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from fastembed import TextEmbedding
import numpy as np
import tempfile




@login_required
def product_detail(request, pk):
    product = get_object_or_404(Product, pk=pk)
    
    # AI Search: Get visually similar products using Qdrant Discovery
    similar_products = []
    try:
        client = get_qdrant_client()
        # Use DiscoveryQuery to find products similar to this one, but staying roughly in the neighborhood
        # This is better than just search if we want specific 'styles'
        discovery_results = client.query_points(
            collection_name=VISUAL_COLLECTION,
            query=pk, # Qdrant allows using ID directly as a 'positive' reference
            limit=5
        )
        
        sim_ids = [point.id for point in discovery_results.points if point.id != pk]
        
        if sim_ids:
            # Preserve order of similarity
            preserved = Case(*[When(pk=pk_val, then=pos) for pos, pk_val in enumerate(sim_ids)])
            similar_products = Product.objects.filter(pk__in=sim_ids).order_by(preserved)[:4]
            print(f"Visual Similarily matched {len(similar_products)} products for ID {pk}")
            
    except Exception as e:
        print(f"Visual similarity failed for product {pk}: {e}")

    # Fallback to category-based filtering if visual results are empty
    if not similar_products:
        similar_products = Product.objects.filter(category=product.category).exclude(pk=product.pk)[:4]
        print(f"Fallback to category results for product {pk}")

    
    # Reviews logic
    reviews = product.reviews.all().order_by('-created_at')
    
    # 1. Start with local reviews
    rating_counts = {i: 0 for i in range(1, 6)}
    local_count = 0
    local_sum = 0
    
    for review in reviews:
        if 1 <= review.rating <= 5:
            rating_counts[review.rating] += 1
            local_count += 1
            local_sum += review.rating

    # 2. Parse scraped data
    scraped_avg = 0.0
    scraped_count = 0
    
    if product.rating:
        try:
            # Handle "4,5", "4.5", "4.5 (19)" logic if needed, though shell showed "4,5"
            cleaned_rating = str(product.rating).replace(',', '.').split(' ')[0]
            scraped_avg = float(cleaned_rating)
        except (ValueError, TypeError):
            pass

    if product.nbr_rating:
        try:
            # Handle "(19)", "19 reviews"
            cleaned_count = ''.join(filter(str.isdigit, str(product.nbr_rating)))
            if cleaned_count:
                scraped_count = int(cleaned_count)
        except (ValueError, TypeError):
            pass

    # 3. Incorporate scraped data into distribution (Approximation)
    if scraped_count > 0 and 1.0 <= scraped_avg <= 5.0:
        # Distribute scraped count between floor and ceil of average
        # Equation: x * floor + y * ceil = avg * count
        #           x + y = count
        import math
        floor_val = math.floor(scraped_avg)
        ceil_val = math.ceil(scraped_avg)
        
        if floor_val == ceil_val:
            rating_counts[floor_val] += scraped_count
        else:
            # weight of ceil is decimal part
            ceil_weight = scraped_avg - floor_val
            count_ceil = int(round(scraped_count * ceil_weight))
            count_floor = scraped_count - count_ceil
            
            # Sanity check buckets (1-5)
            if 1 <= ceil_val <= 5: rating_counts[ceil_val] += count_ceil
            if 1 <= floor_val <= 5: rating_counts[floor_val] += count_floor

    # 4. Calculate Final Stats
    total_reviews = local_count + scraped_count
    
    rating_stats = []
    if total_reviews > 0:
        for star in range(5, 0, -1):
            count = rating_counts[star]
            percent = (count / total_reviews) * 100
            rating_stats.append({
                'star': star,
                'count': count,
                'percent': percent,
                'percent_int': int(percent)
            })
    else:
        for star in range(5, 0, -1):
            rating_stats.append({'star': star, 'count': 0, 'percent': 0, 'percent_int': 0})

    # Update product rating for display if needed (weighted average of all)
    final_rating = scraped_avg  # Default to scraped if dominant
    if total_reviews > 0:
        total_sum = (scraped_avg * scraped_count) + local_sum
        final_rating = total_sum / total_reviews

    context = {
        'product': product,
        'similar_products': similar_products,
        'reviews': reviews,
        'total_reviews': total_reviews,
        'rating_stats': rating_stats,
        'display_rating': round(final_rating, 1) if total_reviews > 0 else "N/A",
    }
    return render(request, 'products/product.html', context)

def visual_search(request):
    """
    Advanced Multimodal Search with Zero-Shot Intent Alignment.
    """
    print(f"--- [DEBUG] visual_search view reached ---")
    print(f"Method: {request.method}")
    print(f"POST keys: {list(request.POST.keys())}")
    print(f"FILES keys: {list(request.FILES.keys())}")
    
    if request.method == 'POST' and (request.FILES.get('image') or request.POST.get('image')):
        image_file = request.FILES.get('image')
        text_context = request.POST.get('q', '').strip()
        
        try:
            print(f"Processing image: {image_file}")
            print(f"Text Context: '{text_context}'")


            # 1. Image Embedding (CLIP)
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                for chunk in image_file.chunks():
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            print(f"Temp image saved to: {tmp_path}")
            image_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
            image_embedding = list(image_model.embed([tmp_path]))[0]
            os.unlink(tmp_path)
            print(f"Image embedding generated. Length: {len(image_embedding)}")

            # 2. Zero-Shot Category Detection
            visual_inferred_category = None
            try:
                text_model = TextEmbedding(model_name="Qdrant/clip-ViT-B-32-text")
                categories = list(Category.objects.values_list('name', flat=True))
                cat_embeddings = list(text_model.embed(categories))
                
                img_v = np.array(image_embedding)
                cat_v = np.array(cat_embeddings)
                similarities = np.dot(cat_v, img_v)
                top_cat_index = np.argmax(similarities)
                visual_inferred_category = categories[top_cat_index].lower()
                print(f"Zero-Shot: Category='{visual_inferred_category}' (Score: {similarities[top_cat_index]})")
            except Exception as e:
                print(f"Zero-Shot Failed: {e}")

            # 3. LLM Intent
            min_price, max_price = 0, 1000000
            text_inferred_category = None
            if text_context:
                try:
                    profiler = get_budget_profiling_chain()
                    budget_info = profiler.invoke({"query": text_context, "user_profile": {"monthly_budget": 1000.0}})
                    min_price = budget_info.get('min_budget', 0)
                    max_price = budget_info.get('max_budget', 1000000)
                    text_inferred_category = budget_info.get('intended_category')
                    if text_inferred_category == 'other': text_inferred_category = None
                    print(f"LLM Profile: Category='{text_inferred_category}', Price={min_price}-{max_price}")
                except Exception as e:
                    print(f"LLM Profiling Failed: {e}")

            target_category = text_inferred_category or visual_inferred_category
            print(f"Final Search Intent: Category='{target_category}'")

            # 4. Qdrant Retrieval
            client = get_qdrant_client()
            visual_results = client.query_points(
                collection_name=VISUAL_COLLECTION,
                query=image_embedding.tolist(),
                limit=300
            )
            candidate_map = {point.id: point.score for point in visual_results.points}
            candidate_ids = list(candidate_map.keys())
            print(f"Retrieved {len(candidate_ids)} candidates from Qdrant")

            # 5. Filtering and Re-ranking
            def parse_price(p_str):
                if not p_str: return 0.0
                try:
                    clean = str(p_str).replace('$', '').replace('€', '').replace(',', '').strip()
                    return float(clean.split(' ')[0])
                except: return 0.0

            products_qs = Product.objects.filter(pk__in=candidate_ids).select_related('category')
            final_candidates = []
            for product in products_qs:
                price_val = parse_price(product.price or product.selling_price)
                product_cat = product.category.name.lower() if product.category else ""
                
                if min_price <= price_val <= max_price:
                    score = candidate_map.get(product.id, 0)
                    if target_category:
                        if product_cat == target_category.lower():
                            score += 0.5
                        else:
                            score -= 0.3
                    final_candidates.append({'id': product.id, 'score': score})
            
            final_candidates.sort(key=lambda x: x['score'], reverse=True)
            ids = [p['id'] for p in final_candidates[:20]]
            print(f"Final results: {len(ids)} IDs")
            
            if not ids:
                print("No results after filtering, using top visual matches")
                ids = candidate_ids[:20]

            url = f"{reverse('results')}?visual_ids={','.join(map(str, ids))}"
            if text_context: url += f"&q={text_context}"
            return redirect(url)
            
        except Exception as e:
            print(f"ULTIMATE FAILURE in visual_search: {e}")
            import traceback
            traceback.print_exc()
            
    # Fallback with query if available
    url = reverse('results')
    if request.POST.get('q'):
        url += f"?q={request.POST.get('q')}"
    return redirect(url)





@login_required
def add_review(request, product_id):
    if request.method == 'POST':
        product = get_object_or_404(Product, pk=product_id)
        rating = request.POST.get('rating')
        comment = request.POST.get('comment')
        
        if rating and comment:
            Review.objects.create(
                product=product,
                user=request.user,
                rating=int(rating),
                comment=comment
            )
            
    return redirect('product_detail', pk=product_id)

@login_required
def results(request):
    query = request.GET.get('q', '')
    visual_ids = request.GET.get('visual_ids')
    category_ids = request.GET.getlist('category')

    use_smart_search = request.GET.get('smart', '1') == '1'  # Default to smart search
    
    products = Product.objects.all()
    smart_results = False
    inferred_budget = None
    inferred_budget = None
    explanation = None
    
    if visual_ids:
        try:
            ids = [int(id) for id in visual_ids.split(',')]
            if ids:
                preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(ids)])
                products = Product.objects.filter(pk__in=ids).order_by(preserved)
                smart_results = True # Reuse smart results UI for visual match indication
        except ValueError:
            pass

    if query and not visual_ids and use_smart_search and request.user.is_authenticated:

        # Use AI recommendation system for logged-in users
        try:
            from recommendations.graph import create_recommendation_graph
            
            user_profile = {
                "monthly_budget": float(request.user.monthly_budget) if hasattr(request.user, 'monthly_budget') else 1000.0,
                "spending_habits": request.user.payment_preferences if hasattr(request.user, 'payment_preferences') else 'card'
            }
            
            app = create_recommendation_graph()
            initial_state = {
                "query": query,
                "user_profile": user_profile,
                "inferred_budget": {},
                "retrieved_products": [],
                "filtered_products": [],
                "final_recommendations": [],
                "explanation": ""
            }
            
            result = app.invoke(initial_state)
            
            # Extract product IDs from recommendations
            if result.get("final_recommendations"):
                product_ids = [p.get('id') for p in result["final_recommendations"] if p.get('id')]
                if product_ids:
                    preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(product_ids)])
                    products = Product.objects.filter(pk__in=product_ids).order_by(preserved)
                    smart_results = True
                    inferred_budget = result.get("inferred_budget")
                    explanation = result.get("explanation")
            
        except Exception as e:
            print(f"Smart search failed: {e}. Falling back to semantic search.")
            use_smart_search = False
    
    # Fallback to semantic search if not using smart search
    if query and not smart_results:
        try:
            # Use Qdrant for semantic search
            client = get_qdrant_client()
            embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
            vector_store = QdrantVectorStore(
                client=client,
                collection_name=PRODUCTS_COLLECTION,
                embedding=embeddings,
            )
            
            search_results = vector_store.similarity_search_with_score(query, k=50)
            product_ids = [doc.metadata.get('id') for doc, score in search_results]
            
            if product_ids:
                preserved = Case(*[When(pk=pk, then=pos) for pos, pk in enumerate(product_ids)])
                products = Product.objects.filter(pk__in=product_ids).order_by(preserved)
            else:
                products = Product.objects.none()
                
        except Exception as e:
            print(f"Vector search failed: {e}. Falling back to keyword search.")
            from django.db.models import Q
            keywords = query.split()
            q_obj = Q()
            for term in keywords:
                q_obj &= (Q(title__icontains=term) | Q(name__icontains=term))
            products = products.filter(q_obj)

    if category_ids:
        try:
            # Filter by any of the selected categories
            category_ids = [int(site_id) for site_id in category_ids if site_id.isdigit()]
            if category_ids:
                products = products.filter(category__id__in=category_ids)
        except ValueError:
            pass 

    paginator = Paginator(products, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'query': query,
        'selected_category_ids': category_ids,  # Pass list of ints
        'total_count': products.count(),
        'categories': Category.objects.all(),
        'smart_results': smart_results,
        'inferred_budget': inferred_budget,
        'explanation': explanation,
        'use_smart_search': use_smart_search,
    }
    return render(request, 'products/results.html', context)
