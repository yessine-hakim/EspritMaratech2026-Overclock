import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { useA11y } from './A11yContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const { speak } = useA11y();

    const checkAuth = async () => {
        try {
            // GET /me/ doesn't require CSRF if session cookie is present
            const response = await api.get('/api/users/me/');
            setUser(response.data);
        } catch (error) {
            // User not logged in or session expired
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const login = async (username, password) => {
        await api.get('/api/users/csrf/'); // Ensure CSRF before login
        const response = await api.post('/api/users/login/', { username, password });
        setUser(response.data);
        speak(`Welcome back, ${response.data.first_name || response.data.username}. You are now logged in.`);
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/api/users/logout/');
            setUser(null);
            speak("You have been logged out successfully.");
        } catch (error) {
            console.error("Logout failed", error);
            speak("Logout failed. Please try again.");
        }
    };

    const register = async (userData) => {
        await api.get('/api/users/csrf/');
        try {
            const response = await api.post('/api/users/register/', userData);
            setUser(response.data);
            speak("Account created successfully. Welcome to Pay4All.");
            return response.data;
        } catch (error) {
            speak("Registration failed. Please check your details.");
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading, checkAuth }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
