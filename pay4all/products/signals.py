from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Product
from pay4all.qdrant_config import sync_product_text, sync_product_visual, delete_product_from_qdrant

@receiver(post_save, sender=Product)
def product_post_save(sender, instance, created, **kwargs):
    """
    Triggered whenever a product is created or updated.
    Syncs both text and visual embeddings to Qdrant.
    """
    # Use a try-except block to ensure DB operations aren't blocked by Qdrant issues
    try:
        sync_product_text(instance)
        # Visual sync involves image download and embedding, so it stays reasonably fast 
        # but could be moved to a background task in a production app.
        sync_product_visual(instance)
    except Exception as e:
        print(f"Error in product_post_save signal: {e}")

@receiver(post_delete, sender=Product)
def product_post_delete(sender, instance, **kwargs):
    """
    Triggered whenever a product is deleted.
    Removes the corresponding vectors from Qdrant.
    """
    try:
        delete_product_from_qdrant(instance.id)
    except Exception as e:
        print(f"Error in product_post_delete signal: {e}")
