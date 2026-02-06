import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { FaStar, FaShoppingCart } from 'react-icons/fa';

const ProductPage = () => {
    const { id } = useParams();
    const { addToCart } = useCart();
    const { user } = useAuth();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const res = await api.get(`/api/products/api/detail/${id}/`);
                setProduct(res.data);
            } catch (err) {
                console.error("Failed to fetch product", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div>Loading...</div>;
    if (!product) return <div>Product not found</div>;

    return (
        <div className="max-w-6xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Image Section */}
                <div>
                    <img
                        src={product.image_url || "https://via.placeholder.com/400"}
                        alt={product.title}
                        className="w-full h-96 object-contain rounded-lg border"
                    />
                </div>

                {/* Details Section */}
                <div>
                    <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                    <p className="text-xl text-green-600 font-semibold mb-4">{product.price}</p>
                    <div className="flex items-center mb-4">
                        <FaStar className="text-yellow-400 mr-1" />
                        <span className="font-bold">{product.rating}</span>
                        <span className="text-gray-500 text-sm ml-2">({product.nbr_rating})</span>
                    </div>

                    <p className="text-gray-700 mb-6">{product.description}</p>

                    <button
                        onClick={() => addToCart(product.id)}
                        className="flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
                    >
                        <FaShoppingCart className="mr-2" /> Add to Cart
                    </button>

                    {/* Additional Metadata */}
                    <div className="mt-8 border-t pt-4">
                        <h3 className="font-semibold mb-2">Details</h3>
                        <p className="text-sm text-gray-600">Category: {product.category?.name || 'Uncategorized'}</p>
                    </div>
                </div>
            </div>

            {/* Similar Products */}
            {product.similar_products?.length > 0 && (
                <div className="mt-12">
                    <h2 className="text-2xl font-bold mb-4">You might also like</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {product.similar_products.map((sim) => (
                            <Link to={`/product/${sim.id}`} key={sim.id} className="border p-4 rounded hover:shadow-lg transition">
                                <img src={sim.image_url || "https://via.placeholder.com/150"} alt={sim.title} className="w-full h-32 object-contain mb-2" />
                                <h3 className="font-semibold truncate">{sim.title}</h3>
                                <p className="text-green-600">{sim.price}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductPage;
