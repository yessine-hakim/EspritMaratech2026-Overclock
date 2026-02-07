import api from '../api';

/**
 * Cart Service
 * Handles all cart-related operations
 * Called by both UI and Voice
 */
class CartService {
    /**
     * Add item to cart
     * @param {number} productId
     * @param {number} quantity
     * @returns {Promise<{success: boolean, cart?: Object, message: string}>}
     */
    async addItem(productId, quantity = 1) {
        try {
            const response = await api.post('/api/cart/add/', {
                product_id: productId,
                quantity
            });

            return {
                success: true,
                cart: response.data,
                message: `Added ${quantity} item(s) to your cart. Total: ${response.data.total_price} TND`
            };
        } catch (error) {
            console.error('[CartService] Add item error:', error);
            return {
                success: false,
                message: error.response?.data?.error || 'Failed to add item to cart.'
            };
        }
    }

    /**
     * Remove item from cart
     * @param {number} itemId - Cart item ID
     * @returns {Promise<{success: boolean, cart?: Object, message: string}>}
     */
    async removeItem(itemId) {
        try {
            const response = await api.post('/api/cart/remove/', {
                item_id: itemId
            });

            return {
                success: true,
                cart: response.data,
                message: `Item removed from cart. Total: ${response.data.total_price} TND`
            };
        } catch (error) {
            console.error('[CartService] Remove item error:', error);
            return {
                success: false,
                message: 'Failed to remove item from cart.'
            };
        }
    }

    /**
     * Update item quantity
     * @param {number} itemId
     * @param {number} quantity
     * @returns {Promise<{success: boolean, cart?: Object, message: string}>}
     */
    async updateQuantity(itemId, quantity) {
        try {
            const response = await api.post('/api/cart/update/', {
                item_id: itemId,
                quantity
            });

            return {
                success: true,
                cart: response.data,
                message: `Quantity updated. Total: ${response.data.total_price} TND`
            };
        } catch (error) {
            console.error('[CartService] Update quantity error:', error);
            return {
                success: false,
                message: 'Failed to update quantity.'
            };
        }
    }

    /**
     * Get current cart
     * @returns {Promise<{success: boolean, cart?: Object, message: string}>}
     */
    async getCart() {
        try {
            const response = await api.get('/api/cart/');

            const itemCount = response.data.items?.length || 0;
            const total = response.data.total_price || 0;

            return {
                success: true,
                cart: response.data,
                message: itemCount > 0
                    ? `You have ${itemCount} item(s) in your cart. Total: ${total} TND`
                    : 'Your cart is empty.'
            };
        } catch (error) {
            console.error('[CartService] Get cart error:', error);
            return {
                success: false,
                message: 'Failed to retrieve cart.'
            };
        }
    }

    /**
     * Clear cart
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async clearCart() {
        try {
            await api.post('/api/cart/clear/');

            return {
                success: true,
                message: 'Cart cleared successfully.'
            };
        } catch (error) {
            console.error('[CartService] Clear cart error:', error);
            return {
                success: false,
                message: 'Failed to clear cart.'
            };
        }
    }

    /**
     * Checkout
     * @param {Object} paymentDetails - {payment_method, address?, etc.}
     * @returns {Promise<{success: boolean, order?: Object, message: string}>}
     */
    async checkout(paymentDetails = {}) {
        try {
            const response = await api.post('/api/cart/checkout/', paymentDetails);

            return {
                success: true,
                order: response.data,
                message: `Order placed successfully! Order ID: ${response.data.id}`
            };
        } catch (error) {
            console.error('[CartService] Checkout error:', error);
            return {
                success: false,
                message: error.response?.data?.error || 'Checkout failed. Please try again.'
            };
        }
    }
}

export default new CartService();
