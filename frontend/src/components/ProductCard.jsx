import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaStar } from 'react-icons/fa';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
    const { addToCart } = useCart();

    const handleAdd = (e) => {
        e.preventDefault();
        addToCart(product.id);
    };

    // Calculate badge (Budget-Fit is placeholder logic, real would come from API)
    const isBudgetFit = true;

    return (
        <Link to={`/product/${product.id}`} className="block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group border border-transparent hover:border-accent/10">
            <div className="relative h-48 w-full bg-gray-100 overflow-hidden">
                {product.image || product.image_url ? (
                    <img
                        src={product.image || product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white/20">
                        <span className="text-4xl font-bold">Pay4All</span>
                    </div>
                )}

                {isBudgetFit && (
                    <span className="absolute top-3 right-3 bg-highlight text-primary text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Budget-Fit
                    </span>
                )}
            </div>

            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-semibold text-lg text-primary mb-2 line-clamp-2 leading-tight group-hover:text-accent transition-colors" title={product.title}>
                    {product.title}
                </h3>

                <p className="text-sm text-gray-medium mb-4 line-clamp-2 flex-grow">
                    {product.description || "No description available."}
                </p>

                <div className="mt-auto flex items-center justify-between">
                    <div>
                        <span className="block text-2xl font-bold text-accent">${product.price}</span>
                        {product.rating > 0 && (
                            <div className="flex items-center text-xs text-yellow-500 mt-1">
                                <FaStar className="mr-1" />
                                <span className="font-medium text-gray-600">{product.rating}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAdd}
                        className="p-3 rounded-full bg-gray-50 text-accent hover:bg-accent hover:text-white transition-all duration-300 shadow-sm"
                        title="Add to Cart"
                    >
                        <FaShoppingCart size={18} />
                    </button>
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
