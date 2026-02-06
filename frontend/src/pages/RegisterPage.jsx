import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        monthly_budget: '',
        currency: 'USD'
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await register(formData);
            navigate('/');
        } catch (err) {
            setError('Registration failed. Please check inputs.');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow-md">
            <h2 className="text-2xl font-bold mb-4">Register</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    name="email" type="email" placeholder="Email" required
                    className="w-full border p-2 rounded" onChange={handleChange}
                />
                <input
                    name="password" type="password" placeholder="Password" required
                    className="w-full border p-2 rounded" onChange={handleChange}
                />
                <div className="flex gap-4">
                    <input
                        name="first_name" placeholder="First Name"
                        className="w-1/2 border p-2 rounded" onChange={handleChange}
                    />
                    <input
                        name="last_name" placeholder="Last Name"
                        className="w-1/2 border p-2 rounded" onChange={handleChange}
                    />
                </div>
                <input
                    name="monthly_budget" type="number" placeholder="Monthly Budget"
                    className="w-full border p-2 rounded" onChange={handleChange}
                />
                <button type="submit" className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700">
                    Register
                </button>
            </form>
        </div>
    );
};

export default RegisterPage;
