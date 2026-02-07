import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';
import { FaFilter, FaStar } from 'react-icons/fa';

const ResultsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const q = searchParams.get('q');
    const categoryId = searchParams.get('category');

    const [products, setProducts] = useState(location.state?.products || []);
    const [loading, setLoading] = useState(!location.state?.products);
    const [explanation, setExplanation] = useState('');
    const [categories, setCategories] = useState([]);
    const [selectedCategories, setSelectedCategories] = useState(categoryId ? [categoryId] : []);

    // Fetch categories for sidebar
    useEffect(() => {
        // Mock categories or fetch from API if available
        // For now hardcoding to match HomePage logic until API endpoint exists
        setCategories([
            { id: 1, name: 'Electronics', count: 120 },
            { id: 2, name: 'Home & Garden', count: 85 },
            { id: 3, name: 'Beauty & Health', count: 45 },
            { id: 4, name: 'Toys & Games', count: 30 },
        ]);
    }, []);

    useEffect(() => {
        // If we have state from visual search, use it
        if (location.state?.products) {
            setProducts(location.state.products);
            setLoading(false);
            return;
        }

        // Otherwise fetch from API
        const fetchResults = async () => {
            setLoading(true);
            try {
                // Construct query string
                const params = new URLSearchParams(location.search);
                const res = await api.get(`/api/products/api/results/?${params.toString()}`);
                setProducts(res.data.results);
                setExplanation(res.data.explanation);

                // If backend returns facets, update categories here
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [location.search, location.state]);

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        let newCats;
        if (e.target.checked) {
            newCats = [...selectedCategories, value];
        } else {
            newCats = selectedCategories.filter(c => c !== value);
        }
        setSelectedCategories(newCats);

        // Update URL params
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('category');
        newCats.forEach(c => newParams.append('category', c));
        setSearchParams(newParams);
    };

    return (
        <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            {/* Filters Sidebar */}
            <aside className="bg-white p-6 rounded-xl shadow-sm h-fit sticky top-24" aria-label="Search Filters">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-light">
                    <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                        <FaFilter size={16} className="text-accent" aria-hidden="true" /> Filters
                    </h3>
                </div>

                <div className="mb-8" role="group" aria-labelledby="filter-category-title">
                    <h4 id="filter-category-title" className="font-semibold text-primary mb-4">Category</h4>
                    <div className="space-y-3">
                        {categories.map(cat => (
                            <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    value={cat.id}
                                    checked={selectedCategories.includes(String(cat.id))}
                                    onChange={handleCategoryChange}
                                    className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent"
                                    aria-label={`Filter by ${cat.name}`}
                                />
                                <span className="text-gray-600 group-hover:text-accent transition-colors" aria-hidden="true">{cat.name}</span>
                                <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{cat.count}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="mb-8" role="group" aria-labelledby="filter-rating-title">
                    <h4 id="filter-rating-title" className="font-semibold text-primary mb-4">Rating</h4>
                    <div className="space-y-3">
                        {[5, 4, 3].map(rating => (
                            <label key={rating} className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-accent focus:ring-accent" aria-label={`Filter by ${rating} stars and up`} />
                                <div className="flex items-center text-yellow-400 text-sm" aria-hidden="true">
                                    {[...Array(5)].map((_, i) => (
                                        <FaStar key={i} className={i < rating ? "fill-current" : "text-gray-300"} />
                                    ))}
                                    <span className="ml-2 text-gray-600 group-hover:text-accent">& Up</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <button className="w-full py-3 bg-accent text-white rounded-lg font-semibold hover:bg-[#0e5a56] transition-colors">
                    Apply Filters
                </button>
            </aside>

            {/* Results Content */}
            <section aria-labelledby="results-main-title">
                {/* Smart Banner */}
                {explanation && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 relative overflow-hidden" role="status" aria-live="polite">
                        <div className="relative z-10">
                            <strong className="block text-blue-900 text-lg mb-1">Smart Results</strong>
                            <p className="text-blue-800/80 italic">{explanation}</p>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100 rounded-full translate-x-10 -translate-y-10 blur-xl" aria-hidden="true"></div>
                    </div>
                )}

                <div className="mb-8">
                    <h2 id="results-main-title" className="text-3xl font-bold text-primary mb-2">
                        {q ? `Results for "${q}"` : categoryId ? 'Category Search' : 'All Products'}
                    </h2>
                    <p className="text-gray-medium" aria-live="polite">Showing {products.length} results</p>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64" role="status" aria-label="Loading products">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
                        <span className="sr-only">Loading...</span>
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                        {products.map(p => (
                            <ProductCard key={p.id} product={p} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-xl text-gray-500">No products found matching your criteria.</p>
                        <button
                            onClick={() => setSearchParams({})}
                            className="mt-4 text-accent hover:underline font-medium"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}

                {/* Pagination - Placeholder */}
                <div className="mt-12 flex justify-center gap-4 pt-8 border-t border-gray-light">
                    <button className="px-6 py-2 border border-gray-300 rounded-lg bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                    <span className="flex items-center font-semibold text-primary">Page 1 of 1</span>
                    <button className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-[#0e5a56] disabled:bg-gray-300">Next</button>
                </div>
            </section>
        </main>
    );
};

export default ResultsPage;
