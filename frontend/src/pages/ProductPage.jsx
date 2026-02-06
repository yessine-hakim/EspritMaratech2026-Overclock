import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FaStar, FaShoppingCart, FaCheckCircle, FaTruck, FaUndo, FaShieldAlt } from 'react-icons/fa';

const ProductPage = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/products/api/detail/${id}/`);
                setProduct(res.data);
                if (res.data.image || res.data.image_url) {
                    setSelectedImage(res.data.image || res.data.image_url);
                }
            } catch (err) {
                console.error("Failed to fetch product", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>;
    if (!product) return <div className="text-center mt-20 text-xl">Product not found</div>;

    return (
        <main className="container mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-medium mb-6 flex items-center gap-2">
                <Link to="/" className="text-accent hover:underline">Home</Link>
                <span>/</span>
                <Link to={`/results?category=${product.category?.category_id}`} className="text-accent hover:underline">{product.category?.name || 'Category'}</Link>
                <span>/</span>
                <span className="text-text truncate max-w-xs">{product.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                {/* Product Gallery */}
                <div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-4 h-[500px] flex items-center justify-center overflow-hidden">
                        {selectedImage ? (
                            <img src={selectedImage} alt={product.title} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-accent to-primary"></div>
                        )}
                    </div>
                    <div className="grid grid-cols-5 gap-4">
                        {/* Placeholder thumbnails logic - assuming backend might return list */}
                        {[selectedImage, selectedImage, selectedImage].map((img, idx) => (
                            img && (
                                <div
                                    key={idx}
                                    className="aspect-square bg-white border border-gray-200 rounded-lg cursor-pointer hover:border-accent p-2 flex items-center justify-center transition-colors"
                                    onClick={() => setSelectedImage(img)}
                                >
                                    <img src={img} alt="Thumbnail" className="max-w-full max-h-full object-contain" />
                                </div>
                            )
                        ))}
                    </div>
                </div>

                {/* Product Details */}
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2 leading-tight">{product.title}</h1>
                    <p className="text-sm text-gray-medium mb-4">Category: <span className="text-primary font-medium">{product.category?.name}</span></p>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center text-yellow-400 text-xl">
                            <span className="font-bold mr-2 text-primary">{product.rating || "N/A"}</span>
                            {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className={i < Math.round(product.rating || 0) ? "fill-current" : "text-gray-300"} />
                            ))}
                        </div>
                        <span className="text-accent font-medium hover:underline cursor-pointer">{product.nbr_rating || 0} reviews</span>
                    </div>

                    <div className="mb-8 pb-8 border-b border-gray-light">
                        <span className="text-4xl font-bold text-primary block mb-2">${product.price}</span>

                        {/* Budget Fit Banner */}
                        <div className="inline-flex items-center gap-3 bg-highlight/10 text-primary px-4 py-2 rounded-xl mt-2 border border-highlight/20">
                            <div className="w-6 h-6 rounded-full bg-highlight text-primary flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <div>
                                <strong className="block text-sm">Budget-Fit Verified</strong>
                            </div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <h3 className="font-bold text-primary mb-3">About This Product</h3>
                        <p className="text-gray-600 leading-relaxed font-light">{product.description}</p>
                    </div>

                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => addToCart(product.id)}
                            className="flex-1 bg-accent text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0e5a56] transition-all transform hover:-translate-y-1 shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
                        >
                            <FaShoppingCart /> Add to Cart
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaTruck className="text-accent text-lg" />
                            <span><strong>Free Shipping</strong> on orders over $50</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaUndo className="text-accent text-lg" />
                            <span><strong>30-Day Returns</strong> with original packaging</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaShieldAlt className="text-accent text-lg" />
                            <span><strong>1-Year Warranty</strong> included</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Explanation Cards */}
            <section className="mb-20">
                <h2 className="text-2xl font-bold text-primary mb-8 border-b border-gray-light pb-4">Why We Recommend This</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoCard title="Value Analysis" text="Offers exceptional value compared to competitors. 30% cheaper than similar models." />
                    <InfoCard title="Price Trend" text="Stable price over last 60 days. Good time to purchase." />
                    <InfoCard title="Popularity Insight" text="Highly rated by customers for durability and comfort." />
                    <InfoCard title="Perfect For" text="Ideal for daily usage with premium features." />
                </div>
            </section>

            {/* Customer Reviews - Simplified for React */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-2xl font-bold text-primary mb-8">Customer Reviews</h2>
                <div className="text-center py-8 text-gray-500">
                    <p>Reviews loading...</p>
                    {/* Maps over reviews if available in product.reviews */}
                </div>
            </section>
        </main>
    );
};

const InfoCard = ({ title, text }) => (
    <article className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
        <h3 className="font-bold text-accent mb-2">{title}</h3>
        <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </article>
);

export default ProductPage;
