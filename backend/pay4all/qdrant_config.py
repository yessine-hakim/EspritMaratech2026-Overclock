"""
Qdrant client configuration and utilities for vector search
"""
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams
from dotenv import load_dotenv

load_dotenv()

# Initialize Qdrant client
def get_qdrant_client():
    """Get or create Qdrant client instance"""
    return QdrantClient(
        url=os.environ.get("QDRANT_URL"),
        api_key=os.environ.get("QDRANT_API_KEY"),
    )

# Collection name for products
PRODUCTS_COLLECTION = "products"
VISUAL_COLLECTION = "products_visual"


def init_products_collection(client=None, vector_size=384):
    """
    Initialize products collection in Qdrant
    
    Args:
        client: Qdrant client instance (optional)
        vector_size: Size of embedding vectors (default: 384 for all-MiniLM-L6-v2)
    """
    if client is None:
        client = get_qdrant_client()
    
    # Check if collection exists
    collections = client.get_collections().collections
    collection_names = [col.name for col in collections]
    
    if PRODUCTS_COLLECTION not in collection_names:
        # Create collection
        client.create_collection(
            collection_name=PRODUCTS_COLLECTION,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )
        print(f"Created collection: {PRODUCTS_COLLECTION}")
    else:
        print(f"Collection {PRODUCTS_COLLECTION} already exists")
    
    return client

def init_visual_collection(client=None, vector_size=512):
    """
    Initialize visual products collection in Qdrant (CLIP embeddings)
    
    Args:
        client: Qdrant client instance
        vector_size: Size of embedding vectors (default: 512 for CLIP ViT-B/32)
    """
    if client is None:
        client = get_qdrant_client()
    
    collections = client.get_collections().collections
    collection_names = [col.name for col in collections]
    
    if VISUAL_COLLECTION not in collection_names:
        client.create_collection(
            collection_name=VISUAL_COLLECTION,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE
            )
        )
        print(f"Created collection: {VISUAL_COLLECTION}")
    else:
        print(f"Collection {VISUAL_COLLECTION} already exists")
    
    return client


def delete_collection(collection_name, client=None):
    """Delete a collection from Qdrant"""
    if client is None:
        client = get_qdrant_client()
    
    try:
        client.delete_collection(collection_name=collection_name)
        print(f"Deleted collection: {collection_name}")
        return True
    except Exception as e:
        print(f"Error deleting collection {collection_name}: {e}")
        return False

def sync_product_text(product, client=None):
    """Index or update a single product in the text collection"""
    from langchain_qdrant import QdrantVectorStore
    from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
    from langchain_core.documents import Document
    
    if client is None:
        client = get_qdrant_client()
        
    embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=PRODUCTS_COLLECTION,
        embedding=embeddings,
    )
    
    page_content = f"Title: {product.title}\nDescription: {product.description}\nCategory: {product.category.name if product.category else 'Unknown'}\nPrice: {product.price}"
    metadata = {
        "id": product.id,
        "title": product.title,
        "price": product.price,
        "category": product.category.name if product.category else "Unknown",
        "rating": product.rating,
        "image": product.image or product.get_first_image()
    }
    
    # QdrantVectorStore uses add_documents which handles upsert by ID if provided in metadata?
    # Actually QdrantVectorStore uses internal ID generation usually. 
    # For sync, it's safer to delete then add, or use a specific ID.
    # We'll use the product.id as the point ID.
    
    # Manual upsert to guarantee ID consistency
    from qdrant_client.models import PointStruct
    vector = embeddings.embed_query(page_content)
    client.upsert(
        collection_name=PRODUCTS_COLLECTION,
        points=[PointStruct(
            id=product.id,
            vector=vector,
            payload=metadata
        )]
    )

def sync_product_visual(product, client=None):
    """Index or update a single product in the visual collection"""
    from fastembed import ImageEmbedding
    from qdrant_client.models import PointStruct
    import requests
    import tempfile
    
    image_url = product.get_first_image()
    if not image_url:
        return
        
    if client is None:
        client = get_qdrant_client()
        
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(image_url, headers=headers, stream=True, timeout=10)
        if response.status_code == 200:
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                for chunk in response.iter_content(1024):
                    tmp.write(chunk)
                tmp_path = tmp.name
            
            try:
                embedding_model = ImageEmbedding(model_name="Qdrant/clip-ViT-B-32-vision")
                embedding = list(embedding_model.embed([tmp_path]))[0]
                
                client.upsert(
                    collection_name=VISUAL_COLLECTION,
                    points=[PointStruct(
                        id=product.id,
                        vector=embedding,
                        payload={
                            "title": product.title,
                            "price": product.price,
                            "image": image_url,
                            "category": product.category.name if product.category else "Uncategorized"
                        }
                    )]
                )
            finally:
                import os
                if os.path.exists(tmp_path): os.unlink(tmp_path)
    except Exception as e:
        print(f"Visual sync failed for {product.id}: {e}")

def delete_product_from_qdrant(product_id, client=None):
    """Remove product from both collections"""
    if client is None:
        client = get_qdrant_client()
    
    try:
        client.delete(collection_name=PRODUCTS_COLLECTION, points_selector=[product_id])
        client.delete(collection_name=VISUAL_COLLECTION, points_selector=[product_id])
    except Exception as e:
        print(f"Deletion from Qdrant failed for {product_id}: {e}")
