'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction, BroadbandAddress } from '@/types/broadband';

interface AddressSelectorProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export default function AddressSelector({ state, dispatch, advanceStep }: AddressSelectorProps) {
  const [selected, setSelected] = useState<BroadbandAddress | null>(state.selectedAddress);

  const handleSelect = (address: BroadbandAddress) => {
    setSelected(address);
    dispatch({ type: 'SELECT_ADDRESS', payload: address });
  };

  const handleGetDeals = async () => {
    if (!selected) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const plans = await apiClient.getPlansForAddress(selected.uprn);

      if (plans.length === 0) {
        dispatch({ type: 'SET_ERROR', payload: 'Broadband is not available at this address.' });
        return;
      }

      dispatch({ type: 'SET_PLANS', payload: plans });
      advanceStep(2);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch deals.';
      const isIneligible = message.toLowerCase().includes('ineligib') || message.toLowerCase().includes('not available');
      dispatch({
        type: 'SET_ERROR',
        payload: isIneligible
          ? 'Broadband is not available at this address.'
          : 'Could not load deals. Please try again.',
      });
    }
  };

  const needsScroll = state.addresses.length > 10;

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
        Select your address from the list below.
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          ...(needsScroll ? { maxHeight: '400px', overflowY: 'auto' as const, paddingRight: '0.25rem' } : {}),
        }}
      >
        {state.addresses.map((address) => {
          const isSelected = selected?.uprn === address.uprn;
          return (
            <button
              key={address.uprn}
              onClick={() => handleSelect(address)}
              aria-pressed={isSelected}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                border: isSelected ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                background: isSelected ? '#f0fafa' : 'var(--background)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                {address.formattedAddress}
              </p>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                {address.town}, {address.postcode}
              </p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div style={{ marginTop: '1rem' }}>
          <button
            onClick={handleGetDeals}
            disabled={state.loading}
            className="btn btn-primary"
            style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', width: '100%' }}
          >
            {state.loading ? 'Loading deals…' : 'Get My Deals'}
          </button>
        </div>
      )}

      {state.error && (
        <div role="alert" style={{ marginTop: '0.6rem' }}>
          <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{state.error}</p>
        </div>
      )}
    </div>
  );
}
