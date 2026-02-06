import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMicrophone, FaVolumeUp } from 'react-icons/fa';

const GlobalVoiceCommander = () => {
    const [isListening, setIsListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const navigate = useNavigate();

    const processCommand = useCallback((text) => {
        const command = text.toLowerCase();
        console.log("Processing voice command:", command);

        if (command.includes("home") || command.includes("accueil")) {
            navigate("/");
            speak("Going to home page");
        } else if (command.includes("cart") || command.includes("panier")) {
            navigate("/cart");
            speak("Opening your shopping cart");
        } else if (command.includes("bank") || command.includes("banking") || command.includes("wallet") || command.includes("solde")) {
            navigate("/banking");
            speak("Opening your banking wallet");
        } else if (command.includes("login") || command.includes("connexion")) {
            navigate("/login");
            speak("Going to login page");
        } else if (command.includes("search for") || command.includes("cherche")) {
            const query = command.split("search for")[1] || command.split("cherche")[1];
            if (query) {
                navigate(`/results?q=${query.trim()}`);
                speak(`Searching for ${query}`);
            }
        }
    }, [navigate]);

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

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

    // Shortcut: Press 'V' to toggle listening
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === 'v' && e.ctrlKey) {
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
            >
                <FaMicrophone size={24} />
            </button>
            {isListening && (
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg border border-accent/20 animate-bounceIn">
                    <p className="text-xs font-bold text-accent">Listening...</p>
                </div>
            )}
            {lastCommand && !isListening && (
                <div className="bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
                    <p className="text-[10px] text-white italic">"{lastCommand}"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalVoiceCommander;
