'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useCart } from '@/context/CartContext';
import { CheckoutSession, Appointment } from '@/types/checkout';
import CancelModal from '@/components/checkout/CancelModal';
import DevicePaymentSection from '@/components/checkout/DevicePaymentSection';
import BroadbandSection from '@/components/checkout/BroadbandSection';
import { CheckCircle, X } from 'lucide-react';

interface AboutYou {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export default function CheckoutPage() {
  const { removeFromCart, items } = useCart();
  const router = useRouter();

  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Step: 'about' | 'payment'
  const [step, setStep] = useState<'about' | 'payment'>('about');
  const [aboutYou, setAboutYou] = useState<AboutYou>({ fullName: '', email: '', phone: '', address: '' });
  const [aboutError, setAboutError] = useState('');

  // Payment state
  const [devicePaid, setDevicePaid] = useState(false);
  const [appointments, setAppointments] = useState<Record<string, Appointment>>({});
  const [aboutSaving, setAboutSaving] = useState(false);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<'devices' | 'broadband' | null>(null);

  useEffect(() => {
    const init = async () => {
      const sessionId = localStorage.getItem('sessionId');
      if (!sessionId) { router.push('/cart'); return; }
      try {
        const s = await apiClient.createCheckoutSession(sessionId);
        setSession(s);
        if (s.devicePaymentDone) setDevicePaid(true);
        const allBooked = s.broadbandBookingStatus && Object.values(s.broadbandBookingStatus).every(v => v !== 'unbooked');
        if (allBooked && Object.keys(s.broadbandBookingStatus).length > 0) {
          // Load appointment details for each booked item
          const apptEntries: Record<string, Appointment> = {};
          for (const [cartItemId, status] of Object.entries(s.broadbandBookingStatus)) {
            if (status !== 'unbooked') {
              try {
                const appt = await apiClient.getAppointment(status);
                apptEntries[cartItemId] = appt;
              } catch {
                // If we can't load appointment details, continue without them
              }
            }
          }
          setAppointments(apptEntries);
        }

        // Pre-populate About You from saved customer details and skip to payment
        if (s.customerDetails && s.customerDetails.fullName) {
          setAboutYou({
            fullName: s.customerDetails.fullName,
            email: s.customerDetails.email || '',
            phone: s.customerDetails.phone || '',
            address: s.customerDetails.address || '',
          });
          setStep('payment');
        } else if (s.devicePaymentDone || allBooked) {
          setStep('payment');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load checkout.');
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [router]);

  const handleAboutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aboutYou.fullName.trim() || !aboutYou.email.trim() || !aboutYou.address.trim()) {
      setAboutError('Please fill in all required fields.');
      return;
    }
    setAboutError('');
    setAboutSaving(true);
    try {
      const sessionId = localStorage.getItem('sessionId')!;
      await apiClient.saveCustomerDetails(sessionId, {
        fullName: aboutYou.fullName.trim(),
        email: aboutYou.email.trim(),
        phone: aboutYou.phone.trim(),
        address: aboutYou.address.trim(),
      });
      setStep('payment');
    } catch (err) {
      setAboutError(err instanceof Error ? err.message : 'Failed to save your details. Please try again.');
    } finally {
      setAboutSaving(false);
    }
  };

  const handlePay = async (cardholderName: string, last4Digits: string) => {
    const sessionId = localStorage.getItem('sessionId')!;
    await apiClient.processDevicePayment(sessionId, { cardholderName, last4Digits });
    setDevicePaid(true);
    for (const item of items.filter(i => i.item_type !== 'broadband_service')) {
      await removeFromCart(item.product.id);
    }
  };

  const handleBookAppointment = async (date: string, slot: string, broadbandItemId: string) => {
    const sessionId = localStorage.getItem('sessionId')!;
    const appt = await apiClient.bookAppointment({ sessionId, preferredDate: date, preferredTimeSlot: slot, broadbandItemId });
    // Store appointment keyed by broadbandItemId
    setAppointments(prev => ({ ...prev, [broadbandItemId]: appt }));
    // Update broadbandBookingStatus for this specific item
    setSession(prev => {
      if (!prev) return prev;
      const updatedStatus = { ...prev.broadbandBookingStatus, [broadbandItemId]: appt.appointmentId };
      return { ...prev, broadbandBookingStatus: updatedStatus };
    });
  };

  const handleCancelBroadbandItem = (broadbandItemId: string) => {
    // Find the matching cart item to get the product ID for removal
    const cartItem = items.find(i => {
      if (i.item_type !== 'broadband_service') return false;
      // Match by cartItemId from session serviceItems
      const serviceItem = session?.serviceItems.find(si => si.cartItemId === broadbandItemId);
      return serviceItem && (i.product.name === serviceItem.displayName || i.product.id === broadbandItemId);
    });
    if (cartItem) removeFromCart(cartItem.product.id);

    // Update session state: remove the specific item
    setSession(prev => {
      if (!prev) return prev;
      const updatedServiceItems = prev.serviceItems.filter(si => si.cartItemId !== broadbandItemId);
      const updatedStatus = { ...prev.broadbandBookingStatus };
      delete updatedStatus[broadbandItemId];
      const hasBroadband = updatedServiceItems.length > 0;
      const updatedMonthly = updatedServiceItems.reduce((sum, si) => sum + si.unitPrice, 0);
      return {
        ...prev,
        serviceItems: updatedServiceItems,
        broadbandBookingStatus: updatedStatus,
        hasBroadbandService: hasBroadband,
        monthlyTotal: updatedMonthly,
      };
    });

    // Remove appointment for this item
    setAppointments(prev => {
      const updated = { ...prev };
      delete updated[broadbandItemId];
      return updated;
    });
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget || !session) return;
    if (cancelTarget === 'broadband') {
      // Cancel ALL broadband items
      for (const item of items.filter(i => i.item_type === 'broadband_service')) {
        await removeFromCart(item.product.id);
      }
      setSession(prev => prev ? { ...prev, hasBroadbandService: false, serviceItems: [], broadbandBookingStatus: {} } : prev);
      setAppointments({});
    } else {
      for (const item of session.deviceItems) {
        const cartItem = items.find(i => i.product.name === item.displayName || i.product.id === item.cartItemId);
        if (cartItem) await removeFromCart(cartItem.product.id);
      }
      setSession(prev => prev ? { ...prev, hasDevices: false, deviceItems: [] } : prev);
    }
    setCancelTarget(null);
  };

  if (loading) return (
    <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <p style={{ color: '#6b7280' }}>Loading checkout…</p>
    </main>
  );

  if (error && !session) return (
    <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <p style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</p>
      <button onClick={() => router.push('/cart')} className="btn btn-primary">Back to Cart</button>
    </main>
  );

  if (!session) return null;

  const hasAnything = session.hasDevices || session.hasBroadbandService;

  if (!hasAnything) return (
    <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <div className="card" style={{ padding: '3rem', maxWidth: '400px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>Your cart is empty.</p>
        <button onClick={() => router.push('/products')} className="btn btn-primary">Continue Shopping</button>
      </div>
    </main>
  );

  return (
    <main className="container" style={{ padding: '2rem 0', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Checkout</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.9rem' }}>
        {step === 'about' ? 'Tell us about yourself to continue.' : 'Complete your payment below.'}
      </p>

      {/* Step 1: About You */}
      {step === 'about' && (
        <div style={{ maxWidth: '560px' }}>
          <div className="card" style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Your Details</h2>
            <form onSubmit={handleAboutSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Field label="Full name *" value={aboutYou.fullName} onChange={v => setAboutYou(p => ({ ...p, fullName: v }))} placeholder="Jane Smith" />
              <Field label="Email address *" type="email" value={aboutYou.email} onChange={v => setAboutYou(p => ({ ...p, email: v }))} placeholder="jane@example.com" />
              <Field label="Phone number" value={aboutYou.phone} onChange={v => setAboutYou(p => ({ ...p, phone: v }))} placeholder="+44 7700 900000" />
              <Field label="Installation / delivery address *" value={aboutYou.address} onChange={v => setAboutYou(p => ({ ...p, address: v }))} placeholder="123 High Street, London, SW1A 1AA" />
              {aboutError && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{aboutError}</p>}
              <button type="submit" className="btn btn-primary" disabled={aboutSaving} style={{ padding: '0.9rem', fontSize: '1rem', marginTop: '0.25rem' }}>
                {aboutSaving ? 'Saving…' : 'Continue to Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Step 2: Payment — two columns */}
      {step === 'payment' && (
        <div>
          {/* Compact about-you summary */}
          {aboutYou.fullName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem 1rem', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '10px' }}>
              <CheckCircle size={16} color="#16a34a" />
              <span style={{ fontSize: '0.88rem', color: '#374151' }}>
                <strong>{aboutYou.fullName}</strong> · {aboutYou.email}{aboutYou.address ? ` · ${aboutYou.address}` : ''}
              </span>
              <button onClick={() => setStep('about')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#6b7280', fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}>Edit</button>
            </div>
          )}

          {/* Two-column payment layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: session.hasDevices && session.hasBroadbandService ? '1fr 1fr' : '1fr',
            gap: '1.5rem',
            alignItems: 'start',
          }}>
            {session.hasDevices && (
              <DevicePaymentSection
                session={session}
                devicePaid={devicePaid}
                onPay={handlePay}
                onCancel={() => setCancelTarget('devices')}
              />
            )}
            {session.hasBroadbandService && (
              <BroadbandSection
                session={session}
                appointments={appointments}
                onBook={handleBookAppointment}
                onCancel={handleCancelBroadbandItem}
              />
            )}
          </div>
        </div>
      )}

      <CancelModal
        isOpen={cancelTarget !== null}
        target={cancelTarget}
        onConfirm={handleCancelConfirm}
        onClose={() => setCancelTarget(null)}
      />
    </main>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <label style={{ fontWeight: 500, fontSize: '0.88rem', color: '#374151' }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)', fontSize: '0.9rem' }}
      />
    </div>
  );
}

