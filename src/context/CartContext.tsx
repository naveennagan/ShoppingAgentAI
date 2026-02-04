'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/lib/products';

export interface CartItem {
    product: Product;
    quantity: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
    count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load from local storage on mount (optional, keeping simple for now but good for persistence)
    useEffect(() => {
        const saved = localStorage.getItem('cart');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse cart', e);
            }
        }
        setIsInitialized(true);
    }, []);

    // Save to local storage
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem('cart', JSON.stringify(items));
        }
    }, [items, isInitialized]);

    const addToCart = (product: Product) => {
        setItems(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setItems(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        setItems(prev => prev.map(item =>
            item.product.id === productId ? { ...item, quantity } : item
        ));
    };

    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const count = items.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, total, count }}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
