'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PriceDisplay from '@/components/ui/PriceDisplay';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

interface OrderItem {
    productId: string;
    productName: string;
    price: number;
    originalPrice?: number;
    promotionalLabel?: string | null;
    quantity: number;
    imageUrl: string;
}

interface Order {
    orderId: string;
    sessionId: string;
    items: OrderItem[];
    totalAmount: number;
    status: string;
    orderDate: string;
    shippingAddress: string;
    paymentMethod: string;
}

const STATUS_STEPS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function StatusTimeline({ status }: { status: string }) {
    const current = STATUS_STEPS.indexOf(status.toUpperCase());
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '1rem 0' }}>
            {STATUS_STEPS.map((step, i) => {
                const done = i <= current;
                return (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: done ? 'var(--primary)' : '#e5e7eb',
                                color: done ? 'white' : '#9ca3af',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                            }}>
                                {done ? '✓' : i + 1}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: done ? 'var(--primary)' : '#9ca3af', fontWeight: done ? 600 : 400, whiteSpace: 'nowrap' }}>
                                {step.charAt(0) + step.slice(1).toLowerCase()}
                            </span>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                            <div style={{ flex: 1, height: '2px', background: i < current ? 'var(--primary)' : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let sessionId = localStorage.getItem('sessionId');
        if (!sessionId) {
            sessionId = 'user123';
            localStorage.setItem('sessionId', sessionId);
        }
        fetch(`${API_URL}/api/orders?sessionId=${sessionId}`)
            .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(setOrders)
            .catch(e => setError(e.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>Loading your orders…</p>
        </main>
    );

    if (error) return (
        <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
            <p style={{ color: '#ef4444' }}>Failed to load orders: {error}</p>
        </main>
    );

    return (
        <main className="container" style={{ padding: '2rem 0' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>My Orders</h1>
            <p style={{ color: '#6b7280', marginBottom: '2rem' }}>Orders are automatically removed after 3 days.</p>

            {orders.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p style={{ fontSize: '1.1rem', color: '#6b7280', marginBottom: '1.5rem' }}>No orders yet.</p>
                    <Link href="/products" className="btn btn-primary">Start Shopping</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {orders.map(order => (
                        <div key={order.orderId} className="card">
                            {/* Order header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>Order #{order.orderId}</span>
                                    <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
                                        {new Date(order.orderDate).toLocaleDateString('en-GB', {
                                            day: 'numeric', month: 'long', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <span style={{
                                    padding: '0.3rem 0.75rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
                                    background: order.status === 'DELIVERED' ? '#dcfce7' : '#eff6ff',
                                    color: order.status === 'DELIVERED' ? '#15803d' : '#1d4ed8'
                                }}>
                                    {order.status}
                                </span>
                            </div>

                            {/* Status timeline */}
                            <StatusTimeline status={order.status} />

                            {/* Items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
                                {order.items.map((item, i) => {
                                    const effectiveOriginalPrice = item.originalPrice && item.originalPrice > 0 ? item.originalPrice : item.price;
                                    const isDiscounted = item.price !== effectiveOriginalPrice;
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={item.imageUrl} alt={item.productName}
                                                style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', background: '#f3f4f6', flexShrink: 0 }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: 600, margin: 0 }}>{item.productName}</p>
                                                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.1rem 0 0' }}>Qty: {item.quantity}</p>
                                            </div>
                                            <PriceDisplay
                                                originalPrice={effectiveOriginalPrice * item.quantity}
                                                discountedPrice={isDiscounted ? item.price * item.quantity : null}
                                                promotionalLabel={item.promotionalLabel}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                    <p style={{ margin: 0 }}>{order.shippingAddress}</p>
                                    <p style={{ margin: '0.2rem 0 0' }}>{order.paymentMethod}</p>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Total: £{order.totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
