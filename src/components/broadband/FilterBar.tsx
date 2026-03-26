'use client';

import { useState } from 'react';

export interface Filters {
  speedTier: string | null;
  contractLength: number | null;
  planType: string | null;
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const SPEED_TIERS = ['Fibre', 'Superfast', 'Ultrafast'];
const CONTRACT_LENGTHS = [12, 24];
const PLAN_TYPES = ['Core', 'Standard', 'Premium', 'Ultimate'];

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '0.4rem 0.85rem',
        borderRadius: '20px',
        border: active ? '2px solid var(--primary)' : '1.5px solid var(--border)',
        background: active ? '#f0fafa' : 'var(--background)',
        color: active ? 'var(--primary)' : '#374151',
        fontWeight: active ? 600 : 400,
        fontSize: '0.82rem',
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: filters[key] === value ? null : value });
  };

  const hasActiveFilters = filters.speedTier !== null || filters.contractLength !== null || filters.planType !== null;

  const filterContent = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Speed
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {SPEED_TIERS.map((tier) => (
            <FilterToggle key={tier} label={tier} active={filters.speedTier === tier} onClick={() => toggle('speedTier', tier)} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Contract
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CONTRACT_LENGTHS.map((len) => (
            <FilterToggle key={len} label={`${len} months`} active={filters.contractLength === len} onClick={() => toggle('contractLength', len)} />
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Plan Type
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {PLAN_TYPES.map((type) => (
            <FilterToggle key={type} label={type} active={filters.planType === type} onClick={() => toggle('planType', type)} />
          ))}
        </div>
      </div>
      {hasActiveFilters && (
        <button
          onClick={() => onChange({ speedTier: null, contractLength: null, planType: null })}
          style={{
            alignSelf: 'flex-start',
            padding: '0.3rem 0.7rem',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: '#ef4444',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Mobile toggle — visible below 768px */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="filter-bar-toggle"
        style={{
          display: 'none',
          width: '100%',
          padding: '0.6rem 1rem',
          borderRadius: '8px',
          border: '1.5px solid var(--border)',
          background: 'var(--background)',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
          color: '#374151',
          textAlign: 'left' as const,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Filters{hasActiveFilters ? ' (active)' : ''}</span>
        <span style={{ fontSize: '0.7rem' }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Desktop: always visible. Mobile: toggled */}
      <div className="filter-bar-content" style={{ display: expanded ? 'block' : undefined }}>
        {filterContent}
      </div>

      <style>{`
        @media (max-width: 767px) {
          .filter-bar-toggle { display: flex !important; }
          .filter-bar-content { display: ${expanded ? 'block' : 'none'} !important; margin-top: 0.5rem; }
        }
      `}</style>
    </div>
  );
}

export { SPEED_TIERS, CONTRACT_LENGTHS, PLAN_TYPES };
