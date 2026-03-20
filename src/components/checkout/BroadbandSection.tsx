'use client';

import { useState, useMemo } from 'react';
import { CheckoutSession, Appointment } from '@/types/checkout';
import { CheckCircle, Calendar, X } from 'lucide-react';

interface Props {
  session: CheckoutSession;
  appointments: Record<string, Appointment>;
  onBook: (date: string, slot: string, broadbandItemId: string) => Promise<void>;
  onCancel: (broadbandItemId: string) => void;
}

const SLOTS = [
  { id: 'morning', label: 'Morning', timeRange: '8am – 1pm' },
  { id: 'afternoon', label: 'Afternoon', timeRange: '1pm – 6pm' },
];

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }
function displayDate(d: Date) { return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }); }
function formatFullDate(iso: string) { return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function formatSlot(s: string) { return s === 'morning' ? 'Morning (8am – 1pm)' : 'Afternoon (1pm – 6pm)'; }

function nextDueDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function BroadbandSection({ session, appointments, onBook, onCancel }: Props) {
  const { broadbandBookingStatus, serviceItems } = session;

  const allBooked = serviceItems.length > 0 &&
    serviceItems.every(item => broadbandBookingStatus[item.cartItemId] && broadbandBookingStatus[item.cartItemId] !== 'unbooked');

  // Combined confirmation summary when ALL items are booked
  if (allBooked) {
    return (
      <div className="card" style={{ background: '#f0fafa', border: '1.5px solid #b2d4d6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <CheckCircle size={28} color="#3D7A7F" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', margin: 0, color: '#1e4e52' }}>All broadband installations booked!</p>
          </div>
        </div>

        {/* Per-item confirmation details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {serviceItems.map(item => {
            const appt = appointments[item.cartItemId];
            const confirmedDate = appt?.confirmedDate || appt?.preferredDate || '';
            return (
              <div key={item.cartItemId} style={{ background: 'white', border: '1px solid #b2d4d6', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', margin: 0, color: '#1e4e52' }}>{item.displayName}</p>
                    {confirmedDate && appt && (
                      <p style={{ color: '#4b5563', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
                        {formatFullDate(confirmedDate)} · {formatSlot(appt.preferredTimeSlot)}
                      </p>
                    )}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>£{item.unitPrice.toFixed(2)}/mo</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly bill summary */}
        <div style={{ background: 'white', border: '1px solid #b2d4d6', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.75rem', color: '#374151' }}>Monthly Bill Summary</p>
          {serviceItems.map(item => (
            <div key={item.cartItemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.4rem' }}>
              <span style={{ color: '#4b5563' }}>{item.displayName}</span>
              <span style={{ fontWeight: 600 }}>£{item.unitPrice.toFixed(2)}/mo</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.6rem', marginTop: '0.4rem', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>Monthly total</span>
            <span style={{ color: 'var(--primary)' }}>£{session.monthlyTotal.toFixed(2)}/mo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.82rem', color: '#6b7280' }}>
            <span>Next payment due</span>
            <span style={{ fontWeight: 600 }}>{nextDueDate()}</span>
          </div>
        </div>

        
      </div>
    );
  }

  // Render each service item as a separate bookable card
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {serviceItems.map(item => {
        const status = broadbandBookingStatus[item.cartItemId] || 'unbooked';
        const isBooked = status !== 'unbooked';
        const appt = appointments[item.cartItemId];

        if (isBooked) {
          return (
            <BookedItemCard
              key={item.cartItemId}
              itemName={item.displayName}
              unitPrice={item.unitPrice}
              appointment={appt}
              onCancel={() => onCancel(item.cartItemId)}
            />
          );
        }

        return (
          <UnbookedItemCard
            key={item.cartItemId}
            itemId={item.cartItemId}
            itemName={item.displayName}
            itemSummary={item.displaySummary}
            unitPrice={item.unitPrice}
            onBook={onBook}
            onCancel={() => onCancel(item.cartItemId)}
          />
        );
      })}
    </div>
  );
}


/* ─── Booked item card ─── */
function BookedItemCard({ itemName, unitPrice, appointment, onCancel }: {
  itemName: string;
  unitPrice: number;
  appointment?: Appointment;
  onCancel: () => void;
}) {
  const confirmedDate = appointment?.confirmedDate || appointment?.preferredDate || '';
  return (
    <div className="card" style={{ background: '#f0fafa', border: '1.5px solid #b2d4d6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle size={22} color="#3D7A7F" />
          <div>
            <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0, color: '#1e4e52' }}>{itemName}</p>
            {confirmedDate && appointment && (
              <p style={{ color: '#4b5563', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
                {formatFullDate(confirmedDate)} · {formatSlot(appointment.preferredTimeSlot)}
              </p>
            )}
            <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0.15rem 0 0' }}>
              £{unitPrice.toFixed(2)}/mo
            </p>
          </div>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }} title="Cancel this plan">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/* ─── Unbooked item card with its own date/slot picker ─── */
function UnbookedItemCard({ itemId, itemName, itemSummary, unitPrice, onBook, onCancel }: {
  itemId: string;
  itemName: string;
  itemSummary?: string;
  unitPrice: number;
  onBook: (date: string, slot: string, broadbandItemId: string) => Promise<void>;
  onCancel: () => void;
}) {
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1);
      return d;
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [subStep, setSubStep] = useState<'picker' | 'confirm'>('picker');

  const handleConfirmClick = () => {
    if (!selectedDate || !selectedSlot) return;
    setSubStep('confirm');
  };

  const handleBook = async () => {
    setError('');
    setLoading(true);
    try {
      await onBook(selectedDate, selectedSlot, itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book. Please try again.');
      setSubStep('picker');
    } finally {
      setLoading(false);
    }
  };

  // Confirmation sub-step
  if (subStep === 'confirm') {
    return (
      <div className="card" style={{ border: '1.5px solid #b2d4d6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Confirm Installation — {itemName}</h2>
        </div>
        <div style={{ background: '#f0fafa', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}>
          <p style={{ margin: '0 0 0.35rem', fontWeight: 600, fontSize: '0.95rem' }}>{formatFullDate(selectedDate)}</p>
          <p style={{ margin: 0, color: '#6b7280', fontSize: '0.88rem' }}>{formatSlot(selectedSlot)}</p>
        </div>
        <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0.85rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#4b5563', fontSize: '0.9rem' }}>Monthly from installation</span>
          <span style={{ fontWeight: 800 }}>£{unitPrice.toFixed(2)}/mo</span>
        </div>
        <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          By confirming, you agree to the broadband subscription. First payment due after successful installation.
        </p>
        {error && <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handleBook} disabled={loading} className="btn btn-primary" style={{ flex: 1, padding: '0.85rem', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Booking…' : 'Yes, confirm installation'}
          </button>
          <button onClick={() => setSubStep('picker')} className="btn" style={{ padding: '0.85rem 1.25rem', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // Picker sub-step
  return (
    <div className="card" style={{ border: '1.5px solid #b2d4d6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Calendar size={18} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Schedule Installation — {itemName}</h2>
        </div>
        <button onClick={onCancel} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem', border: '1.5px solid #e5e7eb', color: '#6b7280' }}>
          Cancel
        </button>
      </div>
      {itemSummary && <p style={{ color: '#4b5563', fontSize: '0.82rem', margin: '0.15rem 0 0.5rem' }}>{itemSummary}</p>}
      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
        Choose a date and time for your engineer visit. <strong>£{unitPrice.toFixed(2)}/mo</strong>
      </p>

      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#374151', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select a date</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: '0.4rem' }}>
          {dates.map(date => {
            const iso = isoDate(date);
            const active = selectedDate === iso;
            return (
              <button key={iso} onClick={() => setSelectedDate(iso)} style={{
                padding: '0.55rem 0.4rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '0.8rem', transition: 'all 0.15s',
                border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                background: active ? 'var(--primary)' : 'var(--background)',
                color: active ? 'white' : 'var(--foreground)', fontWeight: active ? 700 : 500,
              }}>{displayDate(date)}</button>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#374151', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Select a time slot</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {SLOTS.map(slot => {
            const active = selectedSlot === slot.id;
            return (
              <button key={slot.id} onClick={() => setSelectedSlot(slot.id)} style={{
                flex: 1, padding: '0.7rem 1rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                background: active ? 'var(--primary)' : 'var(--background)',
                color: active ? 'white' : 'var(--foreground)', fontWeight: active ? 700 : 500,
              }}>
                <div style={{ fontSize: '0.9rem' }}>{slot.label}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.1rem' }}>{slot.timeRange}</div>
              </button>
            );
          })}
        </div>
      </div>

      <button onClick={handleConfirmClick} disabled={!selectedDate || !selectedSlot} className="btn btn-primary"
        style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', opacity: (!selectedDate || !selectedSlot) ? 0.5 : 1 }}>
        Continue to Confirm
      </button>
    </div>
  );
}
