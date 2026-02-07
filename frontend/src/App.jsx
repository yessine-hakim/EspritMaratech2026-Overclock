import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { A11yProvider } from './context/A11yContext';
import { VoiceAgentProvider } from './components/VoiceAgentProvider';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';
import RouteAnnouncer from './components/RouteAnnouncer';
import AccessibilityModal from './components/AccessibilityModal';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductPage from './pages/ProductPage';
import ResultsPage from './pages/ResultsPage';
import CartPage from './pages/CartPage';
import BankingPage from './pages/BankingPage';
import ProfilePage from './pages/ProfilePage';

function App() {
    return (
        <Router>
            <A11yProvider>
                <AuthProvider>
                    <CartProvider>
                        <VoiceAgentProvider>
                            <div className="min-h-screen flex flex-col font-sans bg-background text-text">
                                <Navbar />
                                <div className="flex-1 w-full">
                                    <Routes>
                                        <Route path="/" element={<HomePage />} />
                                        <Route path="/login" element={<LoginPage />} />
                                        <Route path="/register" element={<RegisterPage />} />
                                        <Route path="/product/:id" element={<ProductPage />} />
                                        <Route path="/results" element={<ResultsPage />} />
                                        <Route path="/cart" element={<CartPage />} />
                                        <Route path="/banking" element={<BankingPage />} />
                                        <Route path="/profile" element={<ProfilePage />} />
                                    </Routes>
                                </div>
                                <Footer />
                                <Chatbot />
                                <RouteAnnouncer />
                            </div>
                        </VoiceAgentProvider>
                    </CartProvider>
                </AuthProvider>
            </A11yProvider>
        </Router>
    );
}

export default App;
