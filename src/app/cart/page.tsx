'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { calculateDiscountedPrice } from '@/lib/discountCalculator';

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, total, clearCart, appliedCoupon, applyCoupon, removeCoupon } = useCart();

    const [couponCode, setCouponCode] = useState('');
    const [couponError, setCouponError] = useState('');
    const [isValidating, setIsValidating] = useState(false);

    const subtotal = items.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0);

    const discountAmount = appliedCoupon
        ? items.reduce((sum, { product, quantity }) => {
            if (!appliedCoupon.applicableProductIds.includes(product.id)) return sum;
            const discounted = calculateDiscountedPrice(product.price, appliedCoupon.discountType, appliedCoupon.discountValue);
            return sum + (product.price - discounted) * quantity;
        }, 0)
        : 0;

    const finalTotal = subtotal - discountAmount;

    const noEligibleItems = appliedCoupon !== null && appliedCoupon.applicableProductIds.length === 0;

    async function handleApplyCoupon() {
        if (!couponCode.trim()) {
            setCouponError('Please enter a coupon code.');
            return;
        }
        setCouponError('');
        setIsValidating(true);
        try {
            await applyCoupon(couponCode.trim());
            setCouponCode('');
        } catch (err: unknown) {
            setCouponError(err instanceof Error ? err.message : 'Failed to validate coupon code');
        } finally {
            setIsValidating(false);
        }
    }

    function handleRemoveCoupon() {
        removeCoupon();
        setCouponError('');
    }

    if (items.length === 0) {
        return (
            <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Your Cart is Empty</h1>
                <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Looks like you haven&apos;t added anything yet.</p>
                <Link href="/products" className="btn btn-primary">
                    Start Shopping
                </Link>
            </main>
        );
    }

    return (
        <main className="container" style={{ padding: '2rem 0' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem' }}>Shopping Cart</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
                {/* Cart Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {items.map(({ product, quantity }) => (
                        <div key={product.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: '100px', height: '100px', background: 'var(--surface-hover)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>{product.name}</h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{product.category}</p>
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                    £{(product.price * quantity).toFixed(2)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', borderRadius: '8px', padding: '0.25rem' }}>
                                    <button
                                        onClick={() => updateQuantity(product.id, quantity - 1)}
                                        style={{
                                            width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', borderRadius: '6px', background: 'var(--surface)',
                                            border: '1px solid var(--border)', color: 'var(--foreground)',
                                            boxShadow: 'var(--shadow-sm)', fontWeight: 'bold'
                                        }}
                                        aria-label="Decrease quantity"
                                    >-</button>
                                    <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(product.id, quantity + 1)}
                                        style={{
                                            width: '28px', height: '28px', display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', borderRadius: '6px', background: 'var(--surface)',
                                            border: '1px solid var(--border)', color: 'var(--foreground)',
                                            boxShadow: 'var(--shadow-sm)', fontWeight: 'bold'
                                        }}
                                        aria-label="Increase quantity"
                                    >+</button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(product.id)}
                                    className="btn"
                                    style={{
                                        color: '#ef4444', fontSize: '0.85rem', fontWeight: 500,
                                        padding: '0.25rem 0.75rem', border: '1px solid #fecaca',
                                        background: '#fef2f2', borderRadius: '6px'
                                    }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={clearCart}
                        className="btn"
                        style={{
                            alignSelf: 'flex-start', color: '#6b7280', marginTop: '1rem',
                            padding: '0.5rem 1rem', border: '1px solid #d1d5db',
                            background: 'white', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500
                        }}
                    >
                        Clear Cart
                    </button>
                </div>

                {/* Order Summary */}
                <div className="card" style={{ position: 'sticky', top: '5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order Summary</h2>

                    {/* Coupon Input */}
                    {!appliedCoupon ? (
                        <div style={{ marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={e => { setCouponCode(e.target.value); setCouponError(''); }}
                                    onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                    placeholder="Coupon code"
                                    aria-label="Coupon code"
                                    style={{
                                        flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border)',
                                        borderRadius: '8px', fontSize: '0.9rem', background: 'var(--surface)',
                                        color: 'var(--foreground)', outline: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleApplyCoupon}
                                    disabled={isValidating}
                                    className="btn btn-primary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                                >
                                    {isValidating ? 'Applying…' : 'Apply'}
                                </button>
                            </div>
                            {couponError && (
                                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem' }} role="alert">
                                    {couponError}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                            padding: '0.6rem 0.75rem', marginBottom: '1.25rem'
                        }}>
                            <span style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: 600 }}>
                                ✓ {appliedCoupon.promotionName}
                            </span>
                            <button
                                onClick={handleRemoveCoupon}
                                style={{
                                    background: 'none', border: 'none', color: '#6b7280',
                                    fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.25rem'
                                }}
                                aria-label="Remove coupon"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {/* Subtotal */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#4b5563' }}>
                        <span>Subtotal</span>
                        <span>£{subtotal.toFixed(2)}</span>
                    </div>

                    {/* Discount line */}
                    {appliedCoupon && (
                        <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                                <span style={{ fontSize: '0.9rem' }}>{appliedCoupon.promotionName}</span>
                                <span>-£{discountAmount.toFixed(2)}</span>
                            </div>
                            {noEligibleItems && (
                                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                                    No items in your cart are eligible for this promotion.
                                </p>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#4b5563' }}>
                        <span>Shipping</span>
                        <span>Free</span>
                    </div>

                    <div style={{
                        borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem',
                        display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem'
                    }}>
                        <span>Total</span>
                        <span>£{finalTotal.toFixed(2)}</span>
                    </div>

                    <Link href="/checkout" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
                        Proceed to Checkout
                    </Link>
                </div>
            </div>
        </main>
    );
}
