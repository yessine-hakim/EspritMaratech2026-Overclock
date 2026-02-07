import os
import django
from langchain_qdrant import QdrantVectorStore
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pay4all.settings')
django.setup()

def debug_text_search():
    client = get_qdrant_client()
    text_embeddings = FastEmbedEmbeddings(model_name="BAAI/bge-small-en-v1.5")
    vector_store = QdrantVectorStore(
        client=client,
        collection_name=PRODUCTS_COLLECTION,
        embedding=text_embeddings,
    )
    
    print("Searching for 'yoghurt'...")
    results = vector_store.similarity_search_with_score("yoghurt", k=10)
    
    print(f"Found {len(results)} results:")
    for doc, score in results:
        print(f"- {doc.metadata.get('title')} (ID: {doc.metadata.get('id')}) - Score: {score}")

if __name__ == "__main__":
    debug_text_search()
