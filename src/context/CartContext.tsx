'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '@/lib/products';

async function generateAISuggestion(product: Product, currentCart: CartItem[]): Promise<void> {
    try {
        const cartInfo = currentCart.length > 0 
            ? `Current cart: ${currentCart.map(i => i.product.name).join(', ')}. ` 
            : '';
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `${cartInfo}User just added "${product.name}" (${product.category}, $${product.price}) to cart. Suggest 1-2 complementary products from our catalog in one short sentence (max 25 words).`,
                history: []
            })
        });
        
        const data = await response.json();
        console.log('AI Suggestion Response:', data);
        if (data.message) {
            window.dispatchEvent(new CustomEvent('ai-suggestion', { 
                detail: { suggestion: data.message } 
            }));
        }
    } catch (error) {
        console.error('Failed to generate AI suggestion:', error);
    }
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
            
            // Trigger AI suggestion (disabled due to quota limits)
            // setTimeout(() => {
            //     generateAISuggestion(product, prev);
            // }, 500);
            
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
