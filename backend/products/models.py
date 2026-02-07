from django.db import models

# Create your models here.

class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    
    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']
    
    def __str__(self):
        return self.name


class Product(models.Model):
    # JSON fields
    title = models.CharField(max_length=500)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    price = models.CharField(max_length=200, blank=True, null=True, help_text="Price from JSON")
    rating = models.CharField(max_length=50, blank=True, null=True, help_text="Rating from JSON")
    nbr_rating = models.CharField(max_length=100, blank=True, null=True, help_text="Number of ratings from JSON")
    description = models.TextField(blank=True, null=True)
    image = models.URLField(max_length=500, blank=True, null=True, help_text="Main image URL from JSON")
    image_urls = models.TextField(blank=True, null=True, help_text="Pipe-separated image URLs")
    barcode = models.CharField(max_length=100, blank=True, null=True, help_text="Barcode from JSON")
    
    # Legacy fields (kept for backward compatibility)
    name = models.CharField(max_length=500, blank=True, help_text="Alias for title, kept for compatibility")
    about_product = models.TextField(blank=True)    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title or self.name
    
    def save(self, *args, **kwargs):
        # Keep name in sync with title for backward compatibility
        if self.title and not self.name:
            self.name = self.title
        if not self.title and self.name:
            self.title = self.name
        super().save(*args, **kwargs)
    
    def get_images(self):
        """Return list of image URLs"""
        images = []
        if self.image:
            images.append(self.image)
        if self.image_urls:
            images.extend([url.strip() for url in self.image_urls.split('|') if url.strip()])
        return images
    
    def get_first_image(self):
        """Return the first image URL"""
        if self.image:
            return self.image
        images = self.get_images()
        return images[0] if images else None

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    rating = models.IntegerField(choices=[(i, i) for i in range(6)]) # 0 to 5 stars
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def str(self):
        return f"{self.user.username} - {self.product.name} ({self.rating})"   
