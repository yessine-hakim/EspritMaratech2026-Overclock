import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useA11y } from '../context/A11yContext';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaCamera, FaEye, FaTextHeight, FaUniversalAccess, FaMicrophone, FaCheck } from 'react-icons/fa';
import AccessibilityModal from './AccessibilityModal';
import api from '../api';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const { highContrast, fontSize, simplifiedMode, speak } = useA11y();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isA11yModalOpen, setIsA11yModalOpen] = useState(false);
    const searchInputRef = useRef(null);

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleShortcuts = (e) => {
            // Alt + S: Focus Search
            if (e.altKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Alt + A: Open Accessibility
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setIsA11yModalOpen(true);
            }
            // Alt + C: Go to Cart
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                navigate('/cart');
            }
        };
        window.addEventListener('keydown', handleShortcuts);
        return () => window.removeEventListener('keydown', handleShortcuts);
    }, [navigate]);

    const performSearch = async (term, image) => {
        if (image) {
            const formData = new FormData();
            formData.append('image', image);
            if (term && term.trim()) {
                formData.append('q', term);
            }

            try {
                // Show loading state or feedback here if needed
                const response = await api.post('/api/products/api/visual-search/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                // Reset state
                setSelectedImage(null);
                setSearchTerm('');
                navigate('/results', { state: { products: response.data.results, explanation: response.data.explanation } });
            } catch (error) {
                console.error("Visual search failed", error);
                alert("Visual search failed. Please try again.");
            }
        } else if (term && term.trim()) {
            navigate(`/results?q=${term}`);
        }
    };

    const toggleSearchVoice = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Speech recognition is not supported in this browser.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            speak("Listening for your search query...");
        };
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setSearchTerm(transcript);
            speak(`Searching for ${transcript}`);
            // Automatically submit search after short delay
            setTimeout(() => {
                performSearch(transcript, selectedImage);
            }, 1000);
        };

        if (isListening) {
            recognition.stop();
        } else {
            recognition.start();
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        performSearch(searchTerm, selectedImage);
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedImage(file);
        }
    };

    return (
        <header className="bg-white border-b-2 border-gray-light sticky top-0 z-50 py-2" role="banner">
            <a href="#main-content" className="skip-link">Skip to Content</a>
            <nav className="container mx-auto px-6 flex items-center justify-start gap-12" aria-label="Main Navigation">
                {/* Logo Section - Strict Left Aligned */}
                <div className="flex flex-col min-w-[200px]">
                    <Link to="/" className="text-primary hover:underline decoration-accent decoration-4" aria-label="Pay4All Home">
                        <h1 className="text-3xl font-black m-0 leading-tight">Pay4All</h1>
                        <p className="text-sm text-accent font-bold uppercase tracking-wider m-0">Inclusion First</p>
                    </Link>
                </div>

                {/* Search Section - Expanded and Clear */}
                <form onSubmit={handleSearch} className="flex-1 max-w-2xl flex items-center gap-4" role="search" aria-label="Product Search">
                    <div className="relative flex-1 flex items-center">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Enter product name..."
                            className="w-full py-4 px-6 border-2 border-gray-light rounded-xl text-text bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all font-bold text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search for products"
                        />
                        <div className="absolute right-4 flex items-center gap-4">
                            <button
                                type="button"
                                onClick={toggleSearchVoice}
                                className={`p-2 transition-transform hover:scale-110 ${isListening ? 'text-red-600 animate-pulse' : 'text-primary'}`}
                                title="Search by voice"
                            >
                                <FaMicrophone size={24} aria-hidden="true" />
                                <span className="sr-only">Search by voice</span>
                            </button>

                            <label htmlFor="nav-image-upload" className="cursor-pointer p-2 text-primary hover:text-accent transition-all" title="Search by image">
                                {selectedImage ? <FaCheck size={24} className="text-green-600" aria-hidden="true" /> : <FaCamera size={24} aria-hidden="true" />}
                                <span className="sr-only">Upload image</span>
                            </label>
                            <input
                                type="file"
                                id="nav-image-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageUpload}
                            />

                            <button
                                type="submit"
                                className="p-2 text-primary hover:text-accent transition-transform hover:scale-110"
                                title="Search"
                            >
                                <FaSearch size={24} aria-hidden="true" />
                                <span className="sr-only">Search</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Actions - Grouped to the left of the user section */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => setIsA11yModalOpen(true)}
                        className="p-4 bg-primary text-white rounded-2xl hover:bg-accent transition-all shadow-lg flex items-center gap-2 font-bold"
                        aria-label="Accessibility Settings"
                    >
                        <FaUniversalAccess size={24} aria-hidden="true" />
                        <span className="hidden lg:inline">Settings</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-6">
                            <Link to="/cart" className="relative p-2 text-primary hover:text-accent transition-all" aria-label="View Cart">
                                <FaShoppingCart size={32} />
                                {cart?.total_items > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black h-6 w-6 rounded-full flex items-center justify-center border-2 border-white">
                                        {cart.total_items}
                                    </span>
                                )}
                            </Link>

                            <Link to="/profile" className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all" aria-label="Profile">
                                <FaUser size={24} />
                                <span className="font-bold text-lg hidden xl:inline">{user.first_name || 'Profile'}</span>
                            </Link>

                            <button
                                onClick={logout}
                                className="p-4 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all flex items-center gap-2 font-black"
                                aria-label="Logout"
                            >
                                <FaSignOutAlt size={24} />
                                <span className="hidden xl:inline">LOGOUT</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="px-6 py-3 text-primary font-black text-lg hover:underline decoration-accent">
                                Login
                            </Link>
                            <Link to="/register" className="px-8 py-4 bg-accent text-white rounded-2xl font-black text-lg shadow-lg hover:bg-[#0e5a56] transition-all">
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </nav>
            <AccessibilityModal isOpen={isA11yModalOpen} onClose={() => setIsA11yModalOpen(false)} />
        </header>
    );
};

export default Navbar;
