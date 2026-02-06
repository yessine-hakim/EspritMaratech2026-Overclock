import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState(null);

    const fetchCart = async () => {
        if (!user) {
            setCart(null);
            return;
        }
        try {
            const response = await api.get('/api/cart/api/');
            setCart(response.data);
        } catch (error) {
            console.error("Failed to fetch cart", error);
        }
    };

    useEffect(() => {
        fetchCart();
    }, [user]);

    const addToCart = async (productId) => {
        try {
            const response = await api.post(`/api/cart/api/add/${productId}/`);
            setCart(response.data);
            return true;
        } catch (error) {
            console.error("Add to cart failed", error);
            return false;
        }
    };

    const updateItem = async (itemId, action) => {
        try {
            const response = await api.patch(`/api/cart/api/item/${itemId}/`, { action });
            setCart(response.data);
        } catch (error) {
            console.error("Update item failed", error);
        }
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, updateItem, fetchCart }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
