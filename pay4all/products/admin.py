from django.contrib import admin
from .models import Category, Product, Review

# Register your models here.
@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('productname', 'userusername', 'comment')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('title', 'id', 'category', 'price', 'rating', 'created_at')
    list_filter = ('category', 'created_at')
    search_fields = ('title', 'name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'name', 'category', 'price', 'rating', 'nbr_rating')
        }),
        ('Description & Images', {
            'fields': ('description', 'image',)
        }),
        ('Legacy Fields', {
            'fields': ('about_product',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
