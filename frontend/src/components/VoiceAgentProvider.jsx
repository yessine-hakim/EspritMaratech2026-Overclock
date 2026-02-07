/**
 * Voice Agent Provider - Context React pour l'agent vocal agentic
 * 
 * Initialise l'agent au montage et expose son état à toute l'application.
 * L'agent démarre automatiquement l'écoute (pas de bouton).
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useA11y } from '../context/A11yContext';
import { AgentVocal } from '../agent/agentVocal';

const VoiceAgentContext = createContext();

export const useVoiceAgent = () => {
    const context = useContext(VoiceAgentContext);
    if (!context) {
        throw new Error('useVoiceAgent must be used within VoiceAgentProvider');
    }
    return context;
};

export const VoiceAgentProvider = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, login, logout, register } = useAuth();
    const { cart, addToCart, checkout } = useCart();
    const {
        speak,
        setHighContrast,
        setFontSize,
        setSimplifiedMode,
        setReadabilityMode,
        setGrayscale,
        setVisualAlerts,
        setFocusMode
    } = useA11y();

    const agentRef = useRef(null);
    const [agentState, setAgentState] = useState({
        initialized: false,
        listening: false,
        processing: false,
        lastCommand: '',
        lastTool: '',
        lastResult: null,
        error: null
    });

    // Initialiser l'agent au montage
    useEffect(() => {
        console.log('[PROVIDER] 🚀 Initializing Voice Agent Provider...');

        // Préparer les dépendances pour l'agent
        const dependencies = {
            navigate,
            location,
            user,
            login,
            logout,
            register,
            cart,
            addToCart,
            checkout,
            speak,
            setHighContrast,
            setFontSize,
            setSimplifiedMode,
            setReadabilityMode,
            setGrayscale,
            setVisualAlerts,
            setFocusMode
        };

        // Créer l'agent
        const agent = new AgentVocal({
            dependencies,
            onStateChange: (updates) => {
                setAgentState(prev => ({ ...prev, ...updates }));
            },
            onError: (error) => {
                console.error('[PROVIDER] Agent error:', error);
                setAgentState(prev => ({ ...prev, error: error.message }));
            }
        });

        agentRef.current = agent;

        // ✅ Exposer l'agent globalement pour les tools générés
        window.__VOICE_AGENT__ = agent;

        // ✅ CHANGÉ : Ne démarre PAS l'écoute automatiquement
        // L'utilisateur doit cliquer sur le bouton pour démarrer
        agent.initialize().catch(error => {
            console.error('[PROVIDER] Failed to initialize agent:', error);
            setAgentState(prev => ({
                ...prev,
                error: 'Failed to initialize voice agent. Please check your browser permissions.'
            }));
        });

        // Note: L'écoute ne démarre PAS ici, elle démarre au clic du bouton

        // Cleanup au démontage
        return () => {
            console.log('[PROVIDER] 🛑 Cleaning up Voice Agent Provider...');
            if (agentRef.current) {
                agentRef.current.shutdown();
            }
            delete window.__VOICE_AGENT__;
        };
    }, []); // Initialiser une seule fois

    // Mettre à jour les dépendances quand elles changent
    // Note: On ne réinitialise pas l'agent, juste les références
    useEffect(() => {
        if (agentRef.current && agentRef.current.config) {
            agentRef.current.config.dependencies = {
                navigate,
                location,
                user,
                login,
                logout,
                register,
                cart,
                addToCart,
                checkout,
                speak,
                setHighContrast,
                setFontSize,
                setSimplifiedMode,
                setReadabilityMode,
                setGrayscale,
                setVisualAlerts,
                setFocusMode
            };
        }
    }, [navigate, location, user, cart, login, logout, register, addToCart, checkout, speak, setHighContrast, setFontSize, setSimplifiedMode, setReadabilityMode, setGrayscale, setVisualAlerts, setFocusMode]);

    // Fonction pour démarrer l'écoute (appelée au clic du bouton)
    const startListening = () => {
        if (agentRef.current && agentRef.current.speechManager) {
            agentRef.current.speechManager.startContinuousListening();
        }
    };

    const value = {
        agent: agentRef.current,
        ...agentState,
        startListening, // ✅ NOUVEAU : Fonction pour démarrer l'écoute
        getStats: () => agentRef.current?.getStats() || null,
        listTools: () => agentRef.current?.listTools() || [],
        registerTool: (tool) => agentRef.current?.registerTool(tool) || false
    };

    return (
        <VoiceAgentContext.Provider value={value}>
            {children}

            {/* Indicateur visuel optionnel */}
            {agentState.initialized && (
                <VoiceAgentIndicator
                    listening={agentState.listening}
                    processing={agentState.processing}
                    lastCommand={agentState.lastCommand}
                    error={agentState.error}
                    onStartListening={startListening}
                />
            )}
        </VoiceAgentContext.Provider>
    );
};

/**
 * Composant d'indicateur visuel de l'agent
 */
const VoiceAgentIndicator = ({ listening, processing, lastCommand, error, onStartListening }) => {
    return (
        <div className="fixed top-24 left-6 z-[60] flex flex-col items-center gap-2">
            {/* Bouton cliquable pour démarrer l'écoute */}
            <button
                onClick={onStartListening}
                disabled={listening || processing}
                className={`p-5 rounded-full shadow-2xl transition-all border-4 flex items-center justify-center cursor-pointer hover:scale-110 ${listening
                    ? 'bg-accent border-accent/20 text-white animate-pulse'
                    : 'bg-gray-300 border-gray-400 text-gray-600 hover:bg-gray-400'
                    }`}
                title={listening ? 'Voice agent listening' : 'Click to start listening'}
            >
                {processing ? (
                    <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-7 w-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                    </svg>
                )}
            </button>

            {/* Status badge */}
            <div className="flex flex-col items-center text-center">
                <span
                    className={`text-[10px] font-black px-3 py-1 rounded-full ${listening ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                >
                    {processing ? 'PROCESSING' : listening ? 'LISTENING' : 'CLICK TO TALK'}
                </span>
            </div>

            {/* Dernière commande */}
            {lastCommand && (
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl mt-2 border-2 border-accent/10 max-w-[200px]">
                    <p className="text-xs font-bold text-primary italic truncate">
                        "{lastCommand}"
                    </p>
                </div>
            )}

            {/* Erreur */}
            {error && (
                <div className="bg-red-100 border-2 border-red-300 px-4 py-2 rounded-2xl shadow-xl mt-2 max-w-[200px]">
                    <p className="text-xs font-bold text-red-600">
                        {error}
                    </p>
                </div>
            )}
        </div>
    );
};
