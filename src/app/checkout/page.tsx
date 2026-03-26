'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useCart } from '@/context/CartContext';
import { CheckoutSession, Appointment } from '@/types/checkout';
import CancelModal from '@/components/checkout/CancelModal';
import DevicePaymentSection from '@/components/checkout/DevicePaymentSection';
import BroadbandSection from '@/components/checkout/BroadbandSection';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface AboutYou {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

export default function CheckoutPage() {
  const { removeFromCart, items, payMonthlyTotal, payTodayTotal, broadbandDiscount, deviceDiscount, appliedBroadbandVoucher, appliedDeviceVoucher } = useCart();
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

  // Snapshot broadband discount before cart items are removed on booking
  const [savedBroadbandDiscount, setSavedBroadbandDiscount] = useState<number | undefined>(undefined);
  const [savedDiscountedMonthlyTotal, setSavedDiscountedMonthlyTotal] = useState<number | undefined>(undefined);
  
  // Snapshot device discount before cart items are removed on payment
  const [savedDeviceDiscount, setSavedDeviceDiscount] = useState<number | undefined>(undefined);
  const [savedDiscountedTodayTotal, setSavedDiscountedTodayTotal] = useState<number | undefined>(undefined);
  const [savedDeviceVoucherName, setSavedDeviceVoucherName] = useState<string | undefined>(undefined);

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
    
    // Prepare payment details with voucher information if available
    const paymentDetails: { cardholderName: string; last4Digits: string; voucherDiscount?: number; voucherName?: string } = {
      cardholderName,
      last4Digits
    };
    
    // Add voucher discount information if a device voucher is applied
    if (appliedDeviceVoucher && deviceDiscount > 0) {
      paymentDetails.voucherDiscount = deviceDiscount;
      paymentDetails.voucherName = appliedDeviceVoucher.promotionName;
    }
    
    // Snapshot device discount values before cart removal wipes them
    if (appliedDeviceVoucher && deviceDiscount > 0) {
      setSavedDeviceDiscount(deviceDiscount);
      setSavedDiscountedTodayTotal(payTodayTotal);
      setSavedDeviceVoucherName(appliedDeviceVoucher.promotionName);
    }
    
    await apiClient.processDevicePayment(sessionId, paymentDetails);
    setDevicePaid(true);
    for (const item of items.filter(i => i.item_type !== 'broadband_service')) {
      await removeFromCart(item.product.id);
    }
  };

  const handleBookAppointment = async (date: string, slot: string, broadbandItemId: string) => {
    const sessionId = localStorage.getItem('sessionId')!;
    // Pass discounted monthly total if a broadband voucher is applied
    const discountedMonthlyTotal = appliedBroadbandVoucher && broadbandDiscount > 0
      ? payMonthlyTotal
      : undefined;
    const appt = await apiClient.bookAppointment({ sessionId, preferredDate: date, preferredTimeSlot: slot, broadbandItemId, discountedMonthlyTotal });
    // Store appointment keyed by broadbandItemId
    setAppointments(prev => ({ ...prev, [broadbandItemId]: appt }));
    // Update broadbandBookingStatus for this specific item
    setSession(prev => {
      if (!prev) return prev;
      const updatedStatus = { ...prev.broadbandBookingStatus, [broadbandItemId]: appt.appointmentId };
      // Remove broadband items from cart once all are booked
      const allBooked = Object.values(updatedStatus).every(v => v !== 'unbooked');
      if (allBooked) {
        // Snapshot discount values before cart removal wipes them
        if (broadbandDiscount > 0) {
          setSavedBroadbandDiscount(broadbandDiscount);
          setSavedDiscountedMonthlyTotal(payMonthlyTotal);
        }
        for (const item of items.filter(i => i.item_type === 'broadband_service')) {
          removeFromCart(item.product.id);
        }
      }
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
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1.25rem' }}>Checkout</h1>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem' }}>
        {/* Step 1 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700,
            background: step === 'about' ? '#2563eb' : '#16a34a',
            color: '#fff',
          }}>
            {step === 'payment' ? '✓' : '1'}
          </div>
          <span style={{
            fontSize: '0.9rem', fontWeight: step === 'about' ? 700 : 500,
            color: step === 'about' ? '#111827' : '#16a34a',
          }}>About You</span>
        </div>

        {/* Connector */}
        <div style={{
          flex: '0 0 60px', height: '2px', margin: '0 0.5rem',
          background: step === 'payment' ? '#16a34a' : '#d1d5db',
        }} />

        {/* Step 2 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 700,
            background: step === 'payment' ? '#2563eb' : '#e5e7eb',
            color: step === 'payment' ? '#fff' : '#9ca3af',
          }}>
            2
          </div>
          <span style={{
            fontSize: '0.9rem', fontWeight: step === 'payment' ? 700 : 500,
            color: step === 'payment' ? '#111827' : '#9ca3af',
          }}>Payment</span>
        </div>
      </div>

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

          {/* Stacked payment layout */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}>
            {session.hasDevices && (
              <DevicePaymentSection
                session={session}
                devicePaid={devicePaid}
                onPay={handlePay}
                onCancel={() => setCancelTarget('devices')}
                discountedTotal={savedDiscountedTodayTotal ?? (appliedDeviceVoucher && deviceDiscount > 0 ? payTodayTotal : undefined)}
                deviceDiscount={savedDeviceDiscount ?? deviceDiscount}
                voucherName={savedDeviceVoucherName ?? appliedDeviceVoucher?.promotionName}
              />
            )}
            {session.hasBroadbandService && (
              <BroadbandSection
                session={session}
                appointments={appointments}
                onBook={handleBookAppointment}
                onCancel={handleCancelBroadbandItem}
                discountedMonthlyTotal={savedDiscountedMonthlyTotal ?? (appliedBroadbandVoucher && broadbandDiscount > 0 ? payMonthlyTotal : undefined)}
                broadbandDiscount={savedBroadbandDiscount ?? broadbandDiscount}
              />
            )}
          </div>

          {/* Common actions — shown when everything is complete */}
          {(() => {
            const devDone = !session.hasDevices || devicePaid;
            const bbDone = !session.hasBroadbandService || (
              session.serviceItems.length > 0 &&
              session.serviceItems.every(item =>
                session.broadbandBookingStatus[item.cartItemId] &&
                session.broadbandBookingStatus[item.cartItemId] !== 'unbooked'
              )
            );
            if (devDone && bbDone) {
              return (
                <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f9fafb', border: '1px solid var(--border)', borderRadius: '12px', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <Link href="/orders" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
                    View Order Details
                  </Link>
                  <Link href="/bills" className="btn" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem', border: '1.5px solid var(--primary)', color: 'var(--primary)', background: 'transparent' }}>
                    My Active Bills
                  </Link>
                  <Link href="/products" className="btn" style={{ padding: '0.7rem 1.5rem', fontSize: '0.9rem', border: '1.5px solid #e5e7eb', color: '#6b7280', background: 'transparent' }}>
                    Continue Shopping
                  </Link>
                </div>
              );
            }
            return null;
          })()}
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

