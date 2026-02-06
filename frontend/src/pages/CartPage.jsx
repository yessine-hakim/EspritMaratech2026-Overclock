import React from 'react';
import { useCart } from '../context/CartContext';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';

const CartPage = () => {
    const { cart, updateItem } = useCart();

    if (!cart || cart.items.length === 0) {
        return <div className="text-center mt-10 text-xl text-gray-600">Your cart is empty</div>;
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow rounded-lg">
            <h1 className="text-2xl font-bold mb-6 border-b pb-4">Shopping Cart ({cart.total_items} items)</h1>

            <div className="space-y-6">
                {cart.items.map(item => (
                    <div key={item.id} className="flex justify-between items-center border-b pb-4" role="listitem">
                        <div className="flex items-center space-x-4">
                            <img
                                src={item.product.image_url || "https://via.placeholder.com/80"}
                                alt={item.product.title}
                                className="w-20 h-20 object-contain rounded"
                            />
                            <div>
                                <h3 className="font-semibold text-lg">{item.product.title}</h3>
                                <p className="text-gray-500">{item.product.price}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-6">
                            <div className="flex items-center border rounded">
                                <button
                                    onClick={() => updateItem(item.id, 'decrease')}
                                    className="p-2 hover:bg-gray-100" aria-label="Decrease quantity"
                                ><FaMinus size={12} /></button>
                                <span className="px-4 font-medium">{item.quantity}</span>
                                <button
                                    onClick={() => updateItem(item.id, 'increase')}
                                    className="p-2 hover:bg-gray-100" aria-label="Increase quantity"
                                ><FaPlus size={12} /></button>
                            </div>
                            <div className="text-right w-24">
                                <p className="font-bold text-lg">${item.total_price.toFixed(2)}</p>
                            </div>
                            <button
                                onClick={() => updateItem(item.id, 'remove')}
                                className="text-red-500 hover:text-red-700" aria-label="Remove item"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-between items-center bg-gray-50 p-6 rounded">
                <span className="text-2xl font-semibold">Total:</span>
                <span className="text-2xl font-bold text-green-700">${cart.total_price.toFixed(2)}</span>
            </div>

            <button className="w-full bg-blue-600 text-white text-xl py-3 rounded mt-6 hover:bg-blue-700 font-bold">
                Proceed to Checkout
            </button>
        </div>
    );
};

export default CartPage;
