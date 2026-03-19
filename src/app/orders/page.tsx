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
    orderType?: string;
    serviceStatus?: string;
    monthlyTotal?: number;
}

const DEVICE_STEPS = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
const SERVICE_STEPS = ['PENDING', 'APPOINTMENT_BOOKED', 'INSTALLING', 'ACTIVE'];
const SERVICE_LABELS: Record<string, string> = {
    'PENDING': 'Pending',
    'APPOINTMENT_BOOKED': 'Appt. Booked',
    'INSTALLING': 'Installing',
    'ACTIVE': 'Active',
};

function StatusTimeline({ status, orderType, serviceStatus }: { status: string; orderType?: string; serviceStatus?: string }) {
    const isService = orderType === 'service';
    const steps = isService ? SERVICE_STEPS : DEVICE_STEPS;
    const currentStatus = isService ? (serviceStatus || status).toUpperCase() : status.toUpperCase();
    const current = steps.indexOf(currentStatus);
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, margin: '1rem 0' }}>
            {steps.map((step, i) => {
                const done = i <= current;
                const label = isService ? (SERVICE_LABELS[step] || step) : step.charAt(0) + step.slice(1).toLowerCase();
                return (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: done ? (isService ? '#7c3aed' : 'var(--primary)') : '#e5e7eb',
                                color: done ? 'white' : '#9ca3af',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '0.75rem', fontWeight: 700, flexShrink: 0
                            }}>
                                {done ? '✓' : i + 1}
                            </div>
                            <span style={{ fontSize: '0.65rem', color: done ? (isService ? '#7c3aed' : 'var(--primary)') : '#9ca3af', fontWeight: done ? 600 : 400, whiteSpace: 'nowrap' }}>
                                {label}
                            </span>
                        </div>
                        {i < steps.length - 1 && (
                            <div style={{ flex: 1, height: '2px', background: i < current ? (isService ? '#7c3aed' : 'var(--primary)') : '#e5e7eb', margin: '0 4px', marginBottom: '18px' }} />
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
                                    background: order.status === 'DELIVERED' ? '#dcfce7'
                                        : order.orderType === 'service' ? '#f3e8ff' : '#eff6ff',
                                    color: order.status === 'DELIVERED' ? '#15803d'
                                        : order.orderType === 'service' ? '#7c3aed' : '#1d4ed8'
                                }}>
                                    {order.orderType === 'service' ? '📡 Broadband' : '📦 Device'} · {order.serviceStatus || order.status}
                                </span>
                            </div>

                            {/* Status timeline */}
                            <StatusTimeline status={order.status} orderType={order.orderType} serviceStatus={order.serviceStatus} />

                            {/* Items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', margin: '1rem 0' }}>
                                {order.items.map((item, i) => {
                                    const effectiveOriginalPrice = item.originalPrice && item.originalPrice > 0 ? item.originalPrice : item.price;
                                    const isDiscounted = item.price !== effectiveOriginalPrice;
                                    return (
                                        <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '8px', background: '#f3f4f6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {item.imageUrl ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={item.imageUrl} alt={item.productName}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ fontSize: '1.75rem' }}>📡</span>
                                                )}
                                            </div>
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
                                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                                    {order.orderType === 'service'
                                        ? `£${(order.monthlyTotal ?? 0).toFixed(2)}/mo`
                                        : `Total: £${order.totalAmount.toFixed(2)}`}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
