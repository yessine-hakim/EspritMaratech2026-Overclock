import AuthService from '../services/AuthService';
import CartService from '../services/CartService';
import BankingService from '../services/BankingService';
import ProductService from '../services/ProductService';

/**
 * Action Executor
 * Maps intents to service calls
 * This is the SINGLE ACTION LAYER for both UI and Voice
 */
class ActionExecutor {
    constructor(voiceIO, conversationState, confirmationHandler, navigate) {
        this.voiceIO = voiceIO;
        this.conversationState = conversationState;
        this.confirmationHandler = confirmationHandler;
        this.navigate = navigate;
    }

    /**
     * Execute an intent
     * @param {Object} intent - {action, target, params, value}
     * @returns {Promise<Object>} - {success, message, data}
     */
    async execute(intent) {
        console.log('[ActionExecutor] Executing intent:', intent);

        const { action, target, params = {}, value } = intent;

        try {
            // Route to appropriate service
            switch (action) {
                case 'auth':
                    return await this.handleAuth(target, params);

                case 'navigate':
                    return await this.handleNavigate(target);

                case 'search':
                    return await this.handleSearch(target, params);

                case 'cart':
                    return await this.handleCart(target, params);

                case 'banking':
                    return await this.handleBanking(target, params);

                case 'status_check':
                    return await this.handleStatusCheck(target, params);

                case 'help':
                    return await this.handleHelp(target);

                case 'confirm':
                    return await this.handleConfirm();

                case 'cancel':
                    return await this.handleCancel();

                default:
                    return {
                        success: false,
                        message: `Unknown action: ${action}`
                    };
            }
        } catch (error) {
            console.error('[ActionExecutor] Execution error:', error);
            return {
                success: false,
                message: 'An error occurred while processing your request.'
            };
        }
    }

    /**
     * Handle authentication actions
     */
    async handleAuth(target, params) {
        switch (target) {
            case 'login':
                return await AuthService.login(params);

            case 'register':
                return await AuthService.register(params);

            case 'logout':
                // Requires confirmation
                if (this.confirmationHandler.requiresConfirmation('auth.logout')) {
                    const confirmed = await this.confirmationHandler.requestConfirmation(
                        { action: 'auth', target: 'logout' },
                        'Are you sure you want to log out?'
                    );
                    if (!confirmed) {
                        return { success: false, message: 'Logout cancelled.' };
                    }
                }
                return await AuthService.logout();

            default:
                return { success: false, message: `Unknown auth action: ${target}` };
        }
    }

    /**
     * Handle navigation
     */
    async handleNavigate(target) {
        const routes = {
            'home': '/',
            'cart': '/cart',
            'banking': '/banking',
            'profile': '/profile',
            'login': '/login',
            'register': '/register',
            'results': '/results'
        };

        if (routes[target]) {
            this.navigate(routes[target]);
            return {
                success: true,
                message: `Navigating to ${target}.`
            };
        }

        return {
            success: false,
            message: `Unknown page: ${target}`
        };
    }

    /**
     * Handle search
     */
    async handleSearch(query, params) {
        // Extract category and price from query if not in params
        const category = params.category || this.extractCategory(query);
        const maxPrice = params.price_max || this.extractPrice(query);
        const intent = params.intent || 'search';

        console.log('[ActionExecutor] Search params:', { query, category, maxPrice, intent });

        // Build search URL with filters
        const searchParams = new URLSearchParams();

        if (category) {
            searchParams.set('category', category);
        } else if (query) {
            searchParams.set('q', query);
        }

        if (maxPrice) {
            searchParams.set('max_price', maxPrice);
        }

        // Navigate to results page with filters
        const url = `/results?${searchParams.toString()}`;
        console.log('[ActionExecutor] Navigating to:', url);
        this.navigate(url);

        // Store in context for follow-up
        this.conversationState.updateContext({
            lastSearchQuery: query,
            lastCategory: category,
            lastMaxPrice: maxPrice
        });

        // Build response message
        let message = 'Searching for ';
        if (category) {
            message += category;
        } else {
            message += query;
        }
        if (maxPrice) {
            message += ` under ${maxPrice} TND`;
        }

        return {
            success: true,
            message: message,
            data: { category, maxPrice, url }
        };
    }

    /**
     * Extract product category from natural language
     */
    extractCategory(query) {
        const lower = query.toLowerCase();

        // Common product categories
        const categories = {
            'yogurt': ['yogurt', 'yogurts', 'yoghurt', 'yoghurts'],
            'milk': ['milk', 'dairy milk'],
            'cheese': ['cheese', 'cheeses'],
            'bread': ['bread', 'breads', 'baguette'],
            'eggs': ['egg', 'eggs'],
            'butter': ['butter'],
            'cream': ['cream'],
            'juice': ['juice', 'juices'],
            'water': ['water', 'mineral water'],
            'soda': ['soda', 'soft drink', 'pop'],
            'coffee': ['coffee'],
            'tea': ['tea'],
            'snacks': ['snack', 'snacks', 'chips'],
            'fruits': ['fruit', 'fruits', 'apple', 'banana', 'orange'],
            'vegetables': ['vegetable', 'vegetables', 'veggie', 'veggies'],
            'meat': ['meat', 'beef', 'chicken', 'pork'],
            'fish': ['fish', 'seafood'],
            'pasta': ['pasta', 'spaghetti', 'noodles'],
            'rice': ['rice'],
            'cereal': ['cereal', 'cereals']
        };

        // Check each category
        for (const [category, keywords] of Object.entries(categories)) {
            for (const keyword of keywords) {
                if (lower.includes(keyword)) {
                    console.log('[ActionExecutor] Detected category:', category);
                    return category;
                }
            }
        }

        return null;
    }

