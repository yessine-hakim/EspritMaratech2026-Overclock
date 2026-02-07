from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION
from qdrant_client.models import SearchParams
import logging

logger = logging.getLogger(__name__)

def search_products_with_mmr(query_vector, limit=20, diversity=0.7, score_threshold=0.3):
    """
    Search with MMR (Maximal Marginal Relevance) for diverse results.
    
    Args:
        query_vector: Embedding vector for the search query
        limit: Number of results to return
        diversity: 0.0 = pure relevance, 1.0 = pure diversity (recommended: 0.5-0.8)
        score_threshold: Minimum similarity threshold (0.0-1.0)
    
    Returns:
        List of search results with diverse, relevant products
    """
    client = get_qdrant_client()
    
    try:
        # Qdrant uses lambda parameter: lambda = 1 - diversity
        # lambda = 1.0 means pure relevance
        # lambda = 0.0 means pure diversity
        mmr_lambda = 1.0 - diversity
        
        results = client.search(
            collection_name=PRODUCTS_COLLECTION,
            query_vector=query_vector,
            limit=limit,
            search_params=SearchParams(
                exact=False  # Use HNSW for faster approximate search
            ),
            with_payload=True,
            score_threshold=score_threshold,
            # MMR parameters
            using="mmr" if diversity > 0 else None,
            mmr_lambda=mmr_lambda if diversity > 0 else None
        )
        
        logger.info(f"MMR search returned {len(results)} results (diversity={diversity})")
        return results
        
    except Exception as e:
        logger.error(f"Error in MMR search: {e}")
        # Fallback to regular search
        results = client.search(
            collection_name=PRODUCTS_COLLECTION,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
            score_threshold=score_threshold
        )
        return results


def search_visual_products_with_mmr(query_vector, limit=20, diversity=0.7, score_threshold=0.3):
    """
    Search visual products with MMR for diverse image-based results.
    
    Args:
        query_vector: Image embedding vector
        limit: Number of results to return
        diversity: 0.0 = pure relevance, 1.0 = pure diversity
        score_threshold: Minimum similarity threshold
    
    Returns:
        List of visually diverse, relevant products
    """
    from pay4all.qdrant_config import VISUAL_COLLECTION
    
    client = get_qdrant_client()
    mmr_lambda = 1.0 - diversity
    
    try:
        results = client.search(
            collection_name=VISUAL_COLLECTION,
            query_vector=query_vector,
            limit=limit,
            search_params=SearchParams(exact=False),
            with_payload=True,
            score_threshold=score_threshold,
            using="mmr" if diversity > 0 else None,
            mmr_lambda=mmr_lambda if diversity > 0 else None
        )
        
        logger.info(f"Visual MMR search returned {len(results)} results")
        return results
        
    except Exception as e:
        logger.error(f"Error in visual MMR search: {e}")
        # Fallback to regular search
        results = client.search(
            collection_name=VISUAL_COLLECTION,
            query_vector=query_vector,
            limit=limit,
            with_payload=True,
            score_threshold=score_threshold
        )
        return results
