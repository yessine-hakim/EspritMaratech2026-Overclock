import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';
import { useA11y } from './A11yContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState(null);
    const { speak } = useA11y();

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
            speak("Item added to cart successfully.");
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

    const checkout = async () => {
        try {
            const response = await api.post('/api/banking/checkout/');
            await fetchCart();
            speak("Your order has been placed successfully. Payment was processed from your wallet.");
            return response.data;
        } catch (error) {
            console.error("Checkout failed", error);
            throw error;
        }
    };

    return (
        <CartContext.Provider value={{ cart, addToCart, updateItem, fetchCart, checkout }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
