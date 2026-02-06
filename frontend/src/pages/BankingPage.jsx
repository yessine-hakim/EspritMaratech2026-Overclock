import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FaWallet, FaExchangeAlt, FaHistory, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const BankingPage = () => {
    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        const fetchBankingData = async () => {
            try {
                const balanceRes = await api.get('/api/banking/balance/');
                setAccount(balanceRes.data);

                // For now, let's assume we have a transactions endpoint
                // If not, we can leave it empty or mock it
                // Based on models.py, we have a Transaction model.
                // We might need a TransactionView if not already created.
                // Let's check backend/banking/views.py.
            } catch (error) {
                console.error("Error fetching banking data", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchBankingData();
    }, [user]);

    if (loading) return <div className="flex justify-center items-center h-screen">Loading your vault...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                    <FaWallet className="text-accent" /> My Wallet
                </h1>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-right">
                    <p className="text-sm text-gray-500 font-medium">Available Balance</p>
                    <p className="text-4xl font-black text-accent">{account?.balance} <span className="text-xl font-normal text-gray-400">{account?.currency}</span></p>
                </div>
            </header>

            <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-accent to-[#0e5a56] p-6 rounded-3xl text-white shadow-xl transform hover:scale-105 transition-all">
                    <div className="flex justify-between items-start mb-8">
                        <div className="bg-white/20 p-2 rounded-lg">
                            <FaWallet size={20} />
                        </div>
                        <span className="text-xs font-bold tracking-widest uppercase opacity-80">Pay4All Card</span>
                    </div>
                    <p className="text-xl font-mono mb-1 tracking-widest">{account?.iban?.replace(/(.{4})/g, '$1 ')}</p>
                    <div className="flex justify-between items-end">
                        <div>
                            <p className="text-[10px] uppercase opacity-70">Card Holder</p>
                            <p className="text-sm font-bold uppercase">{user?.email?.split('@')[0]}</p>
                        </div>
                        <div className="w-10 h-6 bg-yellow-400/80 rounded-md"></div>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                        <FaExchangeAlt className="text-accent" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl hover:bg-accent hover:text-white transition-all font-bold group">
                            <FaArrowUp className="group-hover:translate-y-[-2px] transition-transform" /> Send Money
                        </button>
                        <button className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl hover:bg-accent hover:text-white transition-all font-bold group">
                            <FaArrowDown className="group-hover:translate-y-[2px] transition-transform" /> Request Pay
                        </button>
                    </div>
                </div>
            </div>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                    <FaHistory className="text-accent" /> Recent Activity
                </h2>
                {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        <p>No recent transactions yet.</p>
                        <p className="text-sm">Start shopping to see your history here!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Transaction List would go here */}
                    </div>
                )}
            </section>
        </div>
    );
};

export default BankingPage;
