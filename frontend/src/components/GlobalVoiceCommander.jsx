import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { FaMicrophone } from 'react-icons/fa';
import api from '../api';

const GlobalVoiceCommander = () => {
    const [isListening, setIsListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const navigate = useNavigate();
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

    const processCommand = useCallback(async (text) => {
        const transcript = text.trim();
        if (!transcript) return;

        console.log("Processing AI voice command:", transcript);

        try {
            const response = await api.post('/api/recommendations/voice-intent/', { transcript });
            const { action, target, value, response: feedback } = response.data;

            console.log("AI Intent Detected:", { action, target, value });

            // 1. Handle Navigation
            if (action === 'navigate') {
                if (target === 'home') navigate('/');
                else if (target === 'cart') navigate('/cart');
                else if (target === 'banking') navigate('/banking');
                else if (target === 'login') navigate('/login');
                else if (target === 'profile') navigate('/profile');
            }

            // 2. Handle Search
            else if (action === 'search') {
                navigate(`/results?q=${target}`);
            }

            // 3. Handle Accessibility
            else if (action === 'accessibility') {
                if (target === 'highContrast') setHighContrast(!!value);
                else if (target === 'fontSize') setFontSize(parseInt(value) || 100);
                else if (target === 'simplifiedMode') setSimplifiedMode(!!value);
                else if (target === 'readabilityMode') setReadabilityMode(!!value);
                else if (target === 'grayscale') setGrayscale(!!value);
                else if (target === 'visualAlerts') setVisualAlerts(!!value);
                else if (target === 'focusMode') setFocusMode(!!value);
            }

            // 4. Handle Banking (Simple feedback for now, could be extended)
            else if (action === 'banking') {
                if (target === 'balance') navigate('/banking');
            }

            // Always speak the AI's response
            if (feedback) {
                speak(feedback);
            }

        } catch (error) {
            console.error("AI Voice Command failed", error);
            speak("I'm sorry, I couldn't process that command. Please try again.");
        }
    }, [navigate, speak, setHighContrast, setFontSize, setSimplifiedMode, setReadabilityMode, setGrayscale, setVisualAlerts, setFocusMode]);

    const toggleListening = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setLastCommand(transcript);
            processCommand(transcript);
        };

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    // Shortcut: Press 'Ctrl+V' to toggle listening
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'v' && e.ctrlKey) {
                e.preventDefault();
                toggleListening();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isListening]);

    return (
        <div className="fixed top-24 left-6 z-50 flex flex-col items-center gap-2">
            <button
                onClick={toggleListening}
                className={`p-4 rounded-full shadow-2xl transition-all border-4 ${isListening
                    ? 'bg-red-500 border-red-200 text-white animate-pulse'
                    : 'bg-white border-accent/20 text-accent hover:border-accent'
                    }`}
                title="Global Voice Command (Ctrl+V)"
                aria-label={isListening ? "Stop listening" : "Start voice command"}
            >
                <FaMicrophone size={24} />
            </button>
            {isListening && (
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-accent/20 animate-bounceIn">
                    <p className="text-xs font-bold text-accent">Listening...</p>
                </div>
            )}
            {lastCommand && !isListening && (
                <div className="bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm max-w-[200px] text-center">
                    <p className="text-[10px] text-white italic truncate" title={lastCommand}>"{lastCommand}"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalVoiceCommander;
