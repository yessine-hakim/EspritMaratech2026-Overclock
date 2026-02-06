import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaPaperPlane, FaRobot, FaTimes, FaCamera } from 'react-icons/fa';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { type: 'bot', content: "Hi! I'm your AI shopping assistant. I can help you find products that fit your budget. Try asking 'Find me a cheap laptop' or upload an image!" }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { user } = useAuth();
    const fileInputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { type: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const payload = {
                query: input,
                user_id: user?.id
            };

            const res = await api.post('/api/recommendations/ask/', payload);

            const botResponse = {
                type: 'bot',
                content: res.data.explanation || "Here are some recommendations based on your request.",
                recommendations: res.data.recommendations || []
            };

            setMessages(prev => [...prev, botResponse]);

            // Voice synthesis of the answer
            speak(botResponse.content);

        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { type: 'bot', content: "Sorry, I encountered an error providing recommendations." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const userMessage = { type: 'user', content: "Sent an image for visual search..." };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        const formData = new FormData();
        formData.append('image', file);
        if (user?.id) formData.append('user_id', user.id);

        try {
            // Note: The backend API needs to support multipart/form-data for this endpoint
            // If strictly JSON is expected by standard view, we might need a separate endpoint or adjustments
            // Based on analysis, api.recommend handles request.FILES
            const res = await api.post('/api/recommendations/ask/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const botResponse = {
                type: 'bot',
                content: res.data.explanation || "I found these similar products for you.",
                recommendations: res.data.recommendations || []
            };
            setMessages(prev => [...prev, botResponse]);
            speak(botResponse.content);

        } catch (error) {
            console.error("Image search error", error);
            setMessages(prev => [...prev, { type: 'bot', content: "Sorry, I couldn't process that image." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const startListening = () => {
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
            setInput(transcript);
            // Optional: Auto-send after voice
            // handleSend(); 
        };

        recognition.start();
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            window.speechSynthesis.speak(utterance);
        }
    };

    return (
        <>
            {/* Floating Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-accent text-white p-4 rounded-full shadow-lg hover:bg-[#0e5a56] transition-all transform hover:scale-110 z-50 animate-bounce"
                >
                    <FaRobot size={24} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden transform transition-all">
                    {/* Header */}
                    <div className="bg-accent text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2 font-bold">
                            <FaRobot /> Pay4All Assistant
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:text-gray-200">
                            <FaTimes />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                <div className={`inline-block p-3 rounded-lg max-w-[85%] ${msg.type === 'user'
                                    ? 'bg-accent text-white rounded-br-none'
                                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>

                                {/* Product Recommendations Carousel */}
                                {msg.recommendations && msg.recommendations.length > 0 && (
                                    <div className="mt-3 flex gap-3 overflow-x-auto pb-2 snap-x">
                                        {msg.recommendations.map(prod => (
                                            <Link
                                                to={`/product/${prod.id}`}
                                                key={prod.id}
                                                className="min-w-[140px] w-[140px] bg-white p-2 rounded border border-gray-200 shadow-sm flex-shrink-0 snap-center hover:border-accent block"
                                            >
                                                <div className="h-24 bg-gray-100 rounded mb-2 overflow-hidden">
                                                    <img
                                                        src={prod.image_url || "https://via.placeholder.com/150"}
                                                        alt={prod.title}
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <p className="text-xs font-bold truncate text-primary">{prod.title}</p>
                                                <p className="text-xs text-accent font-bold">${prod.price}</p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {isLoading && (
                            <div className="text-left mb-4">
                                <div className="inline-block p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2 relative">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="text-gray-400 hover:text-accent p-2"
                                title="Upload Image"
                            >
                                <FaCamera />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                                accept="image/*"
                            />

                            <input
                                type="text"
                                className="flex-1 bg-gray-100 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/20"
                                placeholder="Ask for products..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            />

                            <button
                                onClick={startListening}
                                className={`p-3 rounded-full ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-accent'}`}
                                title="Voice Input"
                            >
                                <FaMicrophone />
                            </button>

                            <button
                                onClick={handleSend}
                                className="bg-accent text-white p-3 rounded-full hover:bg-opacity-90 shadow-sm"
                            >
                                <FaPaperPlane />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Chatbot;
