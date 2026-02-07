from pay4all.qdrant_config import get_qdrant_client, PRODUCTS_COLLECTION, VISUAL_COLLECTION
import logging

logger = logging.getLogger(__name__)

def search_products_with_mmr(query_vector, limit=20, diversity=0.7, score_threshold=0.3):
    """
    Search with semantic similarity for diverse results.
    
    Note: Qdrant's query_points doesn't support MMR natively in the current version,
    so we use standard semantic search. For true MMR, consider post-processing results.
    
    Args:
        query_vector: Embedding vector for the search query
        limit: Number of results to return
        diversity: 0.0 = pure relevance, 1.0 = pure diversity (currently unused)
        score_threshold: Minimum similarity threshold (0.0-1.0)
    
    Returns:
        List of search results with relevant products
    """
    client = get_qdrant_client()
    
    try:
        results = client.query_points(
            collection_name=PRODUCTS_COLLECTION,
            query=query_vector,
            limit=limit,
            score_threshold=score_threshold
        )
        
        logger.info(f"Search returned {len(results.points)} results")
        return results.points
        
    except Exception as e:
        logger.error(f"Error in search: {e}")
        return []


def search_visual_products_with_mmr(query_vector, limit=20, diversity=0.7, score_threshold=0.3):
    """
    Search visual products for diverse image-based results.
    
    Args:
        query_vector: Image embedding vector
        limit: Number of results to return
        diversity: 0.0 = pure relevance, 1.0 = pure diversity (currently unused)
        score_threshold: Minimum similarity threshold
    
    Returns:
        List of visually relevant products
    """
    client = get_qdrant_client()
    
    try:
        results = client.query_points(
            collection_name=VISUAL_COLLECTION,
            query=query_vector,
            limit=limit,
            score_threshold=score_threshold
        )
        
        logger.info(f"Visual search returned {len(results.points)} results")
        return results.points
        
    except Exception as e:
        logger.error(f"Error in visual search: {e}")
        return []
