import React, { useEffect, useState } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import api from '../api';
import ProductCard from '../components/ProductCard';

const ResultsPage = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const q = searchParams.get('q');

    // Initial state from navigation (visual search) or empty
    const [products, setProducts] = useState(location.state?.products || []);
    const [loading, setLoading] = useState(!location.state?.products);
    const [explanation, setExplanation] = useState('');

    useEffect(() => {
        if (!location.state?.products && (q || location.search)) {
            setLoading(true);
            const fetchResults = async () => {
                try {
                    const res = await api.get(`/api/products/api/results/${location.search}`);
                    setProducts(res.data.results);
                    setExplanation(res.data.explanation);
                } catch (err) {
                    console.error("Search failed", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchResults();
        }
    }, [q, location.search, location.state]);

    return (
        <div className="container mx-auto mt-6 px-4">
            <h1 className="text-2xl font-bold mb-4">Search Results {q ? `for "${q}"` : ''}</h1>

            {explanation && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                    <p className="font-bold">Recommendation Insights:</p>
                    <p>{explanation}</p>
                </div>
            )}

            {loading ? (
                <div>Loading results...</div>
            ) : products.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {products.map(p => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-10">No products found.</div>
            )}
        </div>
    );
};

export default ResultsPage;
