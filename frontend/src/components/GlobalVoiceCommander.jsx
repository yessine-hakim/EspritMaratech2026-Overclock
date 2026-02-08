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
    const [isThinking, setIsThinking] = useState(false);
    const [isConversational, setIsConversational] = useState(false);
    const [aiResponse, setAiResponse] = useState('');

    // Refs for synchronous access to latest state (prevents stale closures)
    const isHandsFreeRef = useRef(true);
    const isConversationalRef = useRef(false);
    const isThinkingRef = useRef(false);
    const conversationalTimeoutRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();
    const { user, login, logout, register } = useAuth();
    const { cart, addToCart, checkout } = useCart();
    const recognitionRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Sync refs with state
    useEffect(() => { isHandsFreeRef.current = isHandsFree; }, [isHandsFree]);
    useEffect(() => { isConversationalRef.current = isConversational; }, [isConversational]);
    useEffect(() => { isThinkingRef.current = isThinking; }, [isThinking]);

    const {
        speak,
        setHighContrast,
        setFontSize,
        setSimplifiedMode,
        setReadabilityMode,
        setGrayscale,
        setVisualAlerts,
        setFocusMode,
        visibleProducts
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

    const startConversationalMode = () => {
        setIsConversational(true);
        isConversationalRef.current = true;
        if (conversationalTimeoutRef.current) clearTimeout(conversationalTimeoutRef.current);
        conversationalTimeoutRef.current = setTimeout(() => {
            setIsConversational(false);
            isConversationalRef.current = false;
        }, 12000); // 12 seconds of follow-up window
    };

    const processCommand = useCallback(async (text) => {
        const transcript = text.toLowerCase().trim();
        if (!transcript) return;

        let processedTranscript = transcript;
        const hasWakeWord = transcript.includes("hey assistant") || transcript.includes("assistant");

        // Use refs to avoid stale closures in recognition callbacks
        if (isHandsFreeRef.current && !isConversationalRef.current && !hasWakeWord) {
            return;
        }

        if (hasWakeWord) {
            processedTranscript = transcript.replace(/hey assistant|assistant/, "").trim();
            startConversationalMode();
            if (!processedTranscript) {
                speak("How can I help you?");
                setIsThinking(false);
                return;
            }
        } else if (isConversationalRef.current) {
            startConversationalMode(); // Extend the window
        }

        console.log("Processing AI voice command:", processedTranscript);
        setIsThinking(true);
        isThinkingRef.current = true;
        setLastCommand(processedTranscript);

        try {
            const productMatch = location.pathname.match(/\/product\/(\d+)/);
            const productId = productMatch ? productMatch[1] : null;

            const response = await api.post('/api/recommendations/voice-intent/', {
                transcript: processedTranscript,
                productId: productId,
                visibleProducts: location.pathname === '/results' ? visibleProducts : []
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
                    setAuthStep('REG_VOICE');
                    speak("Got it. Now, for your security, let's link your unique voice fingerprint. Please say: 'My voice is my password' after the tone.");
                    setTimeout(async () => {
                        const blob = await recordBiometrics();
                        if (blob) {
                            setAuthData(prev => ({ ...prev, voiceBlob: blob }));
                            speak("Voice signature captured. Say 'Confirm registration' to finish.");
                            setAuthStep('REG_CONFIRM');
                        } else {
                            speak("Recording failed. Let's try once more.");
                        }
                    }, 3000);
                    return;
                }

                if (authStep === 'REG_CONFIRM') {
                    if (action === 'confirm' || processedTranscript.includes("confirm")) {
                        speak("Creating your secure voice-only account... please wait.");
                        try {
                            const { voiceBlob, ...apiData } = authData;
                            // Generate a random internal password since Django requires it
                            const randomPass = Math.random().toString(36).slice(-12) + "V0ice!";
                            await register({ ...apiData, password: randomPass, confirmPassword: randomPass });

                            if (voiceBlob) {
                                const formData = new FormData();
                                formData.append('audio', voiceBlob, 'enroll.wav');
                                await api.post('/api/voiceid/enroll/', formData);
                            }

                            speak(`Welcome ${authData.first_name}. Your account is ready. From now on, your voice is your only key.`);
                            setAuthStep(null);
                            setAuthData({});
                            navigate('/');
                        } catch (e) {
                            speak("Registration failed. Please try again.");
                            setAuthStep(null);
                        }
                        return;
                    }
                }
            }

            // --- AUTH TRIGGER HANDLER ---
            if (action === 'auth') {
                if (target === 'login') {
                    speak("Identifying your voice. Please say your enrollment phrase after the tone.");
                    setTimeout(async () => {
                        const blob = await recordBiometrics();
                        if (blob) {
                            const formData = new FormData();
                            formData.append('audio', blob, 'ident.wav');
                            try {
                                const resp = await api.post('/api/voiceid/identify/', formData);
                                if (resp.data.status === 'success') {
                                    speak(`Welcome back ${resp.data.user.first_name}. You are now logged in.`);
                                    // Refresh auth state (manually since we used session login on backend)
                                    window.location.reload();
                                }
                            } catch (e) {
                                speak("Voice not recognized. Please try again or use manual login.");
                            }
                        }
                    }, 3000);
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
                if (pathMap[target]) {
                    navigate(pathMap[target]);
                } else if (target && target.startsWith('/')) {
                    navigate(target);
                }
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

            if (action === 'status_check' || action === 'chat') {
                setAiResponse(feedback);
                setIsThinking(false);
                if (feedback) speak(feedback);
                return;
            }

            if (feedback && !pendingAction) {
                setAiResponse(feedback);
                speak(feedback);
            }

            setIsThinking(false);
        } catch (error) {
            console.error("Voice Command failed", error);
            setIsThinking(false);
            speak("I'm sorry, I'm having trouble processing that.");
        }
    }, [navigate, speak, isHandsFree, setHighContrast, setFontSize, setSimplifiedMode, location.pathname, addToCart, checkout, cart, pendingAction, authStep, authData, login, register, logout, recordBiometrics, visibleProducts]);

    const processCommandRef = useRef(null);
    useEffect(() => {
        processCommandRef.current = processCommand;
    }, [processCommand]);

    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) return;

        let recognition = recognitionRef.current;
        if (!recognition) {
            recognition = new window.webkitSpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = false;
            recognition.lang = 'en-US';
            recognitionRef.current = recognition;
        }

        recognition.onstart = () => setIsListening(true);
        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            if (event.error === 'not-allowed') {
                speak("Microphone access denied. Please check your browser settings.");
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            // Auto-restart if hands-free is on
            if (isHandsFree) {
                try {
                    recognition.start();
                } catch (e) {
                    // Already started or busy
                }
            }
        };

        recognition.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript;
            setLastCommand(transcript);
            if (processCommandRef.current) {
                processCommandRef.current(transcript);
            }
        };

        if (isHandsFree) {
            try {
                recognition.start();
            } catch (e) {
                // Ignore "already started" errors
            }
        }

        return () => {
            if (!isHandsFree) {
                recognition.stop();
            }
        };
    }, [isHandsFree, speak]); // Removed processCommand from dependencies

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

            {/* AI INTELLIGENCE OVERLAY */}
            {(aiResponse || lastCommand) && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-primary/95 backdrop-blur-2xl p-8 rounded-[32px] border-2 border-accent/20 shadow-2xl transition-all animate-slideUp z-[100] ${isThinking ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="space-y-4">
                        {lastCommand && (
                            <div className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent shrink-0 mt-1">
                                    <FaMicrophone size={14} />
                                </div>
                                <p className="text-gray-400 font-bold text-lg italic uppercase tracking-wider">
                                    "{lastCommand}"
                                </p>
                            </div>
                        )}

                        {aiResponse && (
                            <div className="flex items-start gap-4 pt-4 border-t border-white/10">
                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 mt-1">
                                    <FaHeadset size={14} />
                                </div>
                                <p className="text-white text-2xl font-black leading-tight">
                                    {aiResponse}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => { setAiResponse(''); setLastCommand(''); }}
                            className="absolute top-4 right-4 text-white/40 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    {isConversational && (
                        <div className="mt-6 flex justify-center">
                            <div className="h-1 bg-accent/30 rounded-full w-full overflow-hidden">
                                <div className="h-full bg-accent animate-shrinkWidth" style={{ animationDuration: '12s' }} />
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalVoiceCommander;
