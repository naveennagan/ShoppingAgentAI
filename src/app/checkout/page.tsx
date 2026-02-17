'use client';

import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './checkout.module.scss';

export default function CheckoutPage() {
    const { total, clearCart } = useCart();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        address: '',
        city: '',
        zip: ''
    });

    const [paymentData, setPaymentData] = useState({
        cardNumber: '',
        cardName: '',
        expiry: '',
        cvv: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPaymentData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
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

            const paymentDefaults = {
                cardNumber: '4242424242424242',
                cardName: 'Test User',
                expiry: '12/25',
                cvv: '123'
            };

            const updates = Object.keys(detail).length > 0 ? detail : defaults;

            setFormData(prev => ({
                ...prev,
                name: updates.name || defaults.name,
                email: updates.email || defaults.email,
                address: updates.address || defaults.address,
                city: updates.city || defaults.city,
                zip: updates.zip || defaults.zip,
            }));

            // Autofill payment if payment fields are provided or generic request
            const paymentUpdates = {
                cardNumber: updates.cardNumber || paymentDefaults.cardNumber,
                cardName: updates.cardName || paymentDefaults.cardName,
                expiry: updates.expiry || paymentDefaults.expiry,
                cvv: updates.cvv || paymentDefaults.cvv,
            };
            setPaymentData(paymentUpdates);
            
            // Auto-advance to payment step after autofill
            setTimeout(() => setStep(2), 500);
        };

        window.addEventListener('autofill-checkout', handleAutofill);
        return () => window.removeEventListener('autofill-checkout', handleAutofill);
    }, []);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        setStep(2);
    };

    const handlePlaceOrder = async () => {
        const validCards = [
            { number: '4242424242424242', name: 'Test User', expiry: '12/25', cvv: '123' },
            { number: '5555555555554444', name: 'Demo Account', expiry: '01/26', cvv: '456' },
            { number: '378282246310005', name: 'Mock Payment', expiry: '06/27', cvv: '789' }
        ];

        const isValid = validCards.some(card => 
            paymentData.cardNumber.replace(/\s/g, '') === card.number &&
            paymentData.cardName.toLowerCase() === card.name.toLowerCase() &&
            paymentData.expiry === card.expiry &&
            paymentData.cvv === card.cvv
        );

        if (!isValid) {
            setError('Invalid payment credentials. Use test cards: 4242 4242 4242 4242 (Test User, 12/25, 123)');
            return;
        }

        setLoading(true);
        
        try {
            // Get session ID
            let sessionId = localStorage.getItem('sessionId');
            if (!sessionId) {
                sessionId = 'user123';
                localStorage.setItem('sessionId', sessionId);
            }
            
            // Create order via backend API
            const shippingAddress = `${formData.address}, ${formData.city}, ${formData.zip}`;
            const response = await fetch(`http://localhost:8080/api/orders?sessionId=${sessionId}&shippingAddress=${encodeURIComponent(shippingAddress)}&paymentMethod=Credit Card`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error('Failed to create order');
            }
            
            const order = await response.json();
            console.log('Order created:', order);
            
            // Clear cart and redirect
            clearCart();
            router.push(`/tracking/${order.orderId}?confirmed=true`);
        } catch (error) {
            console.error('Order creation failed:', error);
            setError('Failed to place order. Please try again.');
            setLoading(false);
        }
    };

    return (
        <main className={`container ${styles.checkout}`}>
            <h1 className={styles.checkout__title}>Checkout</h1>

            {/* Progress */}
            <div className={styles.checkout__progress}>
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

                        <div style={{ padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>Test Payment Credentials:</p>
                            <p style={{ fontSize: '0.85rem', color: '#0369a1', margin: '0.25rem 0' }}>• Card: 4242 4242 4242 4242 | Name: Test User | Exp: 12/25 | CVV: 123</p>
                            <p style={{ fontSize: '0.85rem', color: '#0369a1', margin: '0.25rem 0' }}>• Card: 5555 5555 5555 4444 | Name: Demo Account | Exp: 01/26 | CVV: 456</p>
                            <p style={{ fontSize: '0.85rem', color: '#0369a1', margin: '0.25rem 0' }}>• Card: 3782 8224 6310 005 | Name: Mock Payment | Exp: 06/27 | CVV: 789</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Card Number</label>
                            <input 
                                required 
                                name="cardNumber" 
                                value={paymentData.cardNumber} 
                                onChange={handlePaymentChange}
                                placeholder="1234 5678 9012 3456"
                                maxLength={19}
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} 
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Cardholder Name</label>
                            <input 
                                required 
                                name="cardName" 
                                value={paymentData.cardName} 
                                onChange={handlePaymentChange}
                                placeholder="John Doe"
                                style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} 
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>Expiry Date</label>
                                <input 
                                    required 
                                    name="expiry" 
                                    value={paymentData.expiry} 
                                    onChange={handlePaymentChange}
                                    placeholder="MM/YY"
                                    maxLength={5}
                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <label style={{ fontWeight: 500, fontSize: '0.9rem' }}>CVV</label>
                                <input 
                                    required 
                                    name="cvv" 
                                    value={paymentData.cvv} 
                                    onChange={handlePaymentChange}
                                    placeholder="123"
                                    maxLength={3}
                                    style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }} 
                                />
                            </div>
                        </div>

                        {error && (
                            <div style={{ padding: '0.75rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.9rem' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: '8px' }}>
                            <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Total: <strong style={{ fontSize: '1.25rem', color: '#111827' }}>${total.toFixed(2)}</strong></p>
                        </div>

                        <button
                            onClick={handlePlaceOrder}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1rem', opacity: loading ? 0.7 : 1 }}
                        >
                            {loading ? 'Processing...' : `Pay ${total.toFixed(2)}`}
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            style={{ alignSelf: 'center', color: '#6b7280', fontSize: '0.9rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            Back to Shipping
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
