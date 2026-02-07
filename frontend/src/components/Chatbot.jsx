import React, { useState, useRef, useEffect } from 'react';
import { FaMicrophone, FaPaperPlane, FaRobot, FaTimes, FaCamera, FaCheck } from 'react-icons/fa';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { type: 'bot', content: "Hi! I'm your AI shopping assistant. I can help you find products that fit your budget." }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    const [selectedImage, setSelectedImage] = useState(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim() && !selectedImage) return;

        const userMessage = { type: 'user', content: input || (selectedImage ? "Sent an image..." : "") };
        setMessages(prev => [...prev, userMessage]);

        const currentInput = input;
        const currentImage = selectedImage;

        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        if (currentImage) {
            // Handle image + optional text
            const formData = new FormData();
            formData.append('image', currentImage);
            if (currentInput) formData.append('query', currentInput);
            if (user?.id) formData.append('user_id', user.id);

            try {
                const res = await api.post('/api/recommendations/ask/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                await processBotResponse(res.data);
            } catch (error) {
                console.error("Chat error", error);
                setMessages(prev => [...prev, { type: 'bot', content: "Sorry, I encountered an error processing your image." }]);
                setIsLoading(false);
            }
        } else {
            // Handle text only

            try {
                const payload = {
                    query: input,
                    user_id: user?.id
                };

                const res = await api.post('/api/recommendations/ask/', payload);
                await processBotResponse(res.data);

            } catch (error) {
                console.error("Chat error", error);
                setMessages(prev => [...prev, { type: 'bot', content: "Sorry, I encountered an error providing recommendations." }]);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const processBotResponse = async (data) => {
        console.log("Chatbot API response:", data);

        // Ensure recommendations is an array
        let recommendations = Array.isArray(data.recommendations)
            ? data.recommendations
            : [];

        // Sort by importance (similarity_score) descending
        recommendations.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));

        const botResponse = {
            type: 'bot',
            content: data.explanation || "Here are some recommendations based on your request.",
            recommendations: recommendations
        };

        setMessages(prev => [...prev, botResponse]);
        speak(botResponse.content);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
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
                        {messages.map((msg, idx) => {
                            const hasRecommendations = msg.recommendations && Array.isArray(msg.recommendations) && msg.recommendations.length > 0;
                            console.log(`Message ${idx} - Type: ${msg.type}, Has recommendations:`, hasRecommendations, "Count:", msg.recommendations?.length);

                            return (
                                <div key={idx} className={`mb-4 ${msg.type === 'user' ? 'text-right' : 'text-left'}`}>
                                    <div className={`inline-block p-3 rounded-lg max-w-[85%] ${msg.type === 'user'
                                        ? 'bg-accent text-white rounded-br-none'
                                        : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                                        }`}>
                                        {msg.content}
                                    </div>

                                    {/* Product Recommendations Carousel - Only for bot messages */}
                                    {msg.type === 'bot' && hasRecommendations && (
                                        <div className="mt-3 clear-both">
                                            <div className="text-xs text-gray-500 mb-2 font-semibold">Found {msg.recommendations.length} products:</div>
                                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-thin" style={{ maxWidth: '100%', scrollbarWidth: 'thin' }}>
                                                {msg.recommendations.map((prod, prodIdx) => {
                                                    console.log(`Rendering product ${prodIdx}:`, prod);
                                                    if (!prod || !prod.id) {
                                                        console.warn("Invalid product in recommendations:", prod);
                                                        return null;
                                                    }
                                                    return (
                                                        <Link
                                                            to={`/product/${prod.id}`}
                                                            key={prod.id || `prod-${prodIdx}`}
                                                            className="min-w-[140px] w-[140px] bg-white p-2 rounded-lg border-2 border-gray-200 shadow-md flex-shrink-0 snap-center hover:border-accent hover:shadow-lg transition-all block"
                                                        >
                                                            <div className="h-24 bg-gray-100 rounded mb-2 overflow-hidden flex items-center justify-center">
                                                                <img
                                                                    src={prod.image || prod.image_url || "https://via.placeholder.com/150"}
                                                                    alt={prod.title || 'Product'}
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        e.target.src = "https://via.placeholder.com/150";
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="text-xs font-bold truncate text-primary mb-1">{prod.title || 'Untitled Product'}</p>
                                                            <p className="text-xs text-accent font-bold">{prod.price || 'N/A'} TND</p>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        <div className="flex items-center gap-2 relative">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={`p-2 transition-colors ${selectedImage ? 'text-green-500' : 'text-gray-400 hover:text-accent'}`}
                                title={selectedImage ? "Image selected" : "Upload Image"}
                            >
                                {selectedImage ? <FaCheck /> : <FaCamera />}
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
