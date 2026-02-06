import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductPage from './pages/ProductPage';
import ResultsPage from './pages/ResultsPage';
import CartPage from './pages/CartPage';

function App() {
    return (
        <Router>
            <AuthProvider>
                <CartProvider>
                    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans">
                        <Navbar />
                        <div className="container mx-auto p-4">
                            <Routes>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/login" element={<LoginPage />} />
                                <Route path="/register" element={<RegisterPage />} />
                                <Route path="/product/:id" element={<ProductPage />} />
                                <Route path="/results" element={<ResultsPage />} />
                                <Route path="/cart" element={<CartPage />} />
                            </Routes>
                        </div>
                    </div>
                </CartProvider>
            </AuthProvider>
        </Router>
    );
}

export default App;
