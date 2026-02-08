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
        <div className="max-w-4xl mx-auto mt-6 md:mt-10 p-4 md:p-6 space-y-6 md:space-y-8 animate-fadeIn">
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-2 border-b pb-4 md:pb-6">
                <h1 className="text-2xl md:text-3xl font-black text-primary">Shopping Cart</h1>
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs md:text-sm font-bold self-start md:self-auto">
                    {cart.total_items} {cart.total_items === 1 ? 'Item' : 'Items'}
                </span>
            </header>

            {error && (
                <div className="bg-rose-50 border border-rose-100 p-3 md:p-4 rounded-xl md:rounded-2xl flex items-center gap-3 text-rose-600 font-bold text-sm md:text-base animate-shake">
                    <FaExclamationCircle />
                    {error}
                </div>
            )}

            {success && (
                <div className="bg-emerald-50 border border-emerald-100 p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col items-center gap-3 text-emerald-600 font-bold animate-bounceIn">
                    <FaCheckCircle size={28} />
                    <p className="text-lg md:text-xl text-center">{success}</p>
                    <p className="text-xs md:text-sm font-normal opacity-70">Redirecting to your wallet...</p>
                </div>
            )}

            <div className="space-y-4 md:space-y-6">
                {!success && cart.items.map(item => (
                    <div key={item.id} className="group bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border border-gray-100 hover:border-accent/20 transition-all flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-sm hover:shadow-md">
                        <div className="flex items-center gap-3 md:space-x-6">
                            <div className="w-16 md:w-24 h-16 md:h-24 bg-gray-50 rounded-lg md:rounded-xl p-1 md:p-2 flex items-center justify-center overflow-hidden flex-shrink-0">
                                <img
                                    src={item.product.image || "https://via.placeholder.com/80"}
                                    alt={item.product.title}
                                    className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform"
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-sm md:text-lg text-primary leading-tight mb-1 truncate">{item.product.title}</h3>
                                <p className="text-accent font-black text-sm md:text-base">{item.product.price}</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 md:space-x-8 w-full md:w-auto">
                            <div className="flex items-center bg-gray-50 rounded-lg md:rounded-xl p-1 border border-gray-100">
                                <button
                                    onClick={() => updateItem(item.id, 'decrease')}
                                    disabled={isProcessing}
                                    className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center hover:bg-white hover:text-rose-500 rounded-md md:rounded-lg transition-all text-gray-400"
                                    aria-label="Decrease quantity"
                                ><FaMinus size={10} /></button>
                                <span className="w-8 md:w-12 text-center font-black text-sm md:text-base text-primary">{item.quantity}</span>
                                <button
                                    onClick={() => updateItem(item.id, 'increase')}
                                    disabled={isProcessing}
                                    className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center hover:bg-white hover:text-accent rounded-md md:rounded-lg transition-all text-gray-400"
                                    aria-label="Increase quantity"
                                ><FaPlus size={10} /></button>
                            </div>

                            <div className="text-right">
                                <p className="text-[10px] md:text-xs text-gray-400 uppercase font-bold tracking-tighter">Subtotal</p>
                                <p className="font-black text-base md:text-xl text-primary">{item.total_price.toFixed(2)} <span className="text-[10px] md:text-xs font-normal">TND</span></p>
                            </div>

                            <button
                                onClick={() => updateItem(item.id, 'remove')}
                                disabled={isProcessing}
                                className="text-gray-300 hover:text-rose-500 p-2 rounded-lg md:rounded-xl hover:bg-rose-50 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500"
                                aria-label="Remove item"
                            >
                                <FaTrash size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {!success && (
                <div className="bg-primary p-6 md:p-8 rounded-2xl md:rounded-3xl text-white shadow-xl space-y-4 md:space-y-6">
                    <div className="flex justify-between items-center border-b border-white/10 pb-3 md:pb-4">
                        <span className="text-base md:text-xl opacity-70">Total Amount</span>
                        <span className="text-2xl md:text-4xl font-black">{cart.total_price.toFixed(2)} <span className="text-sm md:text-xl font-normal opacity-50">TND</span></span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={isProcessing}
                        className="w-full bg-accent hover:bg-[#0e5a56] py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-lg md:text-2xl transition-all shadow-lg hover:shadow-accent/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {isProcessing ? (
                            <>
                                <FaSpinner className="animate-spin" /> Verifying Vault...
                            </>
                        ) : (
                            'Pay Now via Wallet'
                        )}
                    </button>
                    <p className="text-center text-[9px] md:text-[10px] uppercase tracking-widest opacity-40">Secure Encryption Active</p>
                </div>
            )}
        </div>
    );
};

export default CartPage;
