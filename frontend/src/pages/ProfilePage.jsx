import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaWallet, FaCheckCircle, FaSpinner, FaSave, FaCog } from 'react-icons/fa';
import api from '../api';

const ProfilePage = () => {
    const { user, checkAuth } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        monthly_budget: '',
        max_single_purchase: '',
        preferred_price_range_min: '',
        preferred_price_range_max: ''
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showIbanModal, setShowIbanModal] = useState(false);
    const [newIban, setNewIban] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                monthly_budget: user.monthly_budget || '',
                max_single_purchase: user.max_single_purchase || '',
                preferred_price_range_min: user.preferred_price_range_min || '',
                preferred_price_range_max: user.preferred_price_range_max || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.patch('/api/users/update/', formData);
            await checkAuth(); // Refresh global user state
            setSuccess('Profile updated successfully! Your shopping experience is now tailored to your new preferences.');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error("Profile update failed", err);
            setError('Failed to update profile. Please check your inputs.');
        } finally {
            setLoading(false);
        }
    };

    const handleIbanUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/api/users/update-bank-account/', { iban: newIban });
            await checkAuth(); // Refresh user data
            setSuccess(`Bank account updated! New IBAN: ${response.data.iban}`);
            setShowIbanModal(false);
            setNewIban('');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error("IBAN update failed", err);
            setError(err.response?.data?.error || 'Failed to update bank account.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return <div className="text-center py-20">Please log in to view your profile.</div>;

    return (
        <main className="container mx-auto px-4 py-6 md:py-12 max-w-4xl animate-fadeIn">
            <header className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-4xl font-black text-primary mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
                        <FaUser className="text-accent" /> Your Profile
                    </h1>
                    <p className="text-gray-500 text-sm md:text-base">Manage your personal information and personal shopping settings.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <button
                        onClick={() => navigate('/banking')}
                        className="flex items-center gap-2 bg-emerald-500 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all shadow-md active:scale-95 text-sm md:text-base"
                    >
                        <FaWallet /> My Wallet
                    </button>
                    <div className="hidden md:flex items-center gap-2 bg-accent/5 px-4 py-2 rounded-xl text-accent font-bold">
                        <FaCog /> Settings Verified
                    </div>
                </div>
            </header>

            {success && (
                <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 font-bold animate-bounceIn">
                    <FaCheckCircle />
                    {success}
                </div>
            )}

            {error && (
                <div className="mb-8 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 font-bold">
                    <FaCheckCircle className="rotate-45" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Information */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-primary border-b pb-4 flex items-center gap-2">
                        <FaUser size={18} className="text-accent" /> Personal Info
                    </h2>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1" htmlFor="first_name">First Name</label>
                                <input
                                    type="text"
                                    id="first_name"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1" htmlFor="last_name">Last Name</label>
                                <input
                                    type="text"
                                    id="last_name"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium text-primary"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1" htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium text-primary"
                            />
                            <p className="text-[10px] text-gray-400 mt-2 ml-1">Changing your email will update your login username.</p>
                        </div>
                    </div>
                </section>

                {/* Shopping Context */}
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="text-xl font-bold text-primary border-b pb-4 flex items-center gap-2">
                        <FaWallet size={18} className="text-accent" /> Shopping Context
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold uppercase text-gray-400 ml-1">Linked IBAN</label>
                                <button
                                    type="button"
                                    onClick={() => setShowIbanModal(true)}
                                    className="text-xs text-accent font-bold hover:underline"
                                >
                                    Change Account
                                </button>
                            </div>
                            <div className="w-full p-4 bg-gray-100 border-none rounded-2xl text-gray-600 font-mono font-bold flex items-center justify-between">
                                {user?.bank_account?.iban || "No Linked Account"}
                                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md">VERIFIED</span>
                            </div>
                        </div>

                        {/* IBAN Update Modal */}
                        {showIbanModal && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                                    <h3 className="text-xl font-bold text-primary mb-4">Update Bank Account</h3>
                                    <p className="text-sm text-gray-500 mb-4">Enter a new, valid Pay4All IBAN. This will unlink your current account.</p>

                                    <div className="mb-4">
                                        <input
                                            type="text"
                                            value={newIban}
                                            onChange={(e) => setNewIban(e.target.value)}
                                            placeholder="TN1234..."
                                            className="w-full p-3 border border-gray-300 rounded-xl font-mono focus:ring-2 focus:ring-accent outline-none"
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowIbanModal(false)}
                                            className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-100 rounded-lg"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleIbanUpdate}
                                            disabled={loading || !newIban}
                                            className="px-4 py-2 bg-accent text-white font-bold rounded-lg hover:bg-[#0e5a56] disabled:opacity-50"
                                        >
                                            {loading ? 'Updating...' : 'Update IBAN'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1" htmlFor="monthly_budget">Monthly Budget (TND)</label>
                            <input
                                type="number"
                                id="monthly_budget"
                                name="monthly_budget"
                                value={formData.monthly_budget}
                                onChange={handleChange}
                                placeholder="e.g. 1000"
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-black text-accent text-xl"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1" htmlFor="max_single_purchase">Max Single Purchase Limit (TND)</label>
                            <input
                                type="number"
                                id="max_single_purchase"
                                name="max_single_purchase"
                                value={formData.max_single_purchase}
                                onChange={handleChange}
                                placeholder="e.g. 200"
                                className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-bold text-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">Price Range Min</label>
                                <input
                                    type="number"
                                    name="preferred_price_range_min"
                                    value={formData.preferred_price_range_min}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium text-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-gray-400 mb-1 ml-1">Price Range Max</label>
                                <input
                                    type="number"
                                    name="preferred_price_range_max"
                                    value={formData.preferred_price_range_max}
                                    onChange={handleChange}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-accent/20 outline-none transition-all font-medium text-primary"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Submit Toolbar */}
                <div className="md:col-span-2 flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-accent text-white px-10 py-5 rounded-3xl font-black text-xl hover:bg-[#0e5a56] transition-all transform hover:-translate-y-1 shadow-lg shadow-accent/30 disabled:opacity-50 flex items-center gap-3"
                    >
                        {loading ? <><FaSpinner className="animate-spin" /> Updating...</> : <><FaSave /> Save Changes</>}
                    </button>
                </div>
            </form>

            <footer className="mt-20 border-t border-gray-100 pt-8 text-center">
                <p className="text-sm text-gray-400 max-w-lg mx-auto leading-relaxed">
                    By setting your shopping context, our AI models can better filter search results and provide alternatives that truly fit your financial life.
                </p>
            </footer>
        </main>
    );
};

export default ProfilePage;
