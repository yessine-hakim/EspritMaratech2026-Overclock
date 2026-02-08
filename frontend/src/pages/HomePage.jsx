import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaCamera, FaSearch, FaCheckCircle, FaWallet, FaChartLine, FaInfoCircle } from 'react-icons/fa';
import api from '../api';

const HomePage = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        // Fetch categories from API
        const fetchCategories = async () => {
            try {
                const response = await api.get('/api/products/api/categories/');
                setCategories(response.data);
            } catch (error) {
                console.error('Error fetching categories:', error);
                // Fallback to empty array or placeholder
                setCategories([]);
            }
        };
        fetchCategories();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        navigate(`/results?q=${searchTerm}`);
    };

    return (
        <main className="container mx-auto px-4 md:px-6 py-8 md:py-12 lg:py-20" id="main-content">
            {/* Hero Section - Minimal & Left Aligned */}
            <section className="bg-primary rounded-2xl md:rounded-3xl p-6 md:p-12 lg:p-20 text-white shadow-2xl mb-12 md:mb-20 relative border-2 md:border-4 border-accent/20" aria-labelledby="hero-title">
                <div className="relative z-10 max-w-3xl">
                    <h2 id="hero-title" className="text-3xl md:text-5xl lg:text-7xl font-black mb-4 md:mb-8 leading-tight tracking-tight">Accessible Shopping for Everyone.</h2>
                    <p className="text-base md:text-xl lg:text-2xl text-white/80 mb-6 md:mb-12 font-medium">
                        Pay4All helps you manage your money and shop hands-free with smart voice commands and budget-aware insights.
                    </p>

                    <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row md:gap-6 max-w-2xl" role="search" aria-label="Hero Search">
                        <input
                            type="text"
                            placeholder="Type product name here..."
                            className="flex-1 py-4 md:py-5 px-6 md:px-8 rounded-xl md:rounded-2xl border-2 border-white/20 bg-white/5 text-white placeholder-white/50 focus:outline-none focus:bg-white/10 focus:border-white transition-all font-bold text-base md:text-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search for products"
                        />
                        <button type="submit" className="px-8 md:px-10 py-4 md:py-5 bg-white text-primary rounded-xl md:rounded-2xl font-black text-base md:text-xl hover:bg-accent hover:text-white transition-all shadow-xl">
                            Search Products
                        </button>
                    </form>
                </div>
            </section>

            {/* Features Section - Left Aligned Stack */}
            <section className="mb-12 md:mb-24" aria-labelledby="features-title">
                <h3 id="features-title" className="text-2xl md:text-4xl font-black text-primary mb-8 md:mb-16 border-l-4 md:border-l-8 border-accent pl-4 md:pl-6">Core Assistance Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
                    <FeatureCard
                        icon={<FaCheckCircle size={28} aria-hidden="true" />}
                        title="Semantic Search"
                        desc="Find exactly what you need with intelligent product understanding using text or voice."
                    />
                    <FeatureCard
                        icon={<FaWallet size={28} aria-hidden="true" />}
                        title="Budget Awareness"
                        desc="Set your budget once, get recommendations that fit your financial profile automatically."
                    />
                    <FeatureCard
                        icon={<FaChartLine size={28} aria-hidden="true" />}
                        title="Price Insights"
                        desc="Detailed price trends and anomaly detection to ensure you never overpay."
                    />
                    <FeatureCard
                        icon={<FaInfoCircle size={28} aria-hidden="true" />}
                        title="Hands-Free Mode"
                        desc="Complete voice control for browsing, banking, and shopping without a mouse."
                    />
                </div>
            </section>

            {/* Categories Section */}
            {categories.length > 0 && (
                <section className="mb-12 md:mb-20" aria-labelledby="categories-title">
                    <h3 id="categories-title" className="text-xl md:text-3xl font-bold text-center text-primary mb-6 md:mb-12">Shop by Category</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6" role="list">
                        {categories.map(cat => (
                            <div key={cat.id} role="listitem">
                                <Link
                                    to={`/results?category=${cat.id}`}
                                    className="bg-white p-4 md:p-8 rounded-xl md:rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center border border-transparent hover:border-accent/20 group h-full focus-visible:ring-4 focus-visible:ring-accent/20 outline-none"
                                    aria-label={`Shop in ${cat.name} category`}
                                >
                                    <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-2 md:mb-4 group-hover:bg-accent group-hover:text-white transition-colors" aria-hidden="true">
                                        {/* Simple placeholder icons logic */}
                                        <div className="w-6 md:w-8 h-6 md:h-8 bg-current rounded-sm opacity-50"></div>
                                    </div>
                                    <h4 className="font-bold text-sm md:text-base text-primary group-hover:text-accent transition-colors text-center">{cat.name}</h4>
                                    <p className="text-xs md:text-sm text-gray-500 mt-1">Explore</p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="bg-white rounded-2xl md:rounded-3xl p-6 md:p-12 text-center shadow-lg border border-gray-100 focus-mode-distraction" aria-labelledby="cta-title">
                <h3 id="cta-title" className="text-xl md:text-3xl font-bold text-primary mb-3 md:mb-4">Ready to shop smarter?</h3>
                <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 max-w-2xl mx-auto">
                    Explore thousands of products with budget-aware recommendations tailored to you.
                </p>
                <Link to="/results" className="inline-block px-8 md:px-10 py-3 md:py-4 bg-highlight text-primary rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all duration-300 focus-visible:ring-4 focus-visible:ring-highlight/50 outline-none">
                    Browse All Products
                </Link>
            </section>
        </main>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="bg-white p-6 md:p-10 rounded-2xl md:rounded-3xl shadow-lg border-2 border-transparent hover:border-accent/10 transition-all flex gap-4 md:gap-8 items-start">
        <div className="flex-shrink-0 w-14 md:w-20 h-14 md:h-20 text-accent flex items-center justify-center bg-accent/5 rounded-xl md:rounded-2xl">
            {icon}
        </div>
        <div className="text-left flex-1">
            <h4 className="text-lg md:text-2xl font-black text-primary mb-2 md:mb-3 leading-tight">{title}</h4>
            <p className="text-sm md:text-lg text-gray-medium leading-relaxed font-medium">{desc}</p>
        </div>
    </div>
);

export default HomePage;
