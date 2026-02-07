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
        this.minConfidence = 0.5; // Confidence threshold (0.0 - 1.0)
        this.minTranscriptLength = 2; // Minimum characters
        this.wakeWord = 'assistant'; // Wake word for activation
        this.wakeWords = ['assistant', 'hey assistant', 'ok assistant']; // Alternative wake words
    }

    /**
     * Detect wake word in transcript and extract command
     * @param {string} transcript - The full transcript
     * @returns {Object} - {detected: boolean, command: string|null}
     */
    detectWakeWord(transcript) {
        const lower = transcript.toLowerCase().trim();

        // Check each wake word variant
        for (const wakeWord of this.wakeWords) {
            const index = lower.indexOf(wakeWord);
            if (index !== -1) {
                // Extract command after wake word
                const commandStart = index + wakeWord.length;
                const command = transcript.substring(commandStart).trim();

                // Remove common filler words at start
                const cleanCommand = command
                    .replace(/^(,|please|could you|can you|i want to|i want|i'd like to|i'd like)\s*/i, '')
                    .trim();

                console.log('[VoiceIO] Wake word detected:', wakeWord);
                console.log('[VoiceIO] Extracted command:', cleanCommand);

                return {
                    detected: true,
                    command: cleanCommand || null,
                    wakeWord: wakeWord
                };
            }
        }

        return { detected: false, command: null, wakeWord: null };
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
        this.recognition.interimResults = true; // Enable partial results for better UX
        this.recognition.maxAlternatives = 3; // Get multiple interpretations
        this.recognition.lang = 'en-US';

        this.recognition.onresult = (event) => {
            const result = event.results[event.results.length - 1];

            // Only process final results (ignore interim)
            if (!result.isFinal) {
                return;
            }

            const transcript = result[0].transcript;
            const confidence = result[0].confidence;

            console.log('[VoiceIO] Raw transcript:', transcript, 'Confidence:', confidence);

            // CRITICAL: Validate transcript before processing
            const cleaned = transcript.trim();

            // Filter out empty or too-short transcripts
            if (!cleaned || cleaned.length < this.minTranscriptLength) {
                console.warn('[VoiceIO] Transcript too short, ignoring:', transcript);
                return;
            }

            // Check confidence threshold
            if (confidence < this.minConfidence) {
                console.warn('[VoiceIO] Low confidence:', confidence, 'for:', cleaned);
                this.askForClarification("I'm not sure I heard that correctly. Please repeat.");
                return;
            }

            // Valid transcript - send to callback
            console.log('[VoiceIO] Valid transcript:', cleaned, 'Confidence:', confidence);
            if (this.onTranscriptCallback) {
                this.onTranscriptCallback(cleaned);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('[VoiceIO] Recognition error:', event.error);

            // Handle different error types with appropriate recovery
            switch (event.error) {
                case 'no-speech':
                    // Silent error - just restart listening
                    console.log('[VoiceIO] No speech detected, continuing to listen...');
                    if (this.isListening) {
                        setTimeout(() => {
                            try {
                                this.recognition.start();
                            } catch (e) {
                                // Already started, ignore
                            }
                        }, 100);
                    }
                    break;

                case 'audio-capture':
                    this.speak("I can't access your microphone. Please check your browser permissions.");
                    if (this.onErrorCallback) {
                        this.onErrorCallback(new Error('Microphone access denied'));
                    }
                    this.isListening = false;
                    break;

                case 'network':
                    this.speak("Network error. Retrying in a moment...");
                    if (this.isListening) {
                        setTimeout(() => this.startListening(), 1000);
                    }
                    break;

                case 'not-allowed':
                case 'service-not-allowed':
                    this.speak("Microphone permission denied. Please enable it in your browser settings.");
                    if (this.onErrorCallback) {
                        this.onErrorCallback(new Error('Permission denied'));
                    }
                    this.isListening = false;
                    break;

                case 'aborted':
                    // User stopped - don't restart
                    console.log('[VoiceIO] Recognition aborted');
                    break;

                default:
                    console.error('[VoiceIO] Unhandled error:', event.error);
                    if (this.onErrorCallback) {
                        this.onErrorCallback(new Error(event.error));
                    }
            }
        };

        this.recognition.onend = () => {
            // Auto-restart if still supposed to be listening
            if (this.isListening) {
                console.log('[VoiceIO] Recognition ended, restarting...');
                try {
                    this.recognition.start();
                } catch (error) {
                    // Already started or other error
                    console.warn('[VoiceIO] Could not restart:', error.message);
                }
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
            // If already started, mark as listening anyway
            if (error.message.includes('already started')) {
                this.isListening = true;
                return true;
            }
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
        try {
            this.recognition.stop();
            console.log('[VoiceIO] Stopped listening');
        } catch (error) {
            console.warn('[VoiceIO] Error stopping:', error);
        }
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
     * Set confidence threshold
     * @param {number} threshold - Confidence threshold (0.0 - 1.0)
     */
    setConfidenceThreshold(threshold) {
        this.minConfidence = Math.max(0, Math.min(1, threshold));
        console.log('[VoiceIO] Confidence threshold set to:', this.minConfidence);
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
