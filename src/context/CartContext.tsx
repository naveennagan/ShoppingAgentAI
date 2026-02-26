'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Promotion, CouponValidationResult } from '@/lib/products';
import { apiClient } from '@/lib/api-client';
import { calculateDiscountedPrice } from '@/lib/discountCalculator';

const SESSION_ID = typeof window !== 'undefined' ? (localStorage.getItem('sessionId') || (() => {
    const id = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('sessionId', id);
    return id;
})()) : 'session_default';

async function generateAISuggestion(product: Product, currentCart: CartItem[]): Promise<void> {
    try {
        const cartInfo = currentCart.length > 0 
            ? `Current cart: ${currentCart.map(i => i.product.name).join(', ')}. ` 
            : '';
        
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: `${cartInfo}User just added "${product.name}" (${product.category}, ${product.price}) to cart. Suggest 1-2 complementary products from our catalog in one short sentence (max 25 words).`,
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

export interface CartItemPromotion {
    discountedPrice: number;
    promotionalLabel: string | null;
    originalPrice: number;
}

export interface CartItem {
    product: Product;
    quantity: number;
    promotion?: CartItemPromotion;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number) => void;
    removeFromCart: (productId: string) => void;
    updateQuantity: (productId: string, quantity: number) => void;
    clearCart: () => void;
    total: number;
    finalTotal: number;
    couponDiscount: number;
    count: number;
    appliedCoupon: CouponValidationResult | null;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);
    const [itemPromotions, setItemPromotions] = useState<Record<string, CartItemPromotion>>({});

    // Fetch promotions for all cart items whenever items change
    useEffect(() => {
        if (!isInitialized) return;
        const productIds = items.map(i => i.product.id);
        if (productIds.length === 0) {
            setItemPromotions({});
            return;
        }

        let cancelled = false;
        const fetchPromotions = async () => {
            const promoMap: Record<string, CartItemPromotion> = {};
            await Promise.all(
                items.map(async (item) => {
                    try {
                        const promotions: Promotion[] = await apiClient.getPromotionsForProduct(item.product.id);
                        const activePromo = promotions.find(p => p.active && !p.promoCode);
                        if (activePromo) {
                            promoMap[item.product.id] = {
                                discountedPrice: calculateDiscountedPrice(item.product.price, activePromo.discountType, activePromo.discountValue),
                                promotionalLabel: activePromo.promotionalLabel,
                                originalPrice: item.product.price,
                            };
                        }
                    } catch {
                        // If fetching promotions fails for an item, skip it
                    }
                })
            );
            if (!cancelled) {
                setItemPromotions(promoMap);
            }
        };
        fetchPromotions();
        return () => { cancelled = true; };
    }, [items, isInitialized]);

    // Load cart from backend on mount
    useEffect(() => {
        const loadCart = async () => {
            try {
                const backendCart = await apiClient.getCart(SESSION_ID);
                const products = await apiClient.getProducts();
                
                const cartItems: CartItem[] = backendCart.items.map((item: any) => {
                    const product = products.find((p: Product) => p.id === item.productId);
                    return product ? { product, quantity: item.quantity } : null;
                }).filter(Boolean) as CartItem[];
                
                setItems(cartItems);
            } catch (error) {
                console.error('Failed to load cart:', error);
            }
            setIsInitialized(true);
        };
        loadCart();
    }, []);

    const addToCart = async (product: Product, quantity: number = 1) => {
        try {
            await apiClient.addToCart(SESSION_ID, product.id, quantity);
            setItems(prev => {
                const existing = prev.find((item: CartItem) => item.product.id === product.id);
                if (existing) {
                    return prev.map((item: CartItem) =>
                        item.product.id === product.id
                            ? { ...item, quantity: item.quantity + quantity }
                            : item
                    );
                }
                return [...prev, { product, quantity }];
            });
        } catch (error) {
            console.error('Failed to add to cart:', error);
        }
    };

    const removeFromCart = async (productId: string) => {
        try {
            await apiClient.removeFromCart(SESSION_ID, productId);
            setItems(prev => prev.filter((item: CartItem) => item.product.id !== productId));
        } catch (error) {
            console.error('Failed to remove from cart:', error);
        }
    };

    const clearCart = async () => {
        try {
            await apiClient.clearCart(SESSION_ID);
            setItems([]);
        } catch (error) {
            console.error('Failed to clear cart:', error);
        }
    };

    const updateQuantity = async (productId: string, quantity: number) => {
        if (quantity < 1) {
            removeFromCart(productId);
            return;
        }
        try {
            await apiClient.addToCart(SESSION_ID, productId, quantity - (items.find((i: CartItem) => i.product.id === productId)?.quantity || 0));
            setItems(prev => prev.map((item: CartItem) =>
                item.product.id === productId ? { ...item, quantity } : item
            ));
        } catch (error) {
            console.error('Failed to update quantity:', error);
        }
    };

    const enrichedItems: CartItem[] = items.map(item => ({
        ...item,
        promotion: itemPromotions[item.product.id],
    }));

    const total = enrichedItems.reduce((sum: number, item: CartItem) => {
        const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
        return sum + (price * item.quantity);
    }, 0);
    const count = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

    // Coupon discount applies on top of already-discounted prices (after automatic promotions)
    const couponDiscount = appliedCoupon
        ? enrichedItems.reduce((sum, item) => {
            if (!appliedCoupon.applicableProductIds.includes(item.product.id)) return sum;
            const effectivePrice = item.promotion ? item.promotion.discountedPrice : item.product.price;
            const afterCoupon = calculateDiscountedPrice(effectivePrice, appliedCoupon.discountType, appliedCoupon.discountValue);
            return sum + (effectivePrice - afterCoupon) * item.quantity;
        }, 0)
        : 0;

    const finalTotal = total - couponDiscount;

    const applyCoupon = async (code: string) => {
        const productIds = items.map(i => i.product.id);
        const result = await apiClient.validateCouponCode(code.trim(), productIds);
        setAppliedCoupon(result);
    };

    const removeCoupon = () => setAppliedCoupon(null);

    return (
        <CartContext.Provider value={{ items: enrichedItems, addToCart, removeFromCart, updateQuantity, clearCart, total, finalTotal, couponDiscount, count, appliedCoupon, applyCoupon, removeCoupon }}>
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
