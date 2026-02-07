import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FaStar, FaShoppingCart, FaCheckCircle, FaTruck, FaUndo, FaShieldAlt, FaUserCircle } from 'react-icons/fa';

const ProductPage = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(null);
    const [reviews, setReviews] = useState([]);

    // Review Form State
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/products/api/detail/${id}/`);
                setProduct(res.data);
                setReviews(res.data.reviews || []);
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

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        setSubmittingReview(true);
        try {
            // Post to the review endpoint
            await api.post(`/api/products/api/review/${id}/`, {
                rating,
                comment
            });

            // Optimistically update or refetch
            // For simplicity, let's just create a temp review object to show immediately
            const newReview = {
                id: Date.now(), // temp id
                user: user, // current user
                rating: parseInt(rating),
                comment: comment,
                created_at: new Date().toISOString()
            };
            setReviews([newReview, ...reviews]);
            setComment('');
            setRating(5);
            alert("Review submitted successfully!");
        } catch (error) {
            console.error("Review submission failed", error);
            alert("Failed to submit review. Please try again.");
        } finally {
            setSubmittingReview(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div></div>;
    if (!product) return <div className="text-center mt-20 text-xl">Product not found</div>;

    return (
        <main className="container mx-auto px-4 py-8" id="main-content">
            {/* Breadcrumb */}
            <nav className="text-sm text-gray-medium mb-6 flex items-center gap-2" aria-label="Breadcrumb">
                <ol className="flex items-center gap-2 p-0 m-0 list-none">
                    <li><Link to="/" className="text-accent hover:underline">Home</Link></li>
                    <li aria-hidden="true">/</li>
                    <li><Link to={`/results?category=${product.category?.id}`} className="text-accent hover:underline">{product.category?.name || 'Category'}</Link></li>
                    <li aria-hidden="true">/</li>
                    <li aria-current="page" className="text-text truncate max-w-xs">{product.title}</li>
                </ol>
            </nav>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
                {/* Product Gallery Section */}
                <section aria-label="Product Images">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-4 h-[500px] flex items-center justify-center overflow-hidden">
                        {selectedImage ? (
                            <img src={selectedImage} alt={`Main view of ${product.title}`} className="max-w-full max-h-full object-contain" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-accent to-primary" aria-hidden="true"></div>
                        )}
                    </div>
                    <div className="grid grid-cols-5 gap-4" role="list" aria-label="Product thumbnails">
                        {[selectedImage, selectedImage, selectedImage].map((img, idx) => (
                            img && (
                                <button
                                    key={idx}
                                    className={`aspect-square bg-white border ${selectedImage === img ? 'border-accent ring-2 ring-accent/20' : 'border-gray-200'} rounded-lg cursor-pointer hover:border-accent p-2 flex items-center justify-center transition-colors`}
                                    onClick={() => setSelectedImage(img)}
                                    aria-label={`View thumbnail ${idx + 1}`}
                                    aria-pressed={selectedImage === img}
                                    role="listitem"
                                >
                                    <img src={img} alt="" className="max-w-full max-h-full object-contain" aria-hidden="true" />
                                </button>
                            )
                        ))}
                    </div>
                </section>

                {/* Product Details Section */}
                <section aria-label="Product details">
                    <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2 leading-tight">{product.title}</h1>
                    <p className="text-sm text-gray-medium mb-4">Category: <span className="text-primary font-medium">{product.category?.name}</span></p>

                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center text-yellow-400 text-xl" aria-label={`Average rating: ${product.rating || "No ratings yet"} out of 5 stars`}>
                            <span className="font-bold mr-2 text-primary" aria-hidden="true">{product.rating || "N/A"}</span>
                            {[...Array(5)].map((_, i) => (
                                <FaStar key={i} className={i < Math.round(product.rating || 0) ? "fill-current" : "text-gray-300"} aria-hidden="true" />
                            ))}
                        </div>
                        <a href="#reviews" className="text-accent font-medium hover:underline cursor-pointer">{reviews.length} reviews</a>
                    </div>

                    <div className="mb-8 pb-8 border-b border-gray-light">
                        <span className="text-4xl font-bold text-primary block mb-2" aria-label={`Price: ${product.price}`}>${product.price}</span>

                        <div className="inline-flex items-center gap-3 bg-highlight/10 text-primary px-4 py-2 rounded-xl mt-2 border border-highlight/20" aria-label="Budget-Fit Verified">
                            <div className="w-6 h-6 rounded-full bg-highlight text-primary flex items-center justify-center" aria-hidden="true">
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
                            aria-label={`Add ${product.title} to cart`}
                        >
                            <FaShoppingCart aria-hidden="true" /> Add to Cart
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-6 space-y-3" role="complementary" aria-label="Shipping and returns information">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaTruck className="text-accent text-lg" aria-hidden="true" />
                            <span><strong>Free Shipping</strong> on orders over $50</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaUndo className="text-accent text-lg" aria-hidden="true" />
                            <span><strong>30-Day Returns</strong> with original packaging</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <FaShieldAlt className="text-accent text-lg" aria-hidden="true" />
                            <span><strong>1-Year Warranty</strong> included</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* Explanation Cards */}
            <section className="mb-20" aria-labelledby="recommendation-header">
                <h2 id="recommendation-header" className="text-2xl font-bold text-primary mb-8 border-b border-gray-light pb-4">Why We Recommend This</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <InfoCard title="Value Analysis" text="Offers exceptional value compared to competitors. 30% cheaper than similar models." />
                    <InfoCard title="Price Trend" text="Stable price over last 60 days. Good time to purchase." />
                    <InfoCard title="Popularity Insight" text="Highly rated by customers for durability and comfort." />
                    <InfoCard title="Perfect For" text="Ideal for daily usage with premium features." />
                </div>
            </section>

            {/* Customer Reviews Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8" id="reviews" aria-labelledby="reviews-header">
                <div className="flex items-center justify-between mb-8">
                    <h2 id="reviews-header" className="text-2xl font-bold text-primary">Customer Reviews</h2>
                    <span className="text-gray-500" aria-live="polite">{reviews.length} reviews</span>
                </div>

                {/* Review Form */}
                {user ? (
                    <div className="mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100" role="form" aria-labelledby="write-review-title">
                        <h3 id="write-review-title" className="font-bold text-lg mb-4">Write a Review</h3>
                        <form onSubmit={handleReviewSubmit}>
                            <div className="mb-4">
                                <label id="rating-label" className="block text-sm font-semibold mb-2">Rating</label>
                                <div className="flex gap-2" role="radiogroup" aria-labelledby="rating-label">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className={`text-2xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                                            aria-checked={rating === star}
                                            role="radio"
                                        >
                                            <FaStar aria-hidden="true" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label htmlFor="review-comment" className="block text-sm font-semibold mb-2">Comment</label>
                                <textarea
                                    id="review-comment"
                                    className="w-full p-3 rounded border border-gray-300 focus:outline-none focus:border-accent"
                                    rows="3"
                                    placeholder="Share your thoughts..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    required
                                    aria-required="true"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={submittingReview}
                                className="bg-primary text-white px-6 py-2 rounded-lg font-semibold hover:bg-opacity-90 disabled:opacity-50"
                                aria-live="polite"
                            >
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="mb-10 p-4 bg-gray-50 rounded text-center">
                        <Link to="/login" className="text-accent underline font-semibold">Log in</Link> to write a review.
                    </div>
                )}

                {/* Reviews List */}
                <div className="space-y-6" role="list" aria-label="Customer reviews list">
                    {reviews.length > 0 ? (
                        reviews.map((review) => (
                            <article key={review.id} className="border-b border-gray-light pb-6 last:border-0" role="listitem">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500" aria-hidden="true">
                                            <FaUserCircle size={20} />
                                        </div>
                                        <span className="font-semibold text-primary">{review.user?.first_name || review.user?.username || 'User'}</span>
                                    </div>
                                    <time className="text-sm text-gray-400" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
                                </div>
                                <div className="flex text-yellow-400 text-sm mb-2" aria-label={`Rated ${review.rating} out of 5 stars`}>
                                    {[...Array(5)].map((_, i) => (
                                        <FaStar key={i} className={i < review.rating ? "fill-current" : "text-gray-300"} aria-hidden="true" />
                                    ))}
                                </div>
                                <p className="text-gray-600 leading-relaxed">{review.comment}</p>
                            </article>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-4" aria-live="polite">No reviews yet. Be the first to share your experience!</p>
                    )}
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
