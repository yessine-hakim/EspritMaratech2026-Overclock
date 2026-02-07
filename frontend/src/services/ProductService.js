import api from '../api';

/**
 * Product Service
 * Handles all product-related operations
 * Called by both UI and Voice
 */
class ProductService {
    /**
     * Search products
     * @param {string} query - Search query
     * @param {Object} filters - Optional filters {category?, price_max?, etc.}
     * @returns {Promise<{success: boolean, products?: Array, message: string}>}
     */
    async search(query, filters = {}) {
        try {
            const params = new URLSearchParams({
                q: query,
                ...filters
            });

            const response = await api.get(`/api/products/search/?${params}`);

            const count = response.data.length || 0;

            return {
                success: true,
                products: response.data,
                message: count > 0
                    ? `Found ${count} product(s) matching "${query}".`
                    : `No products found matching "${query}".`
            };
        } catch (error) {
            console.error('[ProductService] Search error:', error);
            return {
                success: false,
                message: 'Search failed. Please try again.'
            };
        }
    }

    /**
     * Get product details
     * @param {number} productId
     * @returns {Promise<{success: boolean, product?: Object, message: string}>}
     */
    async getProduct(productId) {
        try {
            const response = await api.get(`/api/products/${productId}/`);

            const product = response.data;

            return {
                success: true,
                product,
                message: `${product.name}. Price: ${product.price} TND. ${product.description || ''}`
            };
        } catch (error) {
            console.error('[ProductService] Get product error:', error);
            return {
                success: false,
                message: 'Failed to retrieve product details.'
            };
        }
    }

    /**
     * Get product recommendations
     * @param {Object} params - {query?, user_id?, image?, budget?}
     * @returns {Promise<{success: boolean, recommendations?: Array, explanation?: string, message: string}>}
     */
    async getRecommendations(params) {
        try {
            const response = await api.post('/api/recommendations/ask/', params);

            const recommendations = response.data.recommendations || [];
            const explanation = response.data.explanation || '';

            return {
                success: true,
                recommendations,
                explanation,
                message: explanation || `Here are ${recommendations.length} recommendations for you.`
            };
        } catch (error) {
            console.error('[ProductService] Get recommendations error:', error);
            return {
                success: false,
                message: 'Failed to get recommendations.'
            };
        }
    }

    /**
     * Browse products by category
     * @param {string} category
     * @param {number} limit
     * @returns {Promise<{success: boolean, products?: Array, message: string}>}
     */
    async browseByCategory(category, limit = 20) {
        try {
            const response = await api.get(`/api/products/?category=${category}&limit=${limit}`);

            const count = response.data.length || 0;

            return {
                success: true,
                products: response.data,
                message: `Found ${count} product(s) in ${category}.`
            };
        } catch (error) {
            console.error('[ProductService] Browse by category error:', error);
            return {
                success: false,
                message: 'Failed to browse products.'
            };
        }
    }
}

export default new ProductService();