    /**
     * Extract price constraint from natural language
     */
    extractPrice(query) {
        const lower = query.toLowerCase();

        // Match patterns like "under 50", "less than 100", "below 75"
        const patterns = [
            /under\s+\$?(\d+)/i,
            /less\s+than\s+\$?(\d+)/i,
            /below\s+\$?(\d+)/i,
            /max\s+\$?(\d+)/i,
            /maximum\s+\$?(\d+)/i,
            /cheaper\s+than\s+\$?(\d+)/i,
            /\$?(\d+)\s+or\s+less/i
        ];

        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match) {
                const price = parseInt(match[1]);
                console.log('[ActionExecutor] Detected price constraint:', price);
                return price;
            }
        }

        return null;
    }

    /**
     * Handle cart actions
     */
    async handleCart(target, params) {
        switch (target) {
            case 'add':
                return await CartService.addItem(params.productId, params.quantity || 1);

            case 'remove':
                return await CartService.removeItem(params.itemId);

            case 'view':
                this.navigate('/cart');
                return await CartService.getCart();

            case 'clear':
                // Requires confirmation
                if (this.confirmationHandler.requiresConfirmation('cart.clear')) {
                    const confirmed = await this.confirmationHandler.requestConfirmation(
                        { action: 'cart', target: 'clear' },
                        'Are you sure you want to clear your cart?'
                    );
                    if (!confirmed) {
                        return { success: false, message: 'Cart clear cancelled.' };
                    }
                }
                return await CartService.clearCart();

            case 'checkout':
                // Requires confirmation
                const cartResult = await CartService.getCart();
                if (!cartResult.success) return cartResult;

                const confirmed = await this.confirmationHandler.requestConfirmation(
                    { action: 'cart', target: 'checkout', params },
                    `Your total is ${cartResult.cart.total_price} TND. Confirm checkout?`
                );

                if (!confirmed) {
                    return { success: false, message: 'Checkout cancelled.' };
                }

                return await CartService.checkout(params);

            default:
                return { success: false, message: `Unknown cart action: ${target}` };
        }
    }

    /**
     * Handle banking actions
     */
    async handleBanking(target, params) {
        switch (target) {
            case 'balance':
                return await BankingService.getBalance();

            case 'transactions':
                return await BankingService.getTransactions(params.limit);

            case 'transfer':
                // Requires confirmation
                const confirmed = await this.confirmationHandler.requestConfirmation(
                    { action: 'banking', target: 'transfer', params },
                    `Transfer ${params.amount} TND to ${params.recipient}?`
                );

                if (!confirmed) {
                    return { success: false, message: 'Transfer cancelled.' };
                }

                return await BankingService.transfer(params);

            default:
                return { success: false, message: `Unknown banking action: ${target}` };
        }
    }

    /**
     * Handle status checks
     */
    async handleStatusCheck(target, params) {
        switch (target) {
            case 'affordability':
                return await BankingService.checkAffordability(params.amount);

            case 'budget_status':
                return await BankingService.getBudgetStatus();

            case 'cart_status':
                return await CartService.getCart();

            default:
                return { success: false, message: `Unknown status check: ${target}` };
        }
    }

    /**
     * Handle help requests
     */
    async handleHelp(target) {
        const helpText = `
            Voice commands available: 
            Say search for products to find items. 
            Say add to cart to add products. 
            Say view cart to see your cart. 
            Say checkout to complete your purchase. 
            Say check balance to see your account balance. 
            Say log out to sign out. 
            Say go to home, cart, banking, or profile to navigate. 
            You can also ask me questions about products or your budget.
        `.trim().replace(/\s+/g, ' ');

        await this.voiceIO.speak(helpText);

        return {
            success: true,
            message: helpText
        };
    }

    /**
     * Handle confirmation
     */
    async handleConfirm() {
        const pending = this.conversationState.getPendingAction();

        if (!pending) {
            return {
                success: false,
                message: 'Nothing to confirm.'
            };
        }

        // Execute the pending action
        this.conversationState.clearPendingAction();
        return await this.execute(pending);
    }

    /**
     * Handle cancellation
     */
    async handleCancel() {
        await this.confirmationHandler.handleCancel();
        return {
            success: true,
            message: 'Cancelled.'
        };
    }
}

export default ActionExecutor;
