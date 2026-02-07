import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMicrophone } from 'react-icons/fa';
import api from '../api';
import VoiceIO from '../voice/VoiceIO';
import ConversationState from '../voice/ConversationState';
import ConfirmationHandler from '../voice/ConfirmationHandler';
import ActionExecutor from '../voice/ActionExecutor';

/**
 * Unified Voice Controller
 * Orchestrates all 5 voice agents
 * Replaces: GlobalVoiceCommander, VoiceAgentProvider, agentVocal
 */
const VoiceController = () => {
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const [error, setError] = useState(null);

    const navigate = useNavigate();

    // Agent instances (created once)
    const voiceIORef = useRef(null);
    const conversationStateRef = useRef(null);
    const confirmationHandlerRef = useRef(null);
    const actionExecutorRef = useRef(null);

    useEffect(() => {
        // Initialize agents
        const voiceIO = new VoiceIO();
        const conversationState = new ConversationState();
        const confirmationHandler = new ConfirmationHandler(voiceIO, conversationState);
        const actionExecutor = new ActionExecutor(
            voiceIO,
            conversationState,
            confirmationHandler,
            navigate
        );

        voiceIORef.current = voiceIO;
        conversationStateRef.current = conversationState;
        confirmationHandlerRef.current = confirmationHandler;
        actionExecutorRef.current = actionExecutor;

        // Initialize voice I/O
        const initialized = voiceIO.initialize(
            (transcript) => handleVoiceInput(transcript),
            (err) => {
                console.error('[VoiceController] Voice error:', err);
                setError(err.message);
            }
        );

        // AUTO-START voice for accessibility (after small delay)
        if (initialized) {
            setTimeout(() => {
                const started = voiceIO.startListening();
                if (started) {
                    setIsListening(true);
                    // Welcome message
                    voiceIO.speak("Voice assistant ready. Say help for available commands, or start speaking your request.");
                } else {
                    console.warn('[VoiceController] Failed to auto-start voice');
                }
            }, 1000); // 1 second delay to ensure full initialization
        }

        // Cleanup on unmount
        return () => {
            if (voiceIO) {
                voiceIO.destroy();
            }
        };
    }, [navigate]);

    /**
     * Handle voice input (core processing logic)
     */
    const handleVoiceInput = async (transcript) => {
        console.log('[VoiceController] Voice input:', transcript);
        setLastCommand(transcript);
        setIsProcessing(true);
        setError(null); // Clear previous errors

        const voiceIO = voiceIORef.current;
        const conversationState = conversationStateRef.current;
        const confirmationHandler = confirmationHandlerRef.current;
        const actionExecutor = actionExecutorRef.current;

        try {
            // Add to conversation history
            conversationState.addToHistory({
                role: 'user',
                content: transcript
            });

            // Check if awaiting confirmation
            if (conversationState.isAwaitingConfirmation()) {
                const followUp = conversationState.handleFollowUp(transcript);

                if (followUp) {
                    if (followUp.type === 'confirm' || followUp.type === 'cancel') {
                        confirmationHandler.handleConfirmation(followUp);
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            // Parse intent via backend
            console.log('[VoiceController] Sending to backend:', transcript);
            const intentResponse = await api.post('/api/recommendations/voice-intent/', {
                transcript
            });

            const intent = intentResponse.data;
            console.log('[VoiceController] Intent parsed:', intent);

            // Execute action and wait for completion
            console.log('[VoiceController] Executing action...');
            const result = await actionExecutor.execute(intent);
            console.log('[VoiceController] Action result:', result);

            // ALWAYS provide vocal feedback
            let responseText = intent.response || result.message || 'Done.';

            // Enhanced feedback for navigation
            if (intent.action === 'navigate' && result.success) {
                responseText = `Navigating to ${intent.target} page.`;
            }

            // Speak the response
            console.log('[VoiceController] Speaking response:', responseText);
            await voiceIO.speak(responseText);

            // Add to conversation history
            conversationState.addToHistory({
                role: 'assistant',
                content: responseText
            });

        } catch (error) {
            console.error('[VoiceController] Processing error:', error);

            // Comprehensive error messaging
            let errorMessage = 'Sorry, I encountered an error.';

            if (error.response?.data?.response) {
                errorMessage = error.response.data.response;
            } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }

            console.error('[VoiceController] Error message:', errorMessage);

            // ALWAYS speak errors
            await voiceIORef.current.speak(errorMessage);
            setError(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Toggle listening
     */
    const toggleListening = () => {
        const voiceIO = voiceIORef.current;

        if (!voiceIO) {
            console.error('[VoiceController] VoiceIO not initialized');
            return;
        }

        if (isListening) {
            voiceIO.stopListening();
            setIsListening(false);
        } else {
            const started = voiceIO.startListening();
            if (started) {
                setIsListening(true);
                setError(null);
            } else {
                setError('Failed to start voice recognition');
            }
        }
    };

    return (
        <div className="fixed top-24 left-6 z-[60] flex flex-col items-center gap-2">
            {/* Voice button */}
            <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`p-5 rounded-full shadow-2xl transition-all border-4 flex items-center justify-center cursor-pointer hover:scale-110 ${isListening
                    ? 'bg-accent border-accent/20 text-white animate-pulse'
                    : 'bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400'
                    }`}
                title={isListening ? 'Voice assistant listening' : 'Click to start voice assistant'}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
                {isProcessing ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <FaMicrophone className="h-7 w-7" />
                )}
            </button>

            {/* Status badge */}
            <div className="flex flex-col items-center text-center">
                <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full ${isListening ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                >
                    {isProcessing ? 'PROCESSING' : isListening ? 'LISTENING' : 'CLICK TO TALK'}
                </span>
            </div>

            {/* Last command */}
            {lastCommand && (
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl mt-2 border-2 border-accent/10 max-w-[200px]">
                    <p className="text-xs font-bold text-primary italic truncate">
                        "{lastCommand}"
                    </p>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-100 border-2 border-red-300 px-4 py-2 rounded-2xl shadow-xl mt-2 max-w-[200px]">
                    <p className="text-xs font-bold text-red-600">{error}</p>
                </div>
            )}
        </div>
    );
};

export default VoiceController;
