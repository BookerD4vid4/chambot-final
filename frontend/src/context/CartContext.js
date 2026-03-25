import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getMyCart, addCartItem, updateCartItem, removeCartItem, clearMyCart } from '../api';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [isOpen, setIsOpen] = useState(false);

    // Fetch cart from database when user logs in
    const fetchCart = async () => {
        if (!user) {
            setItems([]);
            return;
        }
        try {
            const res = await getMyCart();
            if (res.data.success && res.data.data) {
                const fetchedItems = res.data.data.items.map(i => ({
                    key: `${i.product_id}-${i.variant_id}`,
                    product_id: i.product_id,
                    product_name: i.product_name,
                    variant_id: i.variant_id,
                    sku: i.sku,
                    price: parseFloat(i.price),
                    image_url: i.image_url,
                    unit: i.unit,
                    quantity: i.quantity,
                    stock_quantity: i.stock_quantity, // available stock for UI cap
                }));
                setItems(fetchedItems);
            }
        } catch (err) {
            console.error("Failed to fetch cart:", err);
        }
    };

    useEffect(() => {
        fetchCart();
        // Since we removed local storage, we just sync with DB on auth change.
        // Also listen for the refresh_cart_trigger from chatbot
        const handleCartRefresh = () => fetchCart();
        window.addEventListener('refresh_cart_trigger', handleCartRefresh);
        return () => window.removeEventListener('refresh_cart_trigger', handleCartRefresh);
    }, [user]);

    const addItem = async (product, variant, quantity = 1, silent = false) => {
        if (!user) {
            toast.error("กรุณาล็อกอินก่อนเพิ่มสินค้าลงตะกร้า");
            return;
        }
        try {
            const res = await addCartItem({ variant_id: variant.variant_id, quantity });
            if (res.data.success) {
                await fetchCart();
                if (!silent) setIsOpen(true);
            }
        } catch (err) {
            toast.error("ไม่สามารถเพิ่มสินค้าลงตะกร้าได้");
            console.error(err);
        }
    };

    const removeItem = async (key) => {
        // key format is `${product_id}-${variant_id}`, extract variant_id
        const variant_id = key.split('-')[1];
        try {
            const res = await removeCartItem(variant_id);
            if (res.data.success) {
                await fetchCart();
            }
        } catch (err) {
            toast.error("ไม่สามารถลบสินค้าได้");
            console.error(err);
        }
    };

    const updateQty = async (key, quantity) => {
        const variant_id = key.split('-')[1];
        if (quantity <= 0) return removeItem(key);
        
        try {
            const res = await updateCartItem({ variant_id, quantity });
            if (res.data.success) {
                await fetchCart();
            }
        } catch (err) {
            toast.error("ไม่สามารถอัปเดตจำนวนสินค้าได้");
            console.error(err);
        }
    };

    const clearCart = async () => {
        if (!user) {
            setItems([]);
            return;
        }
        try {
            const res = await clearMyCart();
            if (res.data.success) {
                setItems([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

    return (
        <CartContext.Provider value={{
            items, addItem, removeItem, updateQty, clearCart, fetchCart,
            totalPrice, totalItems, isOpen, setIsOpen
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
};
