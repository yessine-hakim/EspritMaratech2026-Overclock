import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaSearch } from 'react-icons/fa';
import api from '../api';

const HomePage = () => {
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedImage(e.target.files[0]);
        }
    };

    const handleVisualSearch = async () => {
        if (!selectedImage) return;

        const formData = new FormData();
        formData.append('image', selectedImage);
        setLoading(true);

        try {
            const response = await api.post('/api/products/api/visual-search/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            // Redirect to results with visual_ids or pass data state
            // Ideally backend returns list, we can pass to state or use query param if backend supported visual_ids
            // Backend currently redirects or returns JSON depending on how we called it?
            // Wait, standard form post redirects. API post returns JSON.
            // My API view returns JSON list of products.
            // So I should navigate to /results with state.
            navigate('/results', { state: { products: response.data, visualSearch: true } });
        } catch (error) {
            console.error("Visual search failed", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto mt-10 p-4 text-center">
            <h1 className="text-4xl font-bold mb-6">Welcome to Pay4All</h1>
            <p className="text-xl mb-8">Inclusive voice-driven shopping experience.</p>

            <div className="max-w-xl mx-auto bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-semibold mb-4 flex items-center justify-center">
                    <FaCamera className="mr-2" /> Visual Search
                </h2>
                <div className="mb-4 text-left">
                    <label className="block mb-2 text-sm font-medium text-gray-900">Upload an image to find similar products</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                    />
                </div>
                <button
                    onClick={handleVisualSearch}
                    disabled={!selectedImage || loading}
                    className={`w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center ${!selectedImage || loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {loading ? 'Processing...' : 'Search with Image'}
                </button>
            </div>
        </div>
    );
};

export default HomePage;
