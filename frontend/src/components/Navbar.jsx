import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useA11y } from '../context/A11yContext';
import { FaShoppingCart, FaUser, FaSignOutAlt, FaSearch, FaCamera, FaEye, FaTextHeight, FaUniversalAccess } from 'react-icons/fa';
import AccessibilityModal from './AccessibilityModal';
import api from '../api';

const Navbar = () => {
    const { user, logout } = useAuth();
    const { cart } = useCart();
    const { highContrast, fontSize, simplifiedMode } = useA11y();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [isA11yModalOpen, setIsA11yModalOpen] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        // If image is selected, we should ideally handle visual search here or redirect
        // For now, let's just text search if no image logic in this simple navbar
        if (searchTerm.trim()) {
            navigate(`/results?q=${searchTerm}`);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await api.post('/api/products/api/visual-search/', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                navigate('/results', { state: { products: response.data.results, explanation: response.data.explanation } });
            } catch (error) {
                console.error("Visual search failed", error);
                alert("Visual search failed. Please try again.");
            }
        }
    };

    return (
        <header className="bg-white border-b border-gray-light sticky top-0 z-50 shadow-sm" role="banner">
            <nav className="container mx-auto px-4 py-4 flex items-center justify-between gap-8" aria-label="Main Navigation">
                {/* Logo Section */}
                <div className="flex flex-col min-w-[200px]">
                    <Link to="/" className="text-primary hover:text-primary decoration-0" aria-label="Pay4All Home">
                        <h1 className="text-2xl font-bold m-0 leading-tight">Pay4All</h1>
                        <p className="text-xs text-accent font-medium uppercase tracking-wider m-0">Shop Smart, Within Budget</p>
                    </Link>
                </div>

                {/* Search Section */}
                <form onSubmit={handleSearch} className="flex-1 max-w-lg flex items-center gap-2" role="search" aria-label="Product Search">
                    <div className="relative flex-1 flex items-center">
                        <input
                            type="text"
                            placeholder="Search by voice, text, or image..."
                            className="w-full py-3 px-4 border border-gray-light rounded-lg text-text bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search items"
                        />
                        {/* Camera Icon Overlay or Button */}
                        <label htmlFor="nav-image-upload" className="absolute right-3 text-gray-400 hover:text-accent cursor-pointer transition-colors p-1" title="Search by image">
                            <FaCamera size={18} aria-hidden="true" />
                            <span className="sr-only">Upload image for visual search</span>
                        </label>
                        <input
                            type="file"
                            id="nav-image-upload"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <button type="submit" className="bg-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0e5a56] transition-colors">
                        Search
                    </button>
                </form>

                {/* Account & Accessibility Actions */}
                <div className="flex items-center gap-4">
                    {/* A11y Toggle */}
                    <div className="flex items-center gap-2 border-r border-gray-100 pr-4 mr-2">
                        <button
                            onClick={() => setIsA11yModalOpen(true)}
                            className="p-3 bg-gray-50 text-accent rounded-xl hover:bg-accent hover:text-white transition-all shadow-sm"
                            title="Open Accessibility Settings"
                            aria-label="Open Accessibility Settings"
                        >
                            <FaUniversalAccess size={20} aria-hidden="true" />
                        </button>
                    </div>

                    <AccessibilityModal
                        isOpen={isA11yModalOpen}
                        onClose={() => setIsA11yModalOpen(false)}
                    />

                    {user ? (
                        <div className="flex items-center gap-4">
                            <Link to="/cart" className="relative text-gray-medium hover:text-accent transition-colors p-2" aria-label={`View shopping cart, ${cart?.total_items || 0} items`}>
                                <FaShoppingCart size={24} aria-hidden="true" />
                                {cart?.total_items > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#EE4D2D] text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center" aria-hidden="true">
                                        {cart.total_items}
                                    </span>
                                )}
                            </Link>

                            <Link to="/profile" className="h-10 w-10 flex items-center justify-center bg-gray-50 rounded-full text-primary hover:bg-gray-light cursor-pointer" title={`Logged in as ${user.first_name || user.email}`} aria-label="View Profile">
                                <FaUser size={20} aria-hidden="true" />
                            </Link>

                            <button onClick={logout} className="text-gray-medium hover:text-[#ff4757] transition-colors p-2" title="Logout" aria-label="Logout">
                                <FaSignOutAlt size={20} aria-hidden="true" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="px-6 py-3 text-accent border border-accent rounded-lg font-semibold hover:bg-accent-soft transition-colors">
                                Login
                            </Link>
                            <Link to="/register" className="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-[#0e5a56] transition-colors">
                                Register
                            </Link>
                        </div>
                    )}
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
