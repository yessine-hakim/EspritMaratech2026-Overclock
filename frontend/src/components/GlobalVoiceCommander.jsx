import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FaMicrophone, FaHeadset } from 'react-icons/fa';
import api from '../api';

const GlobalVoiceCommander = () => {
    const [isListening, setIsListening] = useState(false);
    const [isHandsFree, setIsHandsFree] = useState(true); // Always on by default
    const [lastCommand, setLastCommand] = useState('');
    const [pendingAction, setPendingAction] = useState(null); // { type, total, items }
    const [authStep, setAuthStep] = useState(null); // null, 'LOGIN_EMAIL', 'LOGIN_PASSWORD', 'REG_EMAIL', 'REG_FIRST', 'REG_LAST', 'REG_BUDGET', 'REG_PASSWORD', 'REG_CONFIRM'
    const [authData, setAuthData] = useState({});
    const navigate = useNavigate();
    const location = useLocation();
    const { user, login, logout, register } = useAuth();
    const { cart, addToCart, checkout } = useCart();
    const recognitionRef = useRef(null);
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

    const VOICE_SPENDING_LIMIT = 100; // Limit for voice-only checkout (TND)

    const processCommand = useCallback(async (text) => {
        const transcript = text.toLowerCase().trim();
        if (!transcript) return;

        // Hands-free mode: require wake word
        let processedTranscript = transcript;
        if (isHandsFree) {
            if (!transcript.includes("hey assistant") && !transcript.includes("assistant")) {
                return; // Ignore if wake word not present
            }
            processedTranscript = transcript.replace(/hey assistant|assistant/, "").trim();
            if (!processedTranscript) return;
        }

        console.log("Processing AI voice command:", processedTranscript);

        try {
            const response = await api.post('/api/recommendations/voice-intent/', { transcript: processedTranscript });
            const { action, target, value, response: feedback } = response.data;

            console.log("AI Intent Detected:", { action, target, value });

            // --- AUTH FLOW HANDLER ---
            if (authStep) {
                // If the user says 'cancel', abort the flow
                if (action === 'cancel' || processedTranscript.includes("cancel")) {
                    speak("Authentication cancelled.");
                    setAuthStep(null);
                    setAuthData({});
                    return;
                }

                const rawValue = processedTranscript; // Usually we want the raw transcript for names/emails

                // LOGIN FLOW
                if (authStep === 'LOGIN_EMAIL') {
                    setAuthData({ ...authData, username: rawValue });
                    setAuthStep('LOGIN_PASSWORD');
                    speak("Got it. Now, please say your password.");
                    return;
                }
                if (authStep === 'LOGIN_PASSWORD') {
                    const email = authData.username;
                    const pass = rawValue;
                    setAuthStep(null);
                    setAuthData({});
                    speak("Identifying your voice... please wait.");
                    try {
                        await login(email, pass);
                        navigate('/');
                    } catch (e) {
                        speak("Identification failed. Please check your credentials.");
                    }
                    return;
                }

                // Registration Steps
                if (authStep === 'REG_EMAIL') {
                    setAuthData({ ...authData, email: rawValue });
                    setAuthStep('REG_FIRST');
                    speak("Thank you. What is your first name?");
                    return;
                }
                if (authStep === 'REG_FIRST') {
                    setAuthData({ ...authData, first_name: rawValue });
                    setAuthStep('REG_LAST');
                    speak("And your last name?");
                    return;
                }
                if (authStep === 'REG_LAST') {
                    setAuthData({ ...authData, last_name: rawValue });
                    setAuthStep('REG_BUDGET');
                    speak("What is your monthly shopping budget?");
                    return;
                }
                if (authStep === 'REG_BUDGET') {
                    const budget = parseFloat(rawValue.replace(/[^0-9.]/g, '')) || 100;
                    setAuthData({ ...authData, monthly_budget: budget });
                    setAuthStep('REG_PASSWORD');
                    speak("Almost done. Please choose a voice password.");
                    return;
                }
                if (authStep === 'REG_PASSWORD') {
                    setAuthData({ ...authData, password: rawValue, confirmPassword: rawValue });
                    setAuthStep('REG_CONFIRM');
                    speak(`Check your details. You are registering as ${authData.first_name}. Say 'Confirm registration' to finish.`);
                    return;
                }

                // If it's a 'confirm' action in REG_CONFIRM step
                if (authStep === 'REG_CONFIRM') {
                    if (action === 'confirm' || processedTranscript.includes("confirm")) {
                        speak("Creating your account now.");
                        try {
                            const { confirmPassword, ...apiData } = authData; // Remove confirmPassword before sending
                            await register(apiData);
                            setAuthStep(null);
                            setAuthData({});
                            navigate('/');
                        } catch (e) {
                            speak("Registration failed. Some details were missing or incorrect.");
                            setAuthStep(null);
                        }
                        return;
                    }
                }
            }

            // --- AUTH TRIGGER HANDLER ---
            if (action === 'auth') {
                if (target === 'login') {
                    setAuthStep('LOGIN_EMAIL');
                    speak("Let's identify you. Please say your registered email address.");
                    return;
                }
                if (target === 'register') {
                    setAuthStep('REG_EMAIL');
                    speak("Welcome. Let's create your account. Please say your email address.");
                    return;
                }
                if (target === 'logout') {
                    await logout();
                    navigate('/login');
                    return;
                }
            }

            // --- SECURITY LAYER... (existing pendingAction code stays below)
            if (pendingAction) {
                if (action === 'confirm' || processedTranscript.includes("confirm")) {
                    if (pendingAction.type === 'CHECKOUT') {
                        speak("Processing your payment now. Please wait.");
                        try {
                            await checkout();
                            setPendingAction(null);
                            navigate('/banking');
                        } catch (e) {
                            speak("Payment failed. Please check your account.");
                        }
                    }
                    else if (pendingAction.type === 'TRANSFER') {
                        speak(`Sending ${pendingAction.total} T-N-D to ${pendingAction.recipient}.`);
                        try {
                            await api.post('/api/banking/transfer/', {
                                amount: pendingAction.total,
                                recipient_iban: pendingAction.recipient,
                                description: "Voice Transfer"
                            });
                            setPendingAction(null);
                            speak("Transfer successful.");
                            navigate('/banking');
                        } catch (e) {
                            speak("Transfer failed. Please check the I-B-A-N and your balance.");
                            setPendingAction(null);
                        }
                    }
                    return;
                } else if (action === 'cancel' || processedTranscript.includes("cancel")) {
                    speak("Transaction cancelled. Your money is safe.");
                    setPendingAction(null);
                    return;
                } else {
                    speak("A transaction is pending. Please say confirm or cancel.");
                    return;
                }
            }

            // 1. Handle Navigation
            if (action === 'navigate') {
                const pathMap = {
                    'home': '/',
                    'cart': '/cart',
                    'banking': '/banking',
                    'profile': '/profile',
                    'login': '/login',
                    'results': '/results'
                };
                if (pathMap[target]) navigate(pathMap[target]);
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

            // 4. Handle Cart
            else if (action === 'cart') {
                if (target === 'view') navigate('/cart');
                else if (target === 'checkout') {
                    if (!cart || !cart.items || cart.items.length === 0) {
                        speak("Your cart is empty. I can't checkout nothing!");
                        return;
                    }

                    const total = cart.total_price || 0;

                    // Spending Limit Check
                    if (total > VOICE_SPENDING_LIMIT) {
                        speak(`This order is ${total} T-N-D, which exceeds the voice limit. For your security, please use the screen to finish this purchase.`);
                        navigate('/cart');
                        return;
                    }

                    // Set Pending for confirmation
                    setPendingAction({ type: 'CHECKOUT', total, count: cart.items.length });
                    speak(`Ready to checkout. You have ${cart.items.length} items for a total of ${total} T-N-D. Say confirm to pay or cancel to stop.`);
                }
                else if (target === 'add') {
                    // If we are on a product page, we can add it
                    const productMatch = location.pathname.match(/\/product\/(\d+)/);
                    if (productMatch) {
                        const productId = productMatch[1];
                        const success = await addToCart(productId);
                        if (success) speak("Added to your cart.");
                    } else {
                        speak("Please select a product first.");
                    }
                }
            }

            // 5. Handle Banking
            else if (action === 'banking') {
                if (target === 'balance') navigate('/banking');
                else if (target === 'affordability') {
                    if (feedback) speak(feedback);
                }
                else if (target === 'transfer') {
                    const amount = value?.amount;
                    const recipient = value?.recipient_iban;

                    if (!amount || !recipient) {
                        speak("I need to know the amount and the I-B-A-N to make a transfer. For example, say: Transfer 50 to recipient X.");
                        return;
                    }

                    // Security check: Use the same confirmation flow
                    setPendingAction({
                        type: 'TRANSFER',
                        total: amount,
                        recipient: recipient
                    });
                    speak(`Ready to transfer ${amount} T-N-D to ${recipient}. Say confirm to proceed or cancel to stop.`);
                }
            }

            // Handle Chat/Feedback
            if (feedback && !pendingAction) {
                speak(feedback);
            }

        } catch (error) {
            console.error("AI Voice Command failed", error);
            if (!isHandsFree) speak("Sorry, I couldn't do that.");
        }
    }, [navigate, speak, isHandsFree, setHighContrast, setFontSize, setSimplifiedMode, setReadabilityMode, setGrayscale, setVisualAlerts, setFocusMode, location.pathname, addToCart, checkout, cart, pendingAction]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) return;

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart if hands-free is on
            if (isHandsFree) {
                try {
                    recognition.start();
                } catch (e) {
                    console.warn("Speech recognition auto-restart failed", e);
                }
            }
        };

        recognition.onresult = (event) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            setLastCommand(transcript);
            processCommand(transcript);
        };

        recognitionRef.current = recognition;

        // Auto-start if hands-free is enabled (it is by default now)
        if (isHandsFree) {
            try {
                recognition.start();
            } catch (e) {
                console.warn("Initial speech recognition start failed (likely needs user interaction)", e);
            }
        }

        return () => {
            recognition.stop();
        };
    }, []); // Only on mount

    useEffect(() => {
        // Handle isHandsFree changes if toggled
        if (isHandsFree) {
            try {
                recognitionRef.current?.start();
            } catch (e) { }
        } else {
            recognitionRef.current?.stop();
        }
    }, [isHandsFree]);

    const toggleHandsFree = () => {
        const nextState = !isHandsFree;
        setIsHandsFree(nextState);
        if (nextState) {
            speak("Hands-free mode activated. Say Hey Assistant followed by your command.");
        } else {
            speak("Hands-free mode deactivated.");
        }
    };

    return (
        <div className="fixed top-24 left-6 z-[60] flex flex-col items-center gap-2">
            <button
                onClick={toggleHandsFree}
                className={`p-4 rounded-full shadow-2xl transition-all border-4 ${isHandsFree
                    ? 'bg-accent border-accent/20 text-white animate-pulse'
                    : 'bg-white border-accent/20 text-accent hover:border-accent'
                    }`}
                title={isHandsFree ? "Stop Hands-Free" : "Start Hands-Free Voice Controller"}
            >
                {isHandsFree ? <FaHeadset size={24} /> : <FaMicrophone size={24} />}
            </button>
            <div className="flex flex-col items-center text-center gap-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isHandsFree ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {isHandsFree ? "VOICE ACTIVE" : "VOICE OFF"}
                </span>
                {isHandsFree && (
                    <p className="text-[9px] text-accent animate-pulse">Say "Hey Assistant"</p>
                )}
            </div>

            {/* Visual Security Overlay */}
            {pendingAction && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-[100] animate-fadeIn">
                    <div className="bg-white p-8 rounded-3xl shadow-2xl border-4 border-accent max-w-md w-full text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <FaMicrophone size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-text">Security Confirmation</h2>
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                            <p className="text-gray-500 text-sm uppercase tracking-widest font-bold">Total Amount</p>
                            <p className="text-4xl font-black text-accent">{pendingAction.total} TND</p>
                            <p className="text-sm text-gray-400 mt-1">{pendingAction.count} items in cart</p>
                        </div>
                        <p className="text-text font-medium text-lg italic">
                            "Say 'Confirm' to finalize your purchase or 'Cancel' to abort."
                        </p>
                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={() => setPendingAction(null)}
                                className="flex-1 py-3 px-6 rounded-xl border-2 border-gray-200 font-bold text-gray-400 hover:bg-gray-50"
                            >
                                Manual Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lastCommand && (
                <div className="bg-primary/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm max-w-[150px] mt-2">
                    <p className="text-[10px] text-white italic truncate">"{lastCommand}"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalVoiceCommander;
