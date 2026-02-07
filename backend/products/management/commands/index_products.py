from django.core.management.base import BaseCommand
from products.models import Product
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION, delete_collection, init_products_collection
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_core.documents import Document

class Command(BaseCommand):
    help = 'Index all products into Qdrant for vector search'

    def handle(self, *args, **kwargs):
        self.stdout.write('Clearing existing products in Qdrant...')
        delete_collection(PRODUCTS_COLLECTION)
        init_products_collection()
        
        self.stdout.write('Initializing Qdrant client and embeddings...')
        
        client = get_qdrant_client()
        embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
        
        vector_store = QdrantVectorStore(
            client=client,
            collection_name=PRODUCTS_COLLECTION,
            embedding=embeddings,
        )
        
        self.stdout.write('Fetching products...')
        products = Product.objects.all().select_related('category')
        base_count = products.count()
        self.stdout.write(f'Found {base_count} products to index.')
        
        documents = []
        for product in products:
            # Create a rich text representation for embedding
            page_content = f"Title: {product.title}\nDescription: {product.description}\nCategory: {product.category.name if product.category else 'Unknown'}\nPrice: {product.price}"
            
            # Metadata for filtering and retrieval
            metadata = {
                "id": product.id,
                "title": product.title,
                "price": product.price, # Stored as string in DB, might need cleaning in future but Qdrant payload stores as is.
                "category": product.category.name if product.category else "Unknown",
                "rating": product.rating,
                "image": product.image or product.get_first_image(),
                "barcode": product.barcode
            }
            
            doc = Document(page_content=page_content, metadata=metadata)
            documents.append(doc)
            
        if documents:
            self.stdout.write(f'Indexing {len(documents)} vectors... This may take a while.')
            # Batch size is handled by QdrantVectorStore internally usually, but let's just add all
            try:
                vector_store.add_documents(documents)
                self.stdout.write(self.style.SUCCESS(f'Successfully indexed {len(documents)} products!'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error indexing: {str(e)}'))
        else:
            self.stdout.write('No products found to index.')
