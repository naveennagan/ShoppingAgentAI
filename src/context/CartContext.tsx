'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Promotion, CouponValidationResult } from '@/lib/products';
import { apiClient } from '@/lib/api-client';
import { calculateDiscountedPrice } from '@/lib/discountCalculator';
import { ItemType, FulfillmentType } from '@/types/checkout';
import { BroadbandPlan } from '@/types/broadband';

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
    // Extended fields for broadband service items (all optional for backward compatibility)
    item_type?: ItemType;
    fulfillment_type?: FulfillmentType;
    broadband_ref?: string;
    display_name?: string;
    display_summary?: string;
    unit_price?: number;
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
    // Legacy single-coupon API (backward compatibility)
    appliedCoupon: CouponValidationResult | null;
    applyCoupon: (code: string) => Promise<void>;
    removeCoupon: () => void;
    // Split voucher state
    appliedDeviceVoucher: CouponValidationResult | null;
    appliedBroadbandVoucher: CouponValidationResult | null;
    applyDeviceVoucher: (code: string) => Promise<void>;
    applyBroadbandVoucher: (code: string) => Promise<void>;
    removeDeviceVoucher: () => void;
    removeBroadbandVoucher: () => void;
    // Split totals
    payTodayTotal: number;
    payMonthlyTotal: number;
    deviceDiscount: number;
    broadbandDiscount: number;
    addBroadbandServiceToCart: (plan: BroadbandPlan, userSelectionId: string, displaySummary?: string, monthlyTotal?: number) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);
    const [appliedDeviceVoucher, setAppliedDeviceVoucher] = useState<CouponValidationResult | null>(null);
    const [appliedBroadbandVoucher, setAppliedBroadbandVoucher] = useState<CouponValidationResult | null>(null);
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
                items.filter(item => item.item_type !== 'broadband_service').map(async (item) => {
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
                    // Broadband service items have no productId — reconstruct from display fields
                    if (item.itemType === 'broadband_service') {
                        return {
                            product: {
                                id: `broadband-${item.displayName?.replace(/\s+/g, '-').toLowerCase() ?? 'plan'}`,
                                name: item.displayName ?? 'Broadband Plan',
                                price: item.unitPrice ?? 0,
                                category: 'broadband',
                                description: item.displaySummary ?? '',
                                image: '',
                            } as Product,
                            quantity: item.quantity,
                            item_type: 'broadband_service' as const,
                            fulfillment_type: 'installation' as const,
                            display_name: item.displayName,
                            display_summary: item.displaySummary,
                            unit_price: item.unitPrice,
                        };
                    }
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

    // Split items into device and broadband categories
    const deviceItems = enrichedItems.filter(item => item.item_type !== 'broadband_service');
    const broadbandItems = enrichedItems.filter(item => item.item_type === 'broadband_service');

    // Device discount: apply device voucher to device items
    const deviceDiscount = appliedDeviceVoucher
        ? deviceItems.reduce((sum, item) => {
            const effectivePrice = item.promotion ? item.promotion.discountedPrice : item.product.price;
            const afterVoucher = calculateDiscountedPrice(effectivePrice, appliedDeviceVoucher.discountType, appliedDeviceVoucher.discountValue);
            return sum + (effectivePrice - afterVoucher) * item.quantity;
        }, 0)
        : 0;

    // Broadband discount: apply broadband voucher to broadband items
    const broadbandDiscount = appliedBroadbandVoucher
        ? broadbandItems.reduce((sum, item) => {
            const effectivePrice = item.promotion ? item.promotion.discountedPrice : item.product.price;
            const afterVoucher = calculateDiscountedPrice(effectivePrice, appliedBroadbandVoucher.discountType, appliedBroadbandVoucher.discountValue);
            return sum + (effectivePrice - afterVoucher) * item.quantity;
        }, 0)
        : 0;

    // Pay Today = sum of device item prices after device voucher discount
    const deviceSubtotal = deviceItems.reduce((sum, item) => {
        const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
        return sum + price * item.quantity;
    }, 0);
    const payTodayTotal = deviceSubtotal - deviceDiscount;

    // Pay Monthly = sum of broadband item prices after broadband voucher discount
    const broadbandSubtotal = broadbandItems.reduce((sum, item) => {
        const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
        return sum + price * item.quantity;
    }, 0);
    const payMonthlyTotal = broadbandSubtotal - broadbandDiscount;

    // Backward compatibility: couponDiscount = total of both discounts
    const couponDiscount = deviceDiscount + broadbandDiscount;

    const finalTotal = total - couponDiscount;

    // Backward compatibility: appliedCoupon returns the device voucher (or broadband if no device)
    const appliedCoupon = appliedDeviceVoucher || appliedBroadbandVoucher;

    const applyDeviceVoucher = async (code: string) => {
        const productIds = deviceItems.map(i => i.product.id);
        const result = await apiClient.validateCouponCode(code.trim(), productIds, 'device');
        setAppliedDeviceVoucher(result);
    };

    const applyBroadbandVoucher = async (code: string) => {
        const productIds = broadbandItems.map(i => i.product.id);
        const result = await apiClient.validateCouponCode(code.trim(), productIds, 'broadband');
        setAppliedBroadbandVoucher(result);
    };

    const removeDeviceVoucher = () => setAppliedDeviceVoucher(null);
    const removeBroadbandVoucher = () => setAppliedBroadbandVoucher(null);

    // Legacy applyCoupon: applies as device voucher for backward compatibility
    const applyCoupon = async (code: string) => {
        const productIds = items.map(i => i.product.id);
        const result = await apiClient.validateCouponCode(code.trim(), productIds);
        setAppliedDeviceVoucher(result);
    };

    const removeCoupon = () => {
        setAppliedDeviceVoucher(null);
        setAppliedBroadbandVoucher(null);
    };

    const addBroadbandServiceToCart = async (plan: BroadbandPlan, userSelectionId: string, displaySummary?: string, monthlyTotal?: number) => {
        const effectivePrice = monthlyTotal ?? plan.monthlyPrice;
        const summary = displaySummary ?? `${plan.downloadSpeedMbps}Mbps / ${plan.uploadSpeedMbps}Mbps · ${plan.technologyType} · £${effectivePrice}/mo`;
        const broadbandItem: CartItem = {
            product: {
                id: `broadband-${plan.planId}`,
                name: plan.name,
                price: effectivePrice,
                category: 'broadband',
                description: summary,
                image: '',
            } as Product,
            quantity: 1,
            item_type: 'broadband_service',
            fulfillment_type: 'installation',
            broadband_ref: userSelectionId,
            display_name: plan.name,
            display_summary: summary,
            unit_price: effectivePrice,
        };

        try {
            await apiClient.addBroadbandServiceToCart(SESSION_ID, {
                itemId: broadbandItem.product.id,
                name: plan.name,
                price: effectivePrice,
                quantity: 1,
                item_type: 'broadband_service',
                fulfillment_type: 'installation',
                broadband_ref: userSelectionId,
                display_name: plan.name,
                display_summary: summary,
                unit_price: effectivePrice,
            });

            // Replace any existing broadband service item — only one at a time
            setItems(prev => {
                const withoutBroadband = prev.filter(i => i.item_type !== 'broadband_service');
                return [...withoutBroadband, broadbandItem];
            });
        } catch (error) {
            console.error('Failed to add broadband service to cart:', error);
            throw error; // re-throw so the caller can show an error to the user
        }
    };

    return (
        <CartContext.Provider value={{ items: enrichedItems, addToCart, removeFromCart, updateQuantity, clearCart, total, finalTotal, couponDiscount, count, appliedCoupon, applyCoupon, removeCoupon, appliedDeviceVoucher, appliedBroadbandVoucher, applyDeviceVoucher, applyBroadbandVoucher, removeDeviceVoucher, removeBroadbandVoucher, payTodayTotal, payMonthlyTotal, deviceDiscount, broadbandDiscount, addBroadbandServiceToCart }}>
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
