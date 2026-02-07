from django.core.management.base import BaseCommand
from products.models import Product, Category
from django.db.models import Count

class Command(BaseCommand):
    help = 'Check database statistics for products and categories'

    def handle(self, *args, **kwargs):
        # Count products
        total_products = Product.objects.count()
        self.stdout.write(f"Total Products: {total_products}")

        # Count categories
        total_categories = Category.objects.count()
        self.stdout.write(f"Total Categories: {total_categories}")

        if total_categories > 0:
            self.stdout.write("Categories found:")
            # List categories with product counts
            categories = Category.objects.annotate(product_count=Count('products')).order_by('-product_count')
            for cat in categories:
                self.stdout.write(f" - {cat.name}: {cat.product_count} products")
        else:
            self.stdout.write("No categories found.")
