/**
 * Frontend Tools - Tools natifs du frontend
 * 
 * Définit tous les tools disponibles côté frontend React.
 * Ces tools sont enregistrés dans le ToolRegistry au démarrage.
 */

/**
 * Crée les tools frontend avec les dépendances React
 * @param {Object} deps - Dépendances (navigate, useAuth, useCart, useA11y, etc.)
 */
export function createFrontendTools(deps) {
    const {
        navigate,
        user,
        login,
        logout,
        register,
        cart,
        addToCart,
        checkout,
        setHighContrast,
        setFontSize,
        setSimplifiedMode,
        speak
    } = deps;

    return [
        // ==================== NAVIGATION TOOLS ====================
        {
            id: 'navigate_home',
            name: 'Navigate to Home',
            description: 'Navigate to the home page',
            source: 'frontend',
            execute: async () => {
                console.log('[TOOL] 🔧 Executing navigate_home...');
                console.log('[TOOL] navigate function:', typeof navigate);
                navigate('/');
                speak('Navigating to home page');
                return { success: true, message: 'Navigated to home', spokenAlready: true };
            }
        },
        {
            id: 'navigate_cart',
            name: 'Navigate to Cart',
            description: 'Navigate to the shopping cart page',
            source: 'frontend',
            execute: async () => {
                navigate('/cart');
                speak('Opening your shopping cart');
                return { success: true, message: 'Navigated to cart' };
            }
        },
        {
            id: 'navigate_banking',
            name: 'Navigate to Banking',
            description: 'Navigate to the banking page',
            source: 'frontend',
            execute: async () => {
                navigate('/banking');
                speak('Opening banking page');
                return { success: true, message: 'Navigated to banking' };
            }
        },
        {
            id: 'navigate_profile',
            name: 'Navigate to Profile',
            description: 'Navigate to the user profile page',
            source: 'frontend',
            execute: async () => {
                navigate('/profile');
                speak('Opening your profile');
                return { success: true, message: 'Navigated to profile' };
            }
        },
        {
            id: 'navigate_login',
            name: 'Navigate to Login',
            description: 'Navigate to the login page',
            source: 'frontend',
            execute: async () => {
                navigate('/login');
                speak('Opening login page');
                return { success: true, message: 'Navigated to login' };
            }
        },
        {
            id: 'navigate_results',
            name: 'Navigate to Products',
            description: 'Navigate to the products/results page, show all products',
            source: 'frontend',
            execute: async () => {
                console.log('[TOOL] 🔧 Executing navigate_results...');
                console.log('[TOOL] navigate function:', typeof navigate);
                console.log('[TOOL] speak function:', typeof speak);

                try {
                    navigate('/results');
                    console.log('[TOOL] ✅ Navigation called to /results');
                    speak('Showing all products');
                    console.log('[TOOL] ✅ Speak called');
                    return { success: true, message: 'Navigated to products', spokenAlready: true };
                } catch (error) {
                    console.error('[TOOL] ❌ Error in navigate_results:', error);
                    return { success: false, message: 'Navigation failed', error: error.message };
                }
            }
        },

        // ==================== SEARCH TOOLS ====================
        {
            id: 'search_products',
            name: 'Search Products',
            description: 'Search for products by query',
            source: 'frontend',
            execute: async (params) => {
                const query = params.query || params.value || '';
                if (!query) {
                    speak('Please specify what you want to search for');
                    return { success: false, message: 'No search query provided' };
                }
                navigate(`/results?q=${encodeURIComponent(query)}`);
                speak(`Searching for ${query}`);
                return { success: true, message: `Searching for: ${query}` };
            }
        },

        // ==================== CART TOOLS ====================
        {
            id: 'view_cart',
            name: 'View Cart',
            description: 'View the shopping cart',
            source: 'frontend',
            execute: async () => {
                navigate('/cart');
                const itemCount = cart?.items?.length || 0;
                speak(`You have ${itemCount} items in your cart`);
                return { success: true, message: 'Viewing cart' };
            }
        },
        {
            id: 'add_to_cart',
            name: 'Add to Cart',
            description: 'Add current product to cart',
            source: 'frontend',
            execute: async (params) => {
                const productId = params.productId || params.value;
                if (!productId) {
                    speak('Please select a product first');
                    return { success: false, message: 'No product selected' };
                }
                const success = await addToCart(productId);
                if (success) {
                    speak('Product added to cart');
                    return { success: true, message: 'Added to cart' };
                } else {
                    speak('Failed to add product to cart');
                    return { success: false, message: 'Failed to add to cart' };
                }
            }
        },
        {
            id: 'checkout_cart',
            name: 'Checkout Cart',
            description: 'Proceed to checkout',
            source: 'frontend',
            execute: async () => {
                if (!cart?.items?.length) {
                    speak('Your cart is empty');
                    return { success: false, message: 'Cart is empty' };
                }
                const total = cart.total_price || 0;
                speak(`Proceeding to checkout. Total: ${total} dinars`);
                // Note: La confirmation sera gérée par l'agent
                return { success: true, message: 'Ready for checkout', requiresConfirmation: true, total };
            }
        },

        // ==================== ACCESSIBILITY TOOLS ====================
        {
            id: 'toggle_high_contrast',
            name: 'Toggle High Contrast',
            description: 'Enable or disable high contrast mode',
            source: 'frontend',
            execute: async (params) => {
                const enabled = params.value !== false;
                setHighContrast(enabled);
                speak(enabled ? 'High contrast mode enabled' : 'High contrast mode disabled');
                return { success: true, message: `High contrast ${enabled ? 'enabled' : 'disabled'}` };
            }
        },
        {
            id: 'change_font_size',
            name: 'Change Font Size',
            description: 'Change the font size (percentage)',
            source: 'frontend',
            execute: async (params) => {
                const size = parseInt(params.value) || 100;
                setFontSize(size);
                speak(`Font size set to ${size} percent`);
                return { success: true, message: `Font size: ${size}%` };
            }
        },
        {
            id: 'toggle_simplified_mode',
            name: 'Toggle Simplified Mode',
            description: 'Enable or disable simplified interface mode',
            source: 'frontend',
            execute: async (params) => {
                const enabled = params.value !== false;
                setSimplifiedMode(enabled);
                speak(enabled ? 'Simplified mode enabled' : 'Simplified mode disabled');
                return { success: true, message: `Simplified mode ${enabled ? 'enabled' : 'disabled'}` };
            }
        },

        // ==================== AUTH TOOLS ====================
        {
            id: 'logout_user',
            name: 'Logout User',
            description: 'Log out the current user',
            source: 'frontend',
            execute: async () => {
                await logout();
                navigate('/login');
                speak('You have been logged out');
                return { success: true, message: 'Logged out' };
            }
        },

        // ==================== INFO TOOLS ====================
        {
            id: 'get_user_info',
            name: 'Get User Info',
            description: 'Get information about the current user',
            source: 'frontend',
            execute: async () => {
                if (!user) {
                    speak('You are not logged in');
                    return { success: false, message: 'Not logged in' };
                }
                speak(`You are logged in as ${user.first_name || user.email}`);
                return { success: true, message: 'User info retrieved', data: user };
            }
        },
        {
            id: 'get_cart_status',
            name: 'Get Cart Status',
            description: 'Get information about the cart',
            source: 'frontend',
            execute: async () => {
                const itemCount = cart?.items?.length || 0;
                const total = cart?.total_price || 0;
                speak(`You have ${itemCount} items in your cart, total: ${total} dinars`);
                return { success: true, message: 'Cart status retrieved', data: { itemCount, total } };
            }
        }
    ];
}
