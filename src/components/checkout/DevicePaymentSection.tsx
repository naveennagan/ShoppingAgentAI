'use client';

import { useState } from 'react';
import { CheckoutSession, CheckoutCartItem } from '@/types/checkout';
import { CheckCircle } from 'lucide-react';

interface Props {
  session: CheckoutSession;
  devicePaid: boolean;
  onPay: (cardholderName: string, last4Digits: string) => Promise<void>;
  onCancel: () => void;
  discountedTotal?: number;
  deviceDiscount?: number;
  voucherName?: string;
}

export default function DevicePaymentSection({ session, devicePaid, onPay, onCancel, discountedTotal, deviceDiscount, voucherName }: Props) {
  const hasDiscount = discountedTotal != null && deviceDiscount != null && deviceDiscount > 0;
  const totalDue = hasDiscount ? discountedTotal! : session.oneTimeTotal;
  const [cardholderName, setCardholderName] = useState('');
  const [last4, setLast4] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(last4)) { setError('Enter exactly 4 digits.'); return; }
    setError('');
    setLoading(true);
    try {
      await onPay(cardholderName.trim(), last4);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (devicePaid) {
    return (
      <div className="card" style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={28} color="#16a34a" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: '#15803d' }}>Payment successful</p>
            <p style={{ color: '#4b5563', fontSize: '0.88rem', margin: '0.2rem 0 0' }}>
              Your device order has been created. You&apos;ll receive a confirmation shortly.
            </p>
          </div>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {session.deviceItems.map(item => (
            <DeviceItemRow key={item.cartItemId} item={item} />
          ))}
          {hasDiscount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#15803d' }}>
              <span>{voucherName || 'Voucher discount'}</span>
              <span style={{ fontWeight: 600 }}>-£{deviceDiscount!.toFixed(2)}</span>
            </div>
          )}
          <div style={{ borderTop: '1px solid #bbf7d0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem' }}>
            <span>Total paid</span>
            <span style={{ color: '#15803d' }}>£{totalDue.toFixed(2)}</span>
          </div>
        </div>
        {session.hasBroadbandService && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#6b7280' }}>
            ↓ Now complete your broadband setup below.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Device Payment</h2>
      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Mock payment — no real card processing.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
            <label style={{ fontWeight: 500, fontSize: '0.88rem' }}>Cardholder Name</label>
            <input required value={cardholderName} onChange={e => setCardholderName(e.target.value)}
              placeholder="e.g. Jane Smith"
              style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '0 0 130px' }}>
            <label style={{ fontWeight: 500, fontSize: '0.88rem' }}>Last 4 digits</label>
            <input required value={last4} onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="4242" maxLength={4} inputMode="numeric"
              style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }} />
          </div>
        </div>
        {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{error}</p>}
        <div style={{ padding: '0.85rem 1rem', background: '#f3f4f6', borderRadius: '8px' }}>
          {session.deviceItems.map(item => (
            <DeviceItemRow key={item.cartItemId} item={item} />
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.4rem' }}>
            <span style={{ color: '#4b5563', fontSize: '0.9rem' }}>Subtotal</span>
            <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>£{session.oneTimeTotal.toFixed(2)}</span>
          </div>
          {hasDiscount && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: '#15803d' }}>
              <span style={{ fontSize: '0.88rem' }}>{voucherName || 'Voucher discount'}</span>
              <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>-£{deviceDiscount!.toFixed(2)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', borderTop: hasDiscount ? '1px solid #e5e7eb' : 'none', paddingTop: hasDiscount ? '0.4rem' : 0 }}>
            <span style={{ color: '#4b5563', fontSize: '0.9rem' }}>Total due today</span>
            <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>£{totalDue.toFixed(2)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Processing…' : `Pay £${totalDue.toFixed(2)}`}
          </button>
          <button type="button" onClick={onCancel} className="btn" style={{ padding: '0.85rem 1.25rem', fontSize: '0.9rem', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function DeviceItemRow({ item }: { item: CheckoutCartItem }) {
  const hasPromo = item.originalPrice != null && item.originalPrice > item.unitPrice;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', color: '#374151' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span>{item.displayName} {item.quantity > 1 ? `×${item.quantity}` : ''}</span>
        {hasPromo && item.promotionalLabel && (
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#15803d', background: '#dcfce7', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
            {item.promotionalLabel}
          </span>
        )}
      </div>
      <span style={{ fontWeight: 600 }}>
        {hasPromo && (
          <span style={{ textDecoration: 'line-through', color: '#9ca3af', marginRight: '0.4rem', fontWeight: 400 }}>
            £{(item.originalPrice! * item.quantity).toFixed(2)}
          </span>
        )}
        £{(item.unitPrice * item.quantity).toFixed(2)}
      </span>
    </div>
  );
}
