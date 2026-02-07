import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { FaTrash, FaPlus, FaMinus, FaCheckCircle, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const CartPage = () => {
    const { cart, updateItem, checkout } = useCart();
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleCheckout = async () => {
        setIsProcessing(true);
        setError('');
        try {
            const result = await checkout();
            setSuccess(`Payment Successful! Order #${result.order_id} has been created.`);
            setTimeout(() => navigate('/banking'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || "An error occurred during checkout. Please check your wallet balance.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (!cart || cart.items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fadeIn">
                <div className="bg-gray-50 p-8 rounded-full mb-6">
                    <FaSpinner size={48} className="text-gray-200" />
                </div>
                <h1 className="text-2xl font-bold text-gray-400">Your cart is empty</h1>
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 text-accent font-bold hover:underline"
                >
                    Continue Shopping
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto mt-10 p-6 space-y-8 animate-fadeIn">
            <header className="flex justify-between items-end border-b pb-6">
                <h1 className="text-3xl font-black text-primary">Shopping Cart</h1>
                <span className="bg-accent/10 text-accent px-4 py-1 rounded-full text-sm font-bold">
                    {cart.total_items} {cart.total_items === 1 ? 'Item' : 'Items'}
                </span>
            </header>

            {error && (
                <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-600 font-bold animate-shake">
                    <FaExclamationCircle />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col items-center gap-3 text-emerald-600 font-bold animate-bounceIn">
                    <FaCheckCircle size={32} />
                    <p className="text-xl">{success}</p>
                    <p className="text-sm font-normal opacity-70">Redirecting to your wallet...</p>
                </div>
            )}

            <div className="space-y-6">
                {!success && cart.items.map(item => (
                    <div key={item.id} className="group bg-white p-4 rounded-2xl border border-gray-100 hover:border-accent/20 transition-all flex justify-between items-center shadow-sm hover:shadow-md">
                        <div className="flex items-center space-x-6">
                            <div className="w-24 h-24 bg-gray-50 rounded-xl p-2 flex items-center justify-center overflow-hidden">
                                <img
                                    src={item.product.image || "https://via.placeholder.com/80"}
                                    alt={item.product.title}
                                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                                />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-primary leading-tight mb-1">{item.product.title}</h3>
                                <p className="text-accent font-black">{item.product.price}</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-8">
                            <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-100">
                                <button
                                    onClick={() => updateItem(item.id, 'decrease')}
                                    disabled={isProcessing}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-rose-500 rounded-lg transition-all text-gray-400"
                                    aria-label="Decrease quantity"
                                ><FaMinus size={12} /></button>
                                <span className="w-12 text-center font-black text-primary">{item.quantity}</span>
                                <button
                                    onClick={() => updateItem(item.id, 'increase')}
                                    disabled={isProcessing}
                                    className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-accent rounded-lg transition-all text-gray-400"
                                    aria-label="Increase quantity"
                                ><FaPlus size={12} /></button>
                            </div>

                            <div className="text-right w-28">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-tighter">Subtotal</p>
                                <p className="font-black text-xl text-primary">{item.total_price.toFixed(2)} <span className="text-xs font-normal">TND</span></p>
                            </div>

                            <button
                                onClick={() => updateItem(item.id, 'remove')}
                                disabled={isProcessing}
                                className="text-gray-300 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
                                aria-label="Remove item"
                            >
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!success && (
                <div className="bg-primary p-8 rounded-3xl text-white shadow-xl space-y-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <span className="text-xl opacity-70">Total Amount</span>
                        <span className="text-4xl font-black">{cart.total_price.toFixed(2)} <span className="text-xl font-normal opacity-50">TND</span></span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={isProcessing}
                        className="w-full bg-accent hover:bg-[#0e5a56] py-5 rounded-2xl font-black text-2xl transition-all shadow-lg hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isProcessing ? (
                            <>
                                <FaSpinner className="animate-spin" /> Verifying Vault...
                            </>
                        ) : (
                            'Pay Now via Wallet'
                        )}
                    </button>
                    <p className="text-center text-[10px] uppercase tracking-widest opacity-40">Secure Encryption Active</p>
                </div>
            )}
        </div>
    );
};

export default CartPage;
