'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction, BroadbandAddon } from '@/types/broadband';

interface AddonPickerProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export default function AddonPicker({ state, dispatch, advanceStep }: AddonPickerProps) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const planType = state.selectedPlan?.planType ?? null;

  useEffect(() => {
    if (!planType) return;
    let cancelled = false;

    const fetchAddons = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const addons = await apiClient.getAddons(planType);
        if (!cancelled) {
          dispatch({ type: 'SET_ADDONS_LIST', payload: addons });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load add-ons.');
          setLoading(false);
        }
      }
    };

    // Only fetch if we don't already have addons loaded
    if (state.addonsList.length === 0) {
      fetchAddons();
    }

    return () => { cancelled = true; };
  }, [planType, dispatch, state.addonsList.length]);

  const subtotal = state.selectedAddons.reduce((sum, a) => sum + a.monthlyPrice, 0);

  const handleToggle = (addon: BroadbandAddon) => {
    dispatch({ type: 'TOGGLE_ADDON', payload: addon });
  };

  const handleContinue = () => {
    advanceStep(4);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading add-ons…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => {
              setFetchError(null);
              dispatch({ type: 'SET_ADDONS_LIST', payload: [] });
            }}
            style={{
              padding: '0.5rem 1.2rem',
              fontSize: '0.9rem',
              borderRadius: '8px',
              border: '1.5px solid var(--primary)',
              background: 'var(--primary)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
          <button
            onClick={handleContinue}
            style={{
              padding: '0.5rem 1.2rem',
              fontSize: '0.9rem',
              borderRadius: '8px',
              border: '1.5px solid var(--border)',
              background: 'transparent',
              color: '#6b7280',
              cursor: 'pointer',
            }}
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
        Enhance your plan with optional add-ons.
      </p>

      {state.addonsList.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>
            No add-ons available for this plan.
          </p>
          <button
            onClick={handleContinue}
            style={{
              padding: '0.5rem 1.2rem',
              fontSize: '0.9rem',
              borderRadius: '8px',
              border: '1.5px solid var(--primary)',
              background: 'var(--primary)',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Continue
          </button>
        </div>
      ) : (
        <>
          <div className="addon-grid" style={{ display: 'grid', gap: '0.75rem' }}>
            {state.addonsList.map((addon) => {
              const isSelected = state.selectedAddons.some(a => a.id === addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => handleToggle(addon)}
                  aria-pressed={isSelected}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left' as const,
                    padding: '1rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    background: isSelected ? '#f0fafa' : 'var(--background)',
                    transition: 'all 0.15s',
                    position: 'relative' as const,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {isSelected && (
                    <span style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.75rem',
                      fontSize: '1rem',
                      color: 'var(--primary)',
                    }}>
                      ✓
                    </span>
                  )}
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>
                    {addon.name}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.4rem' }}>
                    {addon.description}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                    £{addon.monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>
                  </div>
                </button>
              );
            })}
          </div>

          {state.selectedAddons.length > 0 && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              background: '#f9fafb',
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {state.selectedAddons.length} add-on{state.selectedAddons.length !== 1 ? 's' : ''} selected
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827' }}>
                +£{subtotal.toFixed(2)}/mo
              </span>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleContinue}
              style={{
                flex: 1,
                padding: '0.65rem 1.5rem',
                fontSize: '0.95rem',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Continue
            </button>
            {state.selectedAddons.length > 0 ? null : (
              <button
                onClick={handleContinue}
                style={{
                  padding: '0.65rem 1.5rem',
                  fontSize: '0.95rem',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border)',
                  background: 'transparent',
                  color: '#6b7280',
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
            )}
          </div>
        </>
      )}

      <style>{`
        .addon-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) { .addon-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .addon-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}
