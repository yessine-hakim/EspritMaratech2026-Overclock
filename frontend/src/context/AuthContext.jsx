import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            // Ensure CSRF cookie is set
            await api.get('/api/users/csrf/');
            const response = await api.get('/api/users/me/');
            setUser(response.data);
        } catch (error) {
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
        return response.data;
    };

    const logout = async () => {
        try {
            await api.post('/api/users/logout/');
            setUser(null);
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    const register = async (userData) => {
        await api.get('/api/users/csrf/');
        const response = await api.post('/api/users/register/', userData);
        setUser(response.data); // Assuming register logs in automatically
        return response.data;
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, register, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
