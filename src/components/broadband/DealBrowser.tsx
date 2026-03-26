'use client';

import { useState, useMemo } from 'react';
import type { JourneyState, JourneyAction, BroadbandPlan } from '@/types/broadband';
import FilterBar, { type Filters } from './FilterBar';

interface DealBrowserProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

function getSpeedTier(downloadSpeedMbps: number): string {
  if (downloadSpeedMbps >= 300) return 'Ultrafast';
  if (downloadSpeedMbps >= 80) return 'Superfast';
  return 'Fibre';
}

function applyFilters(plans: BroadbandPlan[], filters: Filters): BroadbandPlan[] {
  return plans.filter((plan) => {
    if (filters.speedTier && getSpeedTier(plan.downloadSpeedMbps) !== filters.speedTier) return false;
    if (filters.contractLength && plan.contractLengthMonths !== filters.contractLength) return false;
    if (filters.planType && plan.planType !== filters.planType) return false;
    return true;
  });
}

function sortByPrice(plans: BroadbandPlan[]): BroadbandPlan[] {
  return [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);
}

export default function DealBrowser({ state, dispatch, advanceStep }: DealBrowserProps) {
  const [filters, setFilters] = useState<Filters>({ speedTier: null, contractLength: null, planType: null });
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedPlan?.planId ?? null);

  const filteredPlans = useMemo(() => sortByPrice(applyFilters(state.plans, filters)), [state.plans, filters]);

  const handleSelect = (plan: BroadbandPlan) => {
    setSelectedId(plan.planId);
    dispatch({ type: 'SELECT_PLAN', payload: plan });
    advanceStep(3);
  };

  const clearFilters = () => setFilters({ speedTier: null, contractLength: null, planType: null });

  if (state.error) {
    return (
      <div>
        <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0 0 0.75rem 0' }}>{state.error}</p>
        <button className="btn btn-primary" onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <FilterBar filters={filters} onChange={setFilters} />

      <p style={{ color: '#6b7280', fontSize: '0.82rem', margin: '0 0 0.75rem 0' }}>
        {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''} available
      </p>

      {filteredPlans.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 0.5rem 0' }}>No plans match your filters.</p>
          <button
            onClick={clearFilters}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              border: '1.5px solid var(--primary)',
              background: 'transparent',
              color: 'var(--primary)',
              fontSize: '0.85rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        </div>
      )}

      {filteredPlans.length > 0 && (
        <div className="deal-grid" style={{ display: 'grid', gap: '0.75rem' }}>
          {filteredPlans.map((plan) => {
            const isSelected = selectedId === plan.planId;
            return (
              <button
                key={plan.planId}
                onClick={() => handleSelect(plan)}
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
                {plan.promotionalLabel && (
                  <span style={{
                    display: 'inline-block',
                    padding: '0.15rem 0.55rem',
                    borderRadius: '4px',
                    background: '#fef3c7',
                    color: '#92400e',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    marginBottom: '0.5rem',
                  }}>
                    {plan.promotionalLabel}
                  </span>
                )}
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: '0.3rem' }}>
                  {plan.name}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.82rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  <span>↓ {plan.downloadSpeedMbps} Mbps</span>
                  <span>↑ {plan.uploadSpeedMbps} Mbps</span>
                  <span>{plan.technologyType}</span>
                  <span>{plan.contractLengthMonths} months</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>
                  £{plan.monthlyPrice.toFixed(2)}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#6b7280' }}>/mo</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .deal-grid { grid-template-columns: 1fr; }
        @media (min-width: 768px) { .deal-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .deal-grid { grid-template-columns: repeat(3, 1fr); } }
      `}</style>
    </div>
  );
}

export { getSpeedTier, applyFilters, sortByPrice };
