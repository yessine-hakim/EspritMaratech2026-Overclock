/**
 * Conversation State Manager
 * Tracks multi-turn conversations and pending actions
 * Shared between UI and voice
 */
class ConversationState {
    constructor() {
        this.pendingAction = null;
        this.conversationHistory = [];
        this.context = {
            lastSearchQuery: null,
            lastProductId: null,
            lastProducts: [],
            awaitingConfirmation: false
        };
    }

    /**
     * Set pending action (requires confirmation)
     * @param {Object} action - {type, params, requiresConfirmation}
     */
    setPendingAction(action) {
        this.pendingAction = action;
        this.context.awaitingConfirmation = action.requiresConfirmation || false;

        // Persist to localStorage for voice-only mode
        localStorage.setItem('voice_pending_action', JSON.stringify(action));

        console.log('[ConversationState] Pending action set:', action);
    }

    /**
     * Get pending action
     */
    getPendingAction() {
        // Try memory first, then localStorage
        if (this.pendingAction) {
            return this.pendingAction;
        }

        const stored = localStorage.getItem('voice_pending_action');
        if (stored) {
            this.pendingAction = JSON.parse(stored);
            return this.pendingAction;
        }

        return null;
    }

    /**
     * Clear pending action
     */
    clearPendingAction() {
        this.pendingAction = null;
        this.context.awaitingConfirmation = false;
        localStorage.removeItem('voice_pending_action');
        console.log('[ConversationState] Pending action cleared');
    }

    /**
     * Handle follow-up input
     * @param {string} transcript - User input
     * @returns {Object|null} - {type: 'confirm'|'cancel'|'clarify', value}
     */
    handleFollowUp(transcript) {
        const lower = transcript.toLowerCase().trim();

        // Confirmation responses
        if (['yes', 'yeah', 'yep', 'sure', 'ok', 'okay', 'confirm', 'proceed'].includes(lower)) {
            return { type: 'confirm', value: true };
        }

        // Cancellation responses
        if (['no', 'nope', 'cancel', 'stop', 'nevermind', 'never mind'].includes(lower)) {
            return { type: 'cancel', value: false };
        }

        // Selection responses
        if (lower.includes('first') || lower.includes('1st') || lower === '1') {
            return { type: 'select', value: 0 };
        }
        if (lower.includes('second') || lower.includes('2nd') || lower === '2') {
            return { type: 'select', value: 1 };
        }
        if (lower.includes('third') || lower.includes('3rd') || lower === '3') {
            return { type: 'select', value: 2 };
        }
        if (lower.includes('last')) {
            return { type: 'select', value: -1 };
        }

        return null;
    }

    /**
     * Update context
     * @param {Object} updates - Context updates
     */
    updateContext(updates) {
        this.context = { ...this.context, ...updates };

        // Persist critical context
        localStorage.setItem('voice_context', JSON.stringify(this.context));
    }

    /**
     * Get context
     */
    getContext() {
        // Try memory first, then localStorage
        const stored = localStorage.getItem('voice_context');
        if (stored) {
            const storedContext = JSON.parse(stored);
            this.context = { ...this.context, ...storedContext };
        }
        return this.context;
    }

    /**
     * Add to conversation history
     * @param {Object} entry - {role: 'user'|'assistant', content, timestamp}
     */
    addToHistory(entry) {
        this.conversationHistory.push({
            ...entry,
            timestamp: entry.timestamp || Date.now()
        });

        // Keep only last 20 entries
        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Check if awaiting confirmation
     */
    isAwaitingConfirmation() {
        return this.context.awaitingConfirmation;
    }

    /**
     * Reset state
     */
    reset() {
        this.pendingAction = null;
        this.conversationHistory = [];
        this.context = {
            lastSearchQuery: null,
            lastProductId: null,
            lastProducts: [],
            awaitingConfirmation: false
        };
        localStorage.removeItem('voice_pending_action');
        localStorage.removeItem('voice_context');
        console.log('[ConversationState] State reset');
    }
}

export default ConversationState;
