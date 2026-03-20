'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction, HomePhoneService } from '@/types/broadband';

interface PhoneServicePickerProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export default function PhoneServicePicker({ state, dispatch, advanceStep }: PhoneServicePickerProps) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchServices = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const services = await apiClient.getHomePhoneServices();
        if (!cancelled) {
          dispatch({ type: 'SET_HOME_PHONE_SERVICES', payload: services });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load home phone services.');
          setLoading(false);
        }
      }
    };

    if (state.homePhoneServices.length === 0) {
      fetchServices();
    }

    return () => { cancelled = true; };
  }, [dispatch, state.homePhoneServices.length]);

  const handleSelect = (service: HomePhoneService) => {
    const alreadySelected = state.selectedHomePhoneService?.id === service.id;
    dispatch({ type: 'SELECT_HOME_PHONE_SERVICE', payload: alreadySelected ? null : service });
  };

  const handleContinue = () => {
    advanceStep(7);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading home phone services…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setFetchError(null); dispatch({ type: 'SET_HOME_PHONE_SERVICES', payload: [] }); }}
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
        Add a home phone service to your broadband (optional).
      </p>

      <div className="phone-grid" style={{ display: 'grid', gap: '0.75rem' }}>
        {state.homePhoneServices.map((service) => {
          const isSelected = state.selectedHomePhoneService?.id === service.id;
          return (
            <button
              key={service.id}
              onClick={() => handleSelect(service)}
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
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>{service.name}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.4rem' }}>{service.description}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                {service.monthlyPrice === 0 ? 'Free' : `£${service.monthlyPrice.toFixed(2)}`}
                {service.monthlyPrice > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>}
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
        {!state.selectedHomePhoneService && (
          <button
            onClick={handleContinue}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
          >
            No home phone
          </button>
        )}
      </div>

      <style>{`
        .phone-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) { .phone-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .phone-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}
