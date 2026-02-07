/**
 * Voice I/O Agent
 * Handles speech recognition (STT) and text-to-speech (TTS)
 * This is the ONLY component that touches Web Speech API
 */
class VoiceIO {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.onTranscriptCallback = null;
        this.onErrorCallback = null;
    }

    /**
     * Initialize speech recognition
     * @param {Function} onTranscript - Callback for transcripts
     * @param {Function} onError - Callback for errors
     */
    initialize(onTranscript, onError) {
        if (!('webkitSpeechRecognition' in window)) {
            const error = new Error('Speech recognition not supported in this browser');
            if (onError) onError(error);
            return false;
        }

        this.onTranscriptCallback = onTranscript;
        this.onErrorCallback = onError;

        this.recognition = new window.webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            console.log('[VoiceIO] Transcript:', transcript);
            if (this.onTranscriptCallback) {
                this.onTranscriptCallback(transcript.trim());
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceIO] Recognition error:', event.error);
            if (event.error === 'no-speech') {
                // Restart listening
                this.startListening();
            } else if (this.onErrorCallback) {
                this.onErrorCallback(new Error(event.error));
            }
        };

        this.recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (this.isListening) {
                console.log('[VoiceIO] Recognition ended, restarting...');
                this.recognition.start();
            }
        };

        return true;
    }

    /**
     * Start listening
     */
    startListening() {
        if (!this.recognition) {
            console.error('[VoiceIO] Recognition not initialized');
            return false;
        }

        if (this.isListening) {
            console.warn('[VoiceIO] Already listening');
            return true;
        }

        try {
            this.recognition.start();
            this.isListening = true;
            console.log('[VoiceIO] Started listening');
            return true;
        } catch (error) {
            console.error('[VoiceIO] Failed to start listening:', error);
            return false;
        }
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.recognition || !this.isListening) {
            return;
        }

        this.isListening = false;
        this.recognition.stop();
        console.log('[VoiceIO] Stopped listening');
    }

    /**
     * Speak text
     * @param {string} text - Text to speak
     * @param {Object} options - Speech options {rate, pitch, volume}
     * @returns {Promise<void>}
     */
    speak(text, options = {}) {
        return new Promise((resolve) => {
            if (!text) {
                resolve();
                return;
            }

            // Cancel any ongoing speech
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = options.rate || 1.0;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;
            utterance.lang = 'en-US';

            utterance.onend = () => {
                console.log('[VoiceIO] Finished speaking:', text);
                resolve();
            };

            utterance.onerror = (error) => {
                console.error('[VoiceIO] Speech error:', error);
                resolve();
            };

            console.log('[VoiceIO] Speaking:', text);
            this.synthesis.speak(utterance);
        });
    }

    /**
     * Ask for clarification
     * @param {string} message - Clarification message
     */
    async askForClarification(message) {
        await this.speak(message || "I didn't catch that. Can you please repeat?");
    }

    /**
     * Get listening status
     */
    getIsListening() {
        return this.isListening;
    }

    /**
     * Destroy and cleanup
     */
    destroy() {
        this.stopListening();
        this.synthesis.cancel();
        this.recognition = null;
    }
}

export default VoiceIO;
