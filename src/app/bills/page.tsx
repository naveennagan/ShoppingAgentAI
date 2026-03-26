'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Wifi } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import type { Subscription } from '@/types/checkout';

function formatGBP(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function computeDueDate(sub: Subscription): string {
  if (sub.status === 'active' && sub.activatedAt) {
    const base = new Date(sub.activatedAt);
    base.setMonth(base.getMonth() + 1);
    return base.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return 'After installation';
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: '#dcfce7', color: '#15803d', label: 'Active' },
    inactive:  { bg: '#fef9c3', color: '#854d0e', label: 'Pending Installation' },
    cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
  };
  const s = map[status] ?? map.inactive;
  return (
    <span style={{ padding: '0.25rem 0.7rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default function BillsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubscriptions = useCallback(async () => {
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) { setLoading(false); return; }

    setError('');
    setLoading(true);
    try {
      const data = await apiClient.getSubscriptions(sessionId);
      setSubscriptions(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscriptions(); }, [fetchSubscriptions]);

  if (loading) return (
    <main className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
      <p style={{ color: '#6b7280' }}>Loading your bills…</p>
    </main>
  );

  return (
    <main className="container" style={{ padding: '2rem 0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>My Active Bills</h1>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Your broadband subscriptions and upcoming payments.</p>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: '#b91c1c', fontSize: '0.9rem', margin: 0 }}>Failed to load bills: {error}</p>
          <button
            onClick={fetchSubscriptions}
            style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {!error && subscriptions.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <Wifi size={40} color="#d1d5db" style={{ marginBottom: '1rem' }} />
          <p style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.5rem' }}>No active broadband subscriptions.</p>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.5rem' }}>
            Once you complete a broadband order, your subscription will appear here.
          </p>
          <Link href="/broadband" className="btn btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
            Browse Broadband Plans
          </Link>
        </div>
      )}

      {!error && subscriptions.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Product Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Due Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Payment Amount</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Breakdown</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map(sub => (
                <tr key={sub.subscriptionId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{sub.planName || 'Broadband Plan'}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{computeDueDate(sub)}</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--primary)' }}>{formatGBP(sub.monthlyPrice)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#6b7280' }}>{sub.planName || 'Broadband Plan'} — {formatGBP(sub.monthlyPrice)}/mo</td>
                  <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={sub.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
