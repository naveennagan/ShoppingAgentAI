'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import PriceDisplay from '@/components/ui/PriceDisplay';
import SplitVoucherInput from '@/components/cart/SplitVoucherInput';
import SplitOrderSummary from '@/components/cart/SplitOrderSummary';

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, clearCart } = useCart();

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
                    {items.map((item) => {
                        const { product, quantity, promotion, item_type, display_name, display_summary, unit_price } = item;
                        const isBroadband = item_type === 'broadband_service';

                        return (
                        <div key={product.id} className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ width: '100px', height: '100px', background: 'var(--surface-hover)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {product.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '2.5rem' }}>
                                        {isBroadband ? '📡' : '📦'}
                                    </span>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                                    {display_name || product.name}
                                </h3>
                                {isBroadband && display_summary ? (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                                        {display_summary}
                                    </p>
                                ) : (
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{product.category}</p>
                                )}
                                {isBroadband && (
                                    <span style={{ display: 'inline-block', marginTop: '0.35rem', fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                                        Monthly service
                                    </span>
                                )}
                            </div>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                {isBroadband ? (
                                    <div>
                                        <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                                            £{(unit_price ?? product.price).toFixed(2)}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mo</span>
                                    </div>
                                ) : (
                                    <PriceDisplay
                                        originalPrice={product.price * quantity}
                                        discountedPrice={promotion ? promotion.discountedPrice * quantity : null}
                                        promotionalLabel={promotion?.promotionalLabel}
                                    />
                                )}
                                {!isBroadband && (
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
                                )}
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
                        );
                    })}

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

                {/* Voucher Inputs & Order Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <SplitVoucherInput />
                    <SplitOrderSummary />
                </div>
            </div>
        </main>
    );
}
