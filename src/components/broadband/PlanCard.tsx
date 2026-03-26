'use client';

import { useState } from 'react';
import { BroadbandPlan, BroadbandAddon } from '@/types/broadband';
import { ChevronUp } from 'lucide-react';

interface PlanCardProps {
  plan: BroadbandPlan;
  addons: BroadbandAddon[];
  onAddToCart: (plan: BroadbandPlan, selectedAddons: BroadbandAddon[]) => void;
  adding?: boolean;
}

export default function PlanCard({ plan, addons, onAddToCart, adding = false }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedAddons = addons.filter(a => selectedAddonIds.has(a.id));
  const addonTotal = selectedAddons.reduce((s, a) => s + a.monthlyPrice, 0);
  const totalMonthly = plan.monthlyPrice + addonTotal;

  const handleConfirm = () => {
    onAddToCart(plan, selectedAddons);
    setExpanded(false);
    setSelectedAddonIds(new Set());
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
      {plan.promotionalLabel && (
        <span style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))',
          color: 'white', fontSize: '0.72rem', fontWeight: 700,
          padding: '0.2rem 0.6rem', borderRadius: '999px',
        }}>
          {plan.promotionalLabel}
        </span>
      )}

      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, paddingRight: plan.promotionalLabel ? '6rem' : 0 }}>
        {plan.name}
      </h3>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Stat label="Download" value={`${plan.downloadSpeedMbps} Mbps`} />
        <Stat label="Upload" value={`${plan.uploadSpeedMbps} Mbps`} />
        <Stat label="Technology" value={plan.technologyType} />
        <Stat label="Contract" value={`${plan.contractLengthMonths} months`} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>
          £{totalMonthly.toFixed(2)}<span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#6b7280' }}>/mo</span>
        </span>
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            disabled={adding}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
          >
            {adding ? 'Adding…' : 'Add to Cart'}
          </button>
        ) : (
          <button
            onClick={() => setExpanded(false)}
            className="btn"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', border: '1.5px solid #e5e7eb', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ChevronUp size={14} /> Close
          </button>
        )}
      </div>

      {/* Addon picker */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.25rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.82rem', color: '#374151', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Optional Add-ons
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {addons.map(addon => {
              const selected = selectedAddonIds.has(addon.id);
              return (
                <button
                  key={addon.id}
                  onClick={() => toggleAddon(addon.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.65rem 0.85rem', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                    border: selected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    background: selected ? '#f0fafa' : 'var(--background)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                      border: selected ? '2px solid var(--primary)' : '2px solid #d1d5db',
                      background: selected ? 'var(--primary)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{addon.name}</p>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#6b7280' }}>{addon.description}</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--primary)', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
                    +£{addon.monthlyPrice.toFixed(2)}/mo
                  </span>
                </button>
              );
            })}
          </div>

          {selectedAddons.length > 0 && (
            <div style={{ background: '#f3f4f6', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.85rem', color: '#374151' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>Plan + {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''}</span>
                <span style={{ color: 'var(--primary)' }}>£{totalMonthly.toFixed(2)}/mo</span>
              </div>
            </div>
          )}

          <button
            onClick={handleConfirm}
            disabled={adding}
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
          >
            {adding ? 'Adding…' : selectedAddons.length > 0 ? `Add to Cart — £${totalMonthly.toFixed(2)}/mo` : 'Add to Cart (no add-ons)'}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{value}</div>
    </div>
  );
}
