import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { FaWallet, FaExchangeAlt, FaHistory, FaArrowUp, FaArrowDown, FaTimes } from 'react-icons/fa';

const BankingPage = () => {
    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferData, setTransferData] = useState({ recipient_iban: '', amount: '', description: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { user } = useAuth();

    const fetchBankingData = async () => {
        try {
            const balanceRes = await api.get('/api/banking/balance/');
            setAccount(balanceRes.data);

            const transRes = await api.get('/api/banking/transactions/');
            setTransactions(transRes.data);
        } catch (error) {
            console.error("Error fetching banking data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) fetchBankingData();
    }, [user]);

    const handleTransfer = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/api/banking/transfer/', transferData);
            setSuccess("Transfer successful!");
            setTransferData({ recipient_iban: '', amount: '', description: '' });
            fetchBankingData(); // Refresh balance and transactions
            setTimeout(() => setShowTransferModal(false), 2000);
        } catch (err) {
            setError(err.response?.data?.error || "Transfer failed");
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen bg-neutral-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
            <FaWallet size={48} className="text-accent" />
            <p className="font-bold text-gray-500">Opening your vault...</p>
        </div>
    </div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fadeIn">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
                    <FaWallet className="text-accent" /> My Wallet
                </h1>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 text-right">
                    <p className="text-sm text-gray-500 font-medium">Available Balance</p>
                    <p className="text-4xl font-black text-accent">{account?.balance} <span className="text-xl font-normal text-gray-400">TND</span></p>
                </div>
            </header>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Virtual Card */}
                <div className="bg-gradient-to-br from-accent to-[#0e5a56] p-6 rounded-3xl text-white shadow-xl transform transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                    <div className="flex justify-between items-start mb-12 relative z-10">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                            <FaWallet size={20} />
                        </div>
                        <span className="text-xs font-bold tracking-widest uppercase opacity-80">Pay4All Card</span>
                    </div>
                    <p className="text-xl font-mono mb-2 tracking-widest relative z-10">
                        {account?.iban?.replace(/(.{4})/g, '$1 ')}
                    </p>
                    <div className="flex justify-between items-end relative z-10">
                        <div>
                            <p className="text-[10px] uppercase opacity-70">Card Holder</p>
                            <p className="text-sm font-bold uppercase">{user?.first_name} {user?.last_name}</p>
                        </div>
                        <div className="w-10 h-6 bg-yellow-400/80 rounded-md"></div>
                    </div>
                </div>

                <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center gap-4">
                    <h2 className="text-lg font-bold flex items-center gap-2 text-primary">
                        <FaExchangeAlt className="text-accent" /> Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setShowTransferModal(true)}
                            className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl hover:bg-accent hover:text-white transition-all font-bold group border border-transparent shadow-sm"
                        >
                            <FaArrowUp className="group-hover:translate-y-[-2px] transition-transform" /> Send Money
                        </button>
                        <button className="flex items-center justify-center gap-2 p-4 bg-gray-50 rounded-2xl hover:bg-neutral-100 transition-all font-bold text-gray-400 cursor-not-allowed border border-transparent">
                            <FaArrowDown /> Request Pay
                        </button>
                    </div>
                </div>
            </div>

            <section className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[300px]">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary">
                    <FaHistory className="text-accent" /> Recent Activity
                </h2>
                {transactions.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FaHistory size={32} className="opacity-20" />
                        </div>
                        <p className="text-lg font-medium">No transactions yet.</p>
                        <p className="text-sm">Start shopping to see your history here!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {transactions.map(tx => (
                            <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl ${tx.recipient === account?.iban ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                        {tx.recipient === account?.iban ? <FaArrowDown /> : <FaArrowUp />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-primary">{tx.description || tx.transaction_type}</p>
                                        <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black ${tx.recipient === account?.iban ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {tx.recipient === account?.iban ? '+' : '-'}{tx.amount} <span className="text-xs font-normal">TND</span>
                                    </p>
                                    <p className="text-[10px] text-gray-300 uppercase tracking-tighter">{tx.category}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 relative animate-slideUp">
                        <button onClick={() => setShowTransferModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-rose-500">
                            <FaTimes size={24} />
                        </button>
                        <h3 className="text-2xl font-black text-primary mb-6 flex items-center gap-2">
                            <FaExchangeAlt className="text-accent" /> Transfer Funds
                        </h3>

                        {error && <div className="mb-4 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm font-bold border border-rose-100">{error}</div>}
                        {success && <div className="mb-4 p-4 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-bold border border-emerald-100">{success}</div>}

                        <form onSubmit={handleTransfer} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Recipient IBAN</label>
                                <input
                                    className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-accent focus:bg-white transition-all outline-none font-medium"
                                    placeholder="Enter IBAN (e.g., STORE-PAY4ALL-001)"
                                    value={transferData.recipient_iban}
                                    onChange={(e) => setTransferData({ ...transferData, recipient_iban: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Amount (TND)</label>
                                <input
                                    type="number" step="0.001"
                                    className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-accent focus:bg-white transition-all outline-none font-medium"
                                    placeholder="0.000"
                                    value={transferData.amount}
                                    onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description</label>
                                <input
                                    className="w-full p-4 bg-gray-50 rounded-2xl border border-transparent focus:border-accent focus:bg-white transition-all outline-none font-medium"
                                    placeholder="What is this for?"
                                    value={transferData.description}
                                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                                />
                            </div>
                            <button className="w-full py-5 bg-accent text-white rounded-2xl font-black text-lg shadow-lg shadow-accent/30 hover:shadow-accent/50 transition-all mt-4">
                                Confirm & Send
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankingPage;
