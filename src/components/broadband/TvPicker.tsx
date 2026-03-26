'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction, TvPackage } from '@/types/broadband';

interface TvPickerProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export default function TvPicker({ state, dispatch, advanceStep }: TvPickerProps) {
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchTvPackages = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const packages = await apiClient.getTvPackages();
        if (!cancelled) {
          dispatch({ type: 'SET_TV_PACKAGES', payload: packages });
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setFetchError('Failed to load TV packages.');
          setLoading(false);
        }
      }
    };

    if (state.tvPackages.length === 0) {
      fetchTvPackages();
    }

    return () => { cancelled = true; };
  }, [dispatch, state.tvPackages.length]);

  const handleSelect = (pkg: TvPackage) => {
    const alreadySelected = state.selectedTvPackage?.id === pkg.id;
    dispatch({ type: 'SELECT_TV_PACKAGE', payload: alreadySelected ? null : pkg });
  };

  const handleContinue = () => {
    advanceStep(5);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading TV packages…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div>
        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{fetchError}</p>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => { setFetchError(null); dispatch({ type: 'SET_TV_PACKAGES', payload: [] }); }}
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
        Add a TV package to your broadband (optional).
      </p>

      <div className="tv-grid" style={{ display: 'grid', gap: '0.75rem' }}>
        {state.tvPackages.map((pkg) => {
          const isSelected = state.selectedTvPackage?.id === pkg.id;
          return (
            <button
              key={pkg.id}
              onClick={() => handleSelect(pkg)}
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
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>{pkg.name}</div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.4rem' }}>{pkg.description}</div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.4rem' }}>{pkg.channelCount} channels</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                {pkg.monthlyPrice === 0 ? 'Included' : `£${pkg.monthlyPrice.toFixed(2)}`}
                {pkg.monthlyPrice > 0 && <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>}
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
        {!state.selectedTvPackage && (
          <button
            onClick={handleContinue}
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', borderRadius: '8px', border: '1.5px solid var(--border)', background: 'transparent', color: '#6b7280', cursor: 'pointer' }}
          >
            No TV package
          </button>
        )}
      </div>

      <style>{`
        .tv-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) { .tv-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .tv-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}
