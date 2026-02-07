/**
 * Confirmation Handler
 * Handles confirmations for sensitive actions (payments, transfers)
 */
class ConfirmationHandler {
    constructor(voiceIO, conversationState) {
        this.voiceIO = voiceIO;
        this.conversationState = conversationState;
    }

    /**
     * Request confirmation for an action
     * @param {Object} action - Action requiring confirmation
     * @param {string} details - Human-readable details
     * @returns {Promise<boolean>} - User confirmed or not
     */
    async requestConfirmation(action, details) {
        // Set pending action
        this.conversationState.setPendingAction({
            ...action,
            requiresConfirmation: true,
            details
        });

        // Ask user
        await this.voiceIO.speak(
            `${details}. Please say yes to confirm, or no to cancel.`
        );

        return new Promise((resolve) => {
            // Store resolver for later use
            this._confirmationResolver = resolve;
        });
    }

    /**
     * Handle confirmation response
     * @param {Object} followUp - {type: 'confirm'|'cancel', value}
     */
    handleConfirmation(followUp) {
        if (!this._confirmationResolver) {
            console.warn('[ConfirmationHandler] No pending confirmation');
            return;
        }

        const confirmed = followUp.type === 'confirm' && followUp.value === true;

        this._confirmationResolver(confirmed);
        this._confirmationResolver = null;

        this.conversationState.clearPendingAction();
    }

    /**
     * Handle cancellation
     */
    async handleCancel() {
        if (this._confirmationResolver) {
            this._confirmationResolver(false);
            this._confirmationResolver = null;
        }

        this.conversationState.clearPendingAction();
        await this.voiceIO.speak('Action cancelled.');
    }

    /**
     * Check if action requires confirmation
     * @param {string} actionType - Type of action
     * @returns {boolean}
     */
    requiresConfirmation(actionType) {
        const sensitiveActions = [
            'checkout',
            'banking.transfer',
            'cart.clear',
            'auth.logout'
        ];

        return sensitiveActions.includes(actionType);
    }
}

export default ConfirmationHandler;
