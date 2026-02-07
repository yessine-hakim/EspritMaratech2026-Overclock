import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useA11y } from '../context/A11yContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FaMicrophone, FaHeadset } from 'react-icons/fa';
import api from '../api';

const GlobalVoiceCommander = () => {
    const [isListening, setIsListening] = useState(false);
    const [isHandsFree, setIsHandsFree] = useState(true);
    const [lastCommand, setLastCommand] = useState('');
    const [pendingAction, setPendingAction] = useState(null);
    const [authStep, setAuthStep] = useState(null); // LOGIN_..., REG_..., ENROLL_VOICE, VERIFY_VOICE
    const [authData, setAuthData] = useState({});
    const [isRecordingBiometrics, setIsRecordingBiometrics] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const { user, login, logout, register } = useAuth();
    const { cart, addToCart, checkout } = useCart();
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

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

    const VOICE_SPENDING_LIMIT = 500; // Increased limit with VoiceID
    const BIOMETRIC_THRESHOLD_LIMIT = 100; // Transactions above this need VoiceID

    // --- Biometric Recording Utility ---
    const recordBiometrics = async (duration = 3000) => {
        return new Promise(async (resolve) => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                    stream.getTracks().forEach(track => track.stop());
                    resolve(audioBlob);
                };

                setIsRecordingBiometrics(true);
                mediaRecorder.start();
                setTimeout(() => {
                    mediaRecorder.stop();
                    setIsRecordingBiometrics(false);
                }, duration);
            } catch (err) {
                console.error("Biometric recording failed", err);
                resolve(null);
            }
        });
    };

    const processCommand = useCallback(async (text) => {
        const transcript = text.toLowerCase().trim();
        if (!transcript) return;

        let processedTranscript = transcript;
        if (isHandsFree) {
            if (!transcript.includes("hey assistant") && !transcript.includes("assistant")) {
                return;
            }
            processedTranscript = transcript.replace(/hey assistant|assistant/, "").trim();
            if (!processedTranscript) return;
        }

        console.log("Processing AI voice command:", processedTranscript);

        try {
            const productMatch = location.pathname.match(/\/product\/(\d+)/);
            const productId = productMatch ? productMatch[1] : null;

            const response = await api.post('/api/recommendations/voice-intent/', {
                transcript: processedTranscript,
                productId: productId
            });
            const { action, target, value, response: feedback } = response.data;

            // --- VoiceID Enrollment Flow ---
            if (processedTranscript.includes("enroll my voice") || processedTranscript.includes("setup voice id")) {
                speak("Let's set up your Voice I-D. Please say: 'My voice is my password' after the tone.");
                setTimeout(async () => {
                    const blob = await recordBiometrics();
                    if (blob) {
                        const formData = new FormData();
                        formData.append('audio', blob, 'enroll.wav');
                        try {
                            await api.post('/api/voiceid/enroll/', formData);
                            speak("Voice I-D enrolled successfully. Your high-value transfers are now protected.");
                        } catch (e) {
                            speak("Enrollment failed. Please try again in a quiet place.");
                        }
                    }
                }, 3000);
                return;
            }

            // --- AUTH FLOW HANDLER ---
            if (authStep) {
                if (action === 'cancel' || processedTranscript.includes("cancel")) {
                    speak("Authentication cancelled.");
                    setAuthStep(null);
                    setAuthData({});
                    return;
                }

                const rawValue = processedTranscript;

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

                if (authStep === 'REG_CONFIRM') {
                    if (action === 'confirm' || processedTranscript.includes("confirm")) {
                        speak("Creating your account now.");
                        try {
                            const { confirmPassword, ...apiData } = authData;
                            await register(apiData);
                            setAuthStep(null);
                            setAuthData({});
                            navigate('/');
                        } catch (e) {
                            speak("Registration failed.");
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
                    speak("Please say your registered email address.");
                    return;
                }
                if (target === 'register') {
                    setAuthStep('REG_EMAIL');
                    speak("Welcome. Please say your email address.");
                    return;
                }
                if (target === 'logout') {
                    await logout();
                    navigate('/login');
                    return;
                }
            }

            // --- SECURITY LAYER & VOICE ID ---
            if (pendingAction) {
                if (action === 'confirm' || processedTranscript.includes("confirm")) {

                    // VOICE ID VERIFICATION for high-value transactions
                    if (pendingAction.total > BIOMETRIC_THRESHOLD_LIMIT) {
                        speak("High value transaction detected. Verifying your Voice I-D. Please repeat your enrollment phrase.");
                        const blob = await recordBiometrics();
                        if (blob) {
                            const formData = new FormData();
                            formData.append('audio', blob, 'verify.wav');
                            try {
                                const vResp = await api.post('/api/voiceid/verify/', formData);
                                if (!vResp.data.match) {
                                    speak("Voice I-D mismatch. Transaction blocked for your security.");
                                    setPendingAction(null);
                                    return;
                                }
                                speak("Voice I-D verified.");
                            } catch (e) {
                                speak("Voice I-D error. Please use manual confirmation.");
                                return;
                            }
                        }
                    }

                    if (pendingAction.type === 'CHECKOUT') {
                        speak("Processing your payment now.");
                        try {
                            await checkout();
                            setPendingAction(null);
                            navigate('/banking');
                        } catch (e) {
                            speak("Payment failed.");
                        }
                    }
                    else if (pendingAction.type === 'TRANSFER') {
                        speak(`Sending ${pendingAction.total} T-N-D.`);
                        try {
                            await api.post('/api/banking/transfer/', {
                                amount: pendingAction.total,
                                recipient_iban: pendingAction.recipient,
                                description: "Secure Voice Transfer"
                            });
                            setPendingAction(null);
                            speak("Transfer successful.");
                            navigate('/banking');
                        } catch (e) {
                            speak("Transfer failed.");
                            setPendingAction(null);
                        }
                    }
                    return;
                } else if (action === 'cancel' || processedTranscript.includes("cancel")) {
                    speak("Transaction cancelled.");
                    setPendingAction(null);
                    return;
                }
            }

            if (action === 'navigate') {
                const pathMap = { 'home': '/', 'cart': '/cart', 'banking': '/banking', 'profile': '/profile', 'login': '/login', 'results': '/results' };
                if (pathMap[target]) navigate(pathMap[target]);
            }
            else if (action === 'search') navigate(`/results?q=${target}`);
            else if (action === 'accessibility') {
                if (target === 'highContrast') setHighContrast(!!value);
                else if (target === 'fontSize') setFontSize(parseInt(value) || 100);
                else if (target === 'simplifiedMode') setSimplifiedMode(!!value);
            }
            else if (action === 'cart') {
                if (target === 'view') navigate('/cart');
                else if (target === 'checkout') {
                    if (!cart?.items?.length) { speak("Your cart is empty."); return; }
                    const total = cart.total_price || 0;
                    if (total > VOICE_SPENDING_LIMIT) {
                        speak(`This order is ${total} T-N-D, which exceeds the secure voice limit. Please use the screen.`);
                        return;
                    }
                    setPendingAction({ type: 'CHECKOUT', total, count: cart.items.length });
                    speak(`Ready to checkout ${total} T-N-D. Say confirm or cancel.`);
                }
                else if (target === 'add') {
                    const productMatch = location.pathname.match(/\/product\/(\d+)/);
                    if (productMatch) {
                        const success = await addToCart(productMatch[1]);
                        if (success) speak("Added to cart.");
                    } else speak("Select a product first.");
                }
            }
            else if (action === 'banking') {
                if (target === 'balance') navigate('/banking');
                else if (target === 'affordability') { if (feedback) speak(feedback); }
                else if (target === 'transfer') {
                    const { amount, recipient_iban: recipient } = value || {};
                    if (!amount || !recipient) { speak("Need amount and I-B-A-N."); return; }
                    setPendingAction({ type: 'TRANSFER', total: amount, recipient });
                    speak(`Confirm transfer of ${amount} T-N-D?`);
                }
            }

            if (feedback && !pendingAction) speak(feedback);

        } catch (error) {
            console.error("Voice Command failed", error);
        }
    }, [navigate, speak, isHandsFree, setHighContrast, setFontSize, setSimplifiedMode, location.pathname, addToCart, checkout, cart, pendingAction, authStep, authData, login, register, logout, recordBiometrics]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) return;
        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            if (isHandsFree) try { recognition.start(); } catch (e) { }
        };
        recognition.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript;
            setLastCommand(transcript);
            processCommand(transcript);
        };
        recognitionRef.current = recognition;
        if (isHandsFree) try { recognition.start(); } catch (e) { }
        return () => recognition.stop();
    }, [isHandsFree, processCommand]);

    const toggleHandsFree = () => {
        setIsHandsFree(!isHandsFree);
        speak(!isHandsFree ? "Hands-free on." : "Hands-free off.");
    };

    return (
        <div className="fixed top-24 left-6 z-[60] flex flex-col items-center gap-2">
            <button
                onClick={toggleHandsFree}
                className={`p-5 rounded-full shadow-2xl transition-all border-4 flex items-center justify-center ${isHandsFree
                    ? 'bg-accent border-accent/20 text-white animate-pulse'
                    : 'bg-white border-accent/20 text-accent hover:border-accent'
                    }`}
            >
                {isRecordingBiometrics ? <div className="w-6 h-6 border-4 border-red-500 border-t-transparent rounded-full animate-spin" /> : (isHandsFree ? <FaHeadset size={28} /> : <FaMicrophone size={28} />)}
            </button>

            <div className="flex flex-col items-center text-center">
                <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isHandsFree ? 'bg-accent text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {isRecordingBiometrics ? "RECORDING VOICE ID" : (isHandsFree ? "VOICE ACTIVE" : "VOICE OFF")}
                </span>
            </div>

            {pendingAction && (
                <div className="fixed inset-0 bg-primary/95 backdrop-blur-xl flex items-center justify-center z-[100] animate-fadeIn p-6">
                    <div className="bg-white p-12 rounded-[40px] shadow-2xl border-4 border-accent max-w-xl w-full text-left space-y-8">
                        <div className="flex items-center gap-6">
                            <div className={`p-6 rounded-3xl ${isRecordingBiometrics ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-accent/10 text-accent'}`}>
                                <FaMicrophone size={40} />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black text-primary">Security Check</h2>
                                <p className="text-xl font-bold text-gray-400">Verifying Identity...</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-10 rounded-[32px] border-2 border-gray-100">
                            <p className="text-sm font-black text-accent uppercase tracking-[0.2em] mb-2">Authorized Amount</p>
                            <p className="text-6xl font-black text-primary">{pendingAction.total} <span className="text-3xl">TND</span></p>
                        </div>

                        <p className="text-2xl font-bold text-primary leading-relaxed">
                            {isRecordingBiometrics
                                ? "Recording your voice fingerprint... Please speak naturally."
                                : "Please say 'Confirm' or use your enrollment phrase if prompted."}
                        </p>

                        <div className="flex gap-4">
                            <button onClick={() => setPendingAction(null)} className="flex-1 py-5 rounded-2xl border-2 border-gray-200 text-xl font-black text-gray-400 hover:bg-gray-50 transition-all">
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {lastCommand && (
                <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl mt-4 border-2 border-accent/10 max-w-[200px]">
                    <p className="text-xs font-bold text-primary italic truncate">"{lastCommand}"</p>
                </div>
            )}
        </div>
    );
};

export default GlobalVoiceCommander;
