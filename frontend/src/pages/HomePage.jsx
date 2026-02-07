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
                const response = await api.get('/products/api/categories/');
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
        <main className="container mx-auto px-4 py-12 md:py-16" id="main-content">
            {/* Hero Section */}
            <section className="bg-gradient-to-br from-primary to-accent rounded-3xl p-8 md:p-16 text-center text-white shadow-xl mb-16 relative overflow-hidden" aria-labelledby="hero-title">
                <div className="relative z-10 max-w-4xl mx-auto">
                    <h2 id="hero-title" className="text-4xl md:text-5xl font-bold mb-6 leading-tight">Discover Products You Can Actually Afford</h2>
                    <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                        Pay4All combines smart search, budget-aware recommendations, and price insights to help you make confident purchasing decisions.
                    </p>

                    <form onSubmit={handleSearch} className="flex gap-4 max-w-2xl mx-auto" role="search" aria-label="Hero Search">
                        <input
                            type="text"
                            placeholder="Search products..."
                            className="flex-1 py-4 px-6 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/60 backdrop-blur-sm focus:outline-none focus:bg-white/20 transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            aria-label="Search for products"
                        />
                        <button type="submit" className="px-8 py-4 bg-highlight text-primary rounded-xl font-bold hover:transform hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                            Search
                        </button>
                    </form>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" aria-hidden="true"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-highlight/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" aria-hidden="true"></div>
            </section>

            {/* Features Section */}
            <section className="mb-20 focus-mode-distraction" aria-labelledby="features-title">
                <h3 id="features-title" className="text-3xl font-bold text-center text-primary mb-12">Why Pay4All?</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <FeatureCard
                        icon={<FaCheckCircle size={28} aria-hidden="true" />}
                        title="Semantic Search"
                        desc="Find exactly what you need with intelligent product understanding"
                    />
                    <FeatureCard
                        icon={<FaWallet size={28} aria-hidden="true" />}
                        title="Budget-Aware"
                        desc="Set your budget once, get recommendations that fit your wallet"
                    />
                    <FeatureCard
                        icon={<FaChartLine size={28} aria-hidden="true" />}
                        title="Price Intelligence"
                        desc="Spot price drops, detect anomalies, and track trends"
                    />
                    <FeatureCard
                        icon={<FaInfoCircle size={28} aria-hidden="true" />}
                        title="Explainable"
                        desc="Understand why we recommend each alternative product"
                    />
                </div>
            </section>

            {/* Categories Section */}
            <section className="mb-20" aria-labelledby="categories-title">
                <h3 id="categories-title" className="text-3xl font-bold text-center text-primary mb-12">Shop by Category</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6" role="list">
                    {categories.map(cat => (
                        <div key={cat.id} role="listitem">
                            <Link
                                to={`/results?category=${cat.id}`}
                                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col items-center border border-transparent hover:border-accent/20 group h-full focus-visible:ring-4 focus-visible:ring-accent/20 outline-none"
                                aria-label={`Shop in ${cat.name} category`}
                            >
                                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4 group-hover:bg-accent group-hover:text-white transition-colors" aria-hidden="true">
                                    {/* Simple placeholder icons logic */}
                                    <div className="w-8 h-8 bg-current rounded-sm opacity-50"></div>
                                </div>
                                <h4 className="font-bold text-primary group-hover:text-accent transition-colors">{cat.name}</h4>
                                <p className="text-sm text-gray-500 mt-1">Explore</p>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="bg-white rounded-3xl p-12 text-center shadow-lg border border-gray-100 focus-mode-distraction" aria-labelledby="cta-title">
                <h3 id="cta-title" className="text-3xl font-bold text-primary mb-4">Ready to shop smarter?</h3>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                    Explore thousands of products with budget-aware recommendations tailored to you.
                </p>
                <Link to="/results" className="inline-block px-10 py-4 bg-highlight text-primary rounded-xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all duration-300 focus-visible:ring-4 focus-visible:ring-highlight/50 outline-none">
                    Browse All Products
                </Link>
            </section>
        </main>
    );
};

const FeatureCard = ({ icon, title, desc }) => (
    <div className="bg-white p-8 rounded-2xl shadow-sm text-center hover:-translate-y-2 hover:shadow-lg transition-all duration-300 border border-transparent hover:border-gray-100">
        <div className="w-16 h-16 mx-auto mb-6 text-accent flex items-center justify-center bg-accent/5 rounded-2xl">
            {icon}
        </div>
        <h4 className="text-xl font-bold text-primary mb-3">{title}</h4>
        <p className="text-gray-600 leading-relaxed">{desc}</p>
    </div>
);

export default HomePage;
