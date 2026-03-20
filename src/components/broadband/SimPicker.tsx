'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction, SimPlan } from '@/types/broadband';

interface SimPickerProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export default function SimPicker({ state, dispatch, advanceStep }: SimPickerProps) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchSimPlans = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const plans = await apiClient.getSimPlans();
        if (!cancelled) {
          dispatch({ type: 'SET_SIM_PLANS', payload: plans });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load SIM plans.');
          setLoading(false);
        }
      }
    };

    if (state.simPlans.length === 0) {
      fetchSimPlans();
    }

    return () => { cancelled = true; };
  }, [dispatch, state.simPlans.length]);

  const handleSelect = (plan: SimPlan) => {
    const alreadySelected = state.selectedSimPlan?.id === plan.id;
    dispatch({ type: 'SELECT_SIM_PLAN', payload: alreadySelected ? null : plan });
  };

  const handleContinue = () => {
    advanceStep(6);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading SIM plans…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setFetchError(null); dispatch({ type: 'SET_SIM_PLANS', payload: [] }); }}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px', border: '1.5px solid var(--primary)', background: 'var(--primary)', color: '#fff', cursor: 'pointer' }}
          >
            Retry
          </button>
          <button
            onClick={handleContinue}
            style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
        Bundle a SIM plan with your broadband (optional).
      </p>

      <div className="sim-grid" style={{ display: 'grid', gap: '0.75rem' }}>
        {state.simPlans.map((plan) => {
          const isSelected = state.selectedSimPlan?.id === plan.id;
          return (
            <button
              key={plan.id}
              onClick={() => handleSelect(plan)}
              aria-pressed={isSelected}
              style={{
                display: 'block', width: '100%', textAlign: 'left' as const, padding: '1rem', borderRadius: '10px', cursor: 'pointer',
                border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                background: isSelected ? '#f0fafa' : 'var(--background)',
                transition: 'all 0.15s', position: 'relative' as const,
              }}
              onMouseEnter={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; } }}
              onMouseLeave={(e) => { if (!isSelected) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              {isSelected && (
                <span style={{ position: 'absolute', top: '0.5rem', right: '0.75rem', fontSize: '1rem', color: 'var(--primary)' }}>✓</span>
              )}
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>{plan.name}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                {plan.isUnlimited ? 'Unlimited data' : plan.description}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.4rem' }}>Max speed: {plan.maxSpeed}</div>
              {!plan.isUnlimited && plan.description && (
                <div style={{ fontSize: '0.78rem', color: '#9ca3af', marginBottom: '0.4rem' }}>{plan.description}</div>
              )}
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                £{plan.monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
        <button
          onClick={handleContinue}
          style={{ flex: 1, padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
        >
          Continue
        </button>
        {!state.selectedSimPlan && (
          <button
            onClick={handleContinue}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
          >
            No SIM plan
          </button>
        )}
      </div>

      <style>{`
        .sim-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) { .sim-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .sim-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}
