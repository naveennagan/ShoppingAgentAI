'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/lib/products';

function generateSuggestion(product: Product, currentCart: CartItem[]): string | null {
    // Laptop suggestions
    if (product.category === 'Electronics' && product.name.includes('Laptop')) {
        return "Great choice! Consider adding a Mechanical Gaming Keyboard ($129.99) and Precision Wireless Mouse ($79.99) to complete your setup.";
    }
    
    // Phone suggestions
    if (product.id === 'ph-1') {
        return "Nice! Add the Ultra Smart Fitness Watch and get $50 off! Perfect combo for staying connected.";
    }
    
    // Desk suggestions
    if (product.id === 'fur-2') {
        return "Perfect! Add the Ergonomic Mesh Chair and get 20% off as part of our Work From Home Bundle!";
    }
    
    // Headphones suggestions
    if (product.id === '1') {
        return "Excellent choice! Enjoy 10% off as part of our Audiophile Starter deal.";
    }
    
    return null;
}

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
            
            // Trigger AI suggestion
            setTimeout(() => {
                const suggestion = generateSuggestion(product, prev);
                if (suggestion) {
                    window.dispatchEvent(new CustomEvent('ai-suggestion', { detail: { suggestion } }));
                }
            }, 500);
            
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
