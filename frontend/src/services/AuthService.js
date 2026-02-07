import api from '../api';

/**
 * Authentication Service
 * Handles all auth-related operations
 * Called by both UI and Voice
 */
class AuthService {
    /**
     * Login user
     * @param {Object} credentials - {email, password} or {username, password}
     * @returns {Promise<{success: boolean, user?: Object, token?: string, message: string}>}
     */
    async login(credentials) {
        try {
            const response = await api.post('/api/users/login/', credentials);

            if (response.data.access) {
                localStorage.setItem('access_token', response.data.access);
                localStorage.setItem('refresh_token', response.data.refresh);

                return {
                    success: true,
                    user: response.data.user,
                    token: response.data.access,
                    message: `Welcome back, ${response.data.user?.username || 'user'}!`
                };
            }

            return {
                success: false,
                message: 'Login failed. Please check your credentials.'
            };
        } catch (error) {
            console.error('[AuthService] Login error:', error);
            return {
                success: false,
                message: error.response?.data?.detail || 'Login failed. Please try again.'
            };
        }
    }

    /**
     * Register new user
     * @param {Object} userData - {username, email, password, monthly_budget?, payment_preferences?}
     * @returns {Promise<{success: boolean, user?: Object, message: string}>}
     */
    async register(userData) {
        try {
            const response = await api.post('/api/users/register/', userData);

            if (response.data.user) {
                return {
                    success: true,
                    user: response.data.user,
                    message: `Account created successfully! Welcome, ${userData.username}!`
                };
            }

            return {
                success: false,
                message: 'Registration failed. Please try again.'
            };
        } catch (error) {
            console.error('[AuthService] Register error:', error);
            const errorMsg = error.response?.data?.username?.[0]
                || error.response?.data?.email?.[0]
                || error.response?.data?.detail
                || 'Registration failed. Please try again.';

            return {
                success: false,
                message: errorMsg
            };
        }
    }

    /**
     * Logout user
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async logout() {
        try {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');

            return {
                success: true,
                message: 'You have been logged out successfully.'
            };
        } catch (error) {
            console.error('[AuthService] Logout error:', error);
            return {
                success: false,
                message: 'Logout failed.'
            };
        }
    }

    /**
     * Get current user
     * @returns {Promise<{success: boolean, user?: Object, message: string}>}
     */
    async getCurrentUser() {
        try {
            const response = await api.get('/api/users/me/');

            return {
                success: true,
                user: response.data,
                message: 'User retrieved successfully.'
            };
        } catch (error) {
            console.error('[AuthService] Get current user error:', error);
            return {
                success: false,
                message: 'Failed to retrieve user information.'
            };
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!localStorage.getItem('access_token');
    }
}

export default new AuthService();
