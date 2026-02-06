import React from 'react';
import { Link } from 'react-router-dom';
import { FaStar, FaShoppingCart } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
    const { addToCart } = useCart();
    const handleAdd = (e) => {
        e.preventDefault();
        addToCart(product.id);
    };

    return (
        <Link to={`/product/${product.id}`} className="block bg-white border rounded shadow hover:shadow-lg transition overflow-hidden">
            <img
                src={product.image || product.image_url || "https://via.placeholder.com/200"}
                alt={product.title}
                className="w-full h-48 object-contain p-2"
            />
            <div className="p-4">
                <h3 className="font-semibold text-lg truncate mb-1" title={product.title}>{product.title}</h3>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-green-600 font-bold">{product.price}</span>
                    <div className="flex items-center text-sm text-gray-500">
                        <FaStar className="text-yellow-400 mr-1" />
                        {product.rating}
                    </div>
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full bg-blue-100 text-blue-700 py-2 rounded hover:bg-blue-200 flex items-center justify-center font-medium"
                >
                    <FaShoppingCart className="mr-2" /> Add
                </button>
            </div>
        </Link>
    );
};

export default ProductCard;
