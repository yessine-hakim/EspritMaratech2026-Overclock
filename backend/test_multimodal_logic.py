import os
import django
import numpy as np
from fastembed import ImageEmbedding
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from qdrant_client import models
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION, VISUAL_COLLECTION
from PIL import Image

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

from products.models import Product

def test_full_logic():
    client = get_qdrant_client()
    text_context = "yoghurt"
    
    print(f"--- Step 1: Text Search for '{text_context}' ---")
    text_embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=PRODUCTS_COLLECTION,
        embedding=text_embeddings,
    )
    text_results = vector_store.similarity_search_with_score(text_context, k=100)
    print(f"Text search found {len(text_results)} results.")
    
    text_candidate_ids = []
    for doc, score in text_results:
        if doc.metadata.get('id'):
            text_candidate_ids.append(int(doc.metadata['id']))
            print(f"  - {doc.metadata.get('title')} (ID: {doc.metadata.get('id')}) Score: {score}")
    
    if not text_candidate_ids:
        print("Error: No text candidates found!")
        return

    print(f"\n--- Step 2: Visual Search with HasIdCondition filter ---")
    # dummy image embedding
    dummy_vec = np.zeros(512)
    
    search_filter = models.Filter(
        must=[
            models.HasIdCondition(has_id=text_candidate_ids)
        ]
    )
    
    visual_results = client.query_points(
        collection_name=VISUAL_COLLECTION,
        query=dummy_vec.tolist(),
        query_filter=search_filter,
        limit=10
    )
    
    print(f"Visual search returned {len(visual_results.points)} results.")
    for point in visual_results.points:
        p_id = point.id
        p_title = point.payload.get('title')
        print(f"  - {p_title} (ID: {p_id})")

if __name__ == "__main__":
    test_full_logic()
