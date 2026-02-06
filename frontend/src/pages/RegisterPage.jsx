import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return;
        }
        try {
            await register(formData.username, formData.email, formData.password);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        }
    };

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-background py-16">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-gray-100">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-primary mb-2">Create Account</h2>
                    <p className="text-gray-medium">Join Pay4All for smarter shopping</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Username</label>
                        <input
                            type="text"
                            name="username"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Choose a username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Password</label>
                        <input
                            type="password"
                            name="password"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-primary mb-2">Confirm Password</label>
                        <input
                            type="password"
                            name="confirmPassword"
                            className="w-full px-4 py-3 rounded-lg border border-gray-light bg-gray-50 focus:bg-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-colors"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 bg-accent text-white rounded-xl font-bold hover:bg-[#0e5a56] transition-all transform hover:-translate-y-1 shadow-lg shadow-accent/20 mt-2"
                    >
                        Sign Up
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent font-semibold hover:underline">
                        Login here
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
