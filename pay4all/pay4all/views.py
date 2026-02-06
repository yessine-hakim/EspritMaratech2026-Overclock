from django.shortcuts import render
from products.models import Category, Product

def home(request):
    categories = Category.objects.all()
    # Fetch 4 products with the most ratings to display as "Trending"
    trending_products = Product.objects.order_by('-nbr_rating')[:4]
    
    context = {
        'categories': categories,
        'trending_products': trending_products,
    }
    return render(request, 'home.html', context)


