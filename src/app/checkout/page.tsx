'use client';

import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
    const { total, clearCart } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        address: '',
        city: '',
        zip: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Listen for AI Autofill event
    useEffect(() => {
        const handleAutofill = (e: Event) => {
            const detail = (e as CustomEvent).detail;

            // If empty detail (generic request), use defaults
            const defaults = {
                name: 'John Doe',
                email: 'john.doe@example.com',
                address: '123 AI Boulevard',
                city: 'Tech City',
                zip: '94043'
            };

            const updates = Object.keys(detail).length > 0 ? detail : defaults;

            setFormData(prev => ({
                ...prev,
                ...updates
            }));
        };

        window.addEventListener('autofill-checkout', handleAutofill);
        return () => window.removeEventListener('autofill-checkout', handleAutofill);
    }, []);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handlePlaceOrder = () => {
        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            clearCart();
            const orderId = Math.random().toString(36).substring(7).toUpperCase();
            router.push(`/tracking/${orderId}?confirmed=true`);
        }, 2000);
    };

    return (
        <main className="container" style={{ padding: '2rem 0', maxWidth: '600px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '2rem', textAlign: 'center' }}>Checkout</h1>

            {/* Progress */}
            <div style={{ display: 'flex', marginBottom: '3rem', justifyContent: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step >= 1 ? 1 : 0.5 }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: step >= 1 ? 'var(--primary)' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
                    <span style={{ fontWeight: 600 }}>Details</span>
                </div>
                <div style={{ width: '50px', height: '2px', background: '#e5e7eb', alignSelf: 'center' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: step >= 2 ? 1 : 0.5 }}>
                    <div style={{ width: '2rem', height: '2rem', borderRadius: '50%', background: step >= 2 ? 'var(--primary)' : '#e5e7eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
                    <span style={{ fontWeight: 600 }}>Payment</span>
                </div>
            </div>

            <div className="card">
                {step === 1 ? (
                    <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Shipping Information</h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Full Name</label>
                            <input required name="name" value={formData.name} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Email</label>
                            <input required type="email" name="email" value={formData.email} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Address</label>
                            <input required name="address" value={formData.address} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>City</label>
                                <input required name="city" value={formData.city} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Zip Code</label>
                                <input required name="zip" value={formData.zip} onChange={handleChange} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: '#111827' }} />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                            Continue to Payment
                        </button>
                    </form>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Payment Details</h2>

                        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px', marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Mock Payment Integration</p>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Card: **** **** **** 4242 (Simulated)</p>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total: <strong>${total.toFixed(2)}</strong></p>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1rem', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Processing...' : `Pay $${total.toFixed(2)}`}
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            style={{ alignSelf: 'center', color: '#6b7280', fontSize: '0.9rem', textDecoration: 'underline' }}
                        >
                            Back to Shipping
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
