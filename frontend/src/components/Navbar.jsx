import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useA11y } from '../context/A11yContext';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaCamera, FaEye, FaTextHeight, FaUniversalAccess, FaMicrophone, FaCheck, FaBars, FaTimes } from 'react-icons/fa';
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
            <nav className="container mx-auto px-4 md:px-6 flex items-center justify-between md:justify-start gap-4 md:gap-12" aria-label="Main Navigation">
                {/* Logo Section */}
                <div className="flex flex-col">
                    <Link to="/" className="text-primary hover:underline decoration-accent decoration-4" aria-label="Pay4All Home">
                        <h1 className="text-2xl md:text-3xl font-black m-0 leading-tight">Pay4All</h1>
                        <p className="text-xs md:text-sm text-accent font-bold uppercase tracking-wider m-0">Inclusion First</p>
                    </Link>
                </div>

                {/* Desktop Search Section - Hidden on mobile */}
                <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl items-center gap-4" role="search" aria-label="Product Search">
                    <div className="relative flex-1 flex items-center">
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="Enter product name..."
                            className="w-full py-3 md:py-4 px-4 md:px-6 border-2 border-gray-light rounded-xl text-text bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition-all font-bold text-base md:text-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search for products"
                        />
                        <div className="absolute right-4 flex items-center gap-2 md:gap-4">
                            <button
                                type="button"
                                onClick={toggleSearchVoice}
                                className={`p-2 transition-transform hover:scale-110 ${isListening ? 'text-red-600 animate-pulse' : 'text-primary'}`}
                                title="Search by voice"
                            >
                                <FaMicrophone size={20} aria-hidden="true" />
                                <span className="sr-only">Search by voice</span>
                            </button>

                            <label htmlFor="nav-image-upload" className="cursor-pointer p-2 text-primary hover:text-accent transition-all" title="Search by image">
                                {selectedImage ? <FaCheck size={20} className="text-green-600" aria-hidden="true" /> : <FaCamera size={20} aria-hidden="true" />}
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
                                <FaSearch size={20} aria-hidden="true" />
                                <span className="sr-only">Search</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* Desktop Actions - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-4 lg:gap-6">
                    <button
                        onClick={() => setIsA11yModalOpen(true)}
                        className="p-3 lg:p-4 bg-primary text-white rounded-xl lg:rounded-2xl hover:bg-accent transition-all shadow-lg flex items-center gap-2 font-bold"
                        aria-label="Accessibility Settings"
                    >
                        <FaUniversalAccess size={20} aria-hidden="true" />
                        <span className="hidden lg:inline">Settings</span>
                    </button>

                    {user ? (
                        <div className="flex items-center gap-4 lg:gap-6">
                            <Link to="/cart" className="relative p-2 text-primary hover:text-accent transition-all" aria-label="View Cart">
                                <FaShoppingCart size={28} />
                                {cart?.total_items > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-white">
                                        {cart.total_items}
                                    </span>
                                )}
                            </Link>

                            <Link to="/profile" className="flex items-center gap-2 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all" aria-label="Profile">
                                <FaUser size={20} />
                                <span className="font-bold text-base hidden xl:inline">{user.first_name || 'Profile'}</span>
                            </Link>

                            <button
                                onClick={logout}
                                className="p-3 lg:p-4 bg-red-50 text-red-600 rounded-xl lg:rounded-2xl hover:bg-red-100 transition-all flex items-center gap-2 font-black"
                                aria-label="Logout"
                            >
                                <FaSignOutAlt size={20} />
                                <span className="hidden xl:inline">LOGOUT</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link to="/login" className="px-4 py-2 text-primary font-black text-base hover:underline decoration-accent">
                                Login
                            </Link>
                            <Link to="/register" className="px-6 py-3 bg-accent text-white rounded-xl font-black text-base shadow-lg hover:bg-[#0e5a56] transition-all">
                                Register
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile: Cart + Hamburger */}
                <div className="flex md:hidden items-center gap-3">
                    {user && (
                        <Link to="/cart" className="relative p-2 text-primary" aria-label="View Cart">
                            <FaShoppingCart size={24} />
                            {cart?.total_items > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-black h-5 w-5 rounded-full flex items-center justify-center">
                                    {cart.total_items}
                                </span>
                            )}
                        </Link>
                    )}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-primary"
                        aria-label="Toggle mobile menu"
                        aria-expanded={isMobileMenuOpen}
                    >
                        {isMobileMenuOpen ? <FaTimes size={28} /> : <FaBars size={28} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Slide-Out Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-[60px] bg-white z-40 overflow-y-auto animate-fadeIn">
                    <div className="p-4 space-y-4">
                        {/* Mobile Search */}
                        <form onSubmit={(e) => { handleSearch(e); setIsMobileMenuOpen(false); }} className="flex items-center gap-2">
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="flex-1 py-3 px-4 border-2 border-gray-light rounded-xl bg-gray-50 font-bold"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button type="submit" className="p-3 bg-accent text-white rounded-xl">
                                <FaSearch size={20} />
                            </button>
                        </form>

                        {/* Mobile Navigation Links */}
                        <div className="space-y-2">
                            <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="block p-4 bg-gray-50 rounded-xl font-bold text-lg">
                                Home
                            </Link>
                            <Link to="/results" onClick={() => setIsMobileMenuOpen(false)} className="block p-4 bg-gray-50 rounded-xl font-bold text-lg">
                                Browse Products
                            </Link>
                            {user && (
                                <>
                                    <Link to="/banking" onClick={() => setIsMobileMenuOpen(false)} className="block p-4 bg-gray-50 rounded-xl font-bold text-lg">
                                        My Wallet
                                    </Link>
                                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="block p-4 bg-gray-50 rounded-xl font-bold text-lg">
                                        Profile
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Accessibility Button */}
                        <button
                            onClick={() => { setIsA11yModalOpen(true); setIsMobileMenuOpen(false); }}
                            className="w-full p-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2"
                        >
                            <FaUniversalAccess size={20} /> Accessibility Settings
                        </button>

                        {/* Auth Actions */}
                        {user ? (
                            <button
                                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                className="w-full p-4 bg-red-50 text-red-600 rounded-xl font-black flex items-center justify-center gap-2"
                            >
                                <FaSignOutAlt size={20} /> Logout
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="block w-full p-4 bg-gray-100 text-primary rounded-xl font-black text-center">
                                    Login
                                </Link>
                                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)} className="block w-full p-4 bg-accent text-white rounded-xl font-black text-center">
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <AccessibilityModal isOpen={isA11yModalOpen} onClose={() => setIsA11yModalOpen(false)} />
        </header>
    );
};

export default Navbar;
