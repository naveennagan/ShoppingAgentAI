'use client';

import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function CartPage() {
    const { items, removeFromCart, updateQuantity, total, clearCart } = useCart();

    if (items.length === 0) {
        return (
            <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Your Cart is Empty</h1>
                <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Looks like you haven't added anything yet.</p>
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
                                    ${(product.price * quantity).toFixed(2)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface-hover)', borderRadius: '8px', padding: '0.25rem' }}>
                                    <button
                                        onClick={() => updateQuantity(product.id, quantity - 1)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--foreground)',
                                            boxShadow: 'var(--shadow-sm)',
                                            fontWeight: 'bold'
                                        }}
                                        aria-label="Decrease quantity"
                                    >-</button>
                                    <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center', fontWeight: 600 }}>{quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(product.id, quantity + 1)}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '6px',
                                            background: 'var(--surface)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--foreground)',
                                            boxShadow: 'var(--shadow-sm)',
                                            fontWeight: 'bold'
                                        }}
                                        aria-label="Increase quantity"
                                    >+</button>
                                </div>
                                <button
                                    onClick={() => removeFromCart(product.id)}
                                    style={{ color: 'var(--secondary)', fontSize: '0.8rem', fontWeight: 500, textDecoration: 'underline' }}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={clearCart}
                        style={{ alignSelf: 'flex-start', color: '#6b7280', textDecoration: 'underline', marginTop: '1rem' }}
                    >
                        Clear Cart
                    </button>
                </div>

                {/* Summary */}
                <div className="card" style={{ position: 'sticky', top: '5rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order Summary</h2>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#4b5563' }}>
                        <span>Subtotal</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#4b5563' }}>
                        <span>Shipping</span>
                        <span>Free</span>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.25rem' }}>
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>

                    <Link href="/checkout" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
                        Proceed to Checkout
                    </Link>
                </div>
            </div>
        </main>
    );
}
