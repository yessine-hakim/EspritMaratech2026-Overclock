import api from '../api';

/**
 * Banking Service
 * Handles all banking-related operations
 * Called by both UI and Voice
 */
class BankingService {
    /**
     * Get account balance
     * @returns {Promise<{success: boolean, balance?: number, message: string}>}
     */
    async getBalance() {
        try {
            const response = await api.get('/api/banking/balance/');

            const balance = response.data.balance || 0;

            return {
                success: true,
                balance,
                message: `Your current balance is ${balance} TND`
            };
        } catch (error) {
            console.error('[BankingService] Get balance error:', error);
            return {
                success: false,
                message: 'Failed to retrieve balance.'
            };
        }
    }

    /**
     * Get transaction history
     * @param {number} limit - Number of transactions to retrieve
     * @returns {Promise<{success: boolean, transactions?: Array, message: string}>}
     */
    async getTransactions(limit = 10) {
        try {
            const response = await api.get(`/api/banking/transactions/?limit=${limit}`);

            const count = response.data.length || 0;

            return {
                success: true,
                transactions: response.data,
                message: `Retrieved ${count} recent transaction(s).`
            };
        } catch (error) {
            console.error('[BankingService] Get transactions error:', error);
            return {
                success: false,
                message: 'Failed to retrieve transactions.'
            };
        }
    }

    /**
     * Transfer money
     * @param {Object} transferData - {recipient, amount, description?}
     * @returns {Promise<{success: boolean, transaction?: Object, message: string}>}
     */
    async transfer(transferData) {
        try {
            const response = await api.post('/api/banking/transfer/', transferData);

            return {
                success: true,
                transaction: response.data,
                message: `Transfer of ${transferData.amount} TND to ${transferData.recipient} completed successfully.`
            };
        } catch (error) {
            console.error('[BankingService] Transfer error:', error);
            return {
                success: false,
                message: error.response?.data?.error || 'Transfer failed. Please try again.'
            };
        }
    }

    /**
     * Check affordability
     * @param {number} amount - Amount to check
     * @returns {Promise<{success: boolean, canAfford?: boolean, balance?: number, message: string}>}
     */
    async checkAffordability(amount) {
        try {
            const balanceResult = await this.getBalance();

            if (!balanceResult.success) {
                return balanceResult;
            }

            const balance = balanceResult.balance;
            const canAfford = balance >= amount;

            return {
                success: true,
                canAfford,
                balance,
                message: canAfford
                    ? `Yes, you can afford this. Your balance is ${balance} TND and the amount is ${amount} TND.`
                    : `No, you cannot afford this. Your balance is ${balance} TND but you need ${amount} TND. You are short by ${amount - balance} TND.`
            };
        } catch (error) {
            console.error('[BankingService] Check affordability error:', error);
            return {
                success: false,
                message: 'Failed to check affordability.'
            };
        }
    }

    /**
     * Get budget status
     * @returns {Promise<{success: boolean, budget?: Object, message: string}>}
     */
    async getBudgetStatus() {
        try {
            const response = await api.get('/api/banking/budget-status/');

            const { monthly_budget, spent_this_month, remaining } = response.data;

            return {
                success: true,
                budget: response.data,
                message: `Your monthly budget is ${monthly_budget} TND. You have spent ${spent_this_month} TND and have ${remaining} TND remaining.`
            };
        } catch (error) {
            console.error('[BankingService] Get budget status error:', error);
            return {
                success: false,
                message: 'Failed to retrieve budget status.'
            };
        }
    }
}

export default new BankingService();
