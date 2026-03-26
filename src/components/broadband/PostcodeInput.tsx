'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { JourneyState, JourneyAction } from '@/types/broadband';

interface PostcodeInputProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  advanceStep: (toStep: number) => void;
}

export function validatePostcode(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 8;
}

export default function PostcodeInput({ state, dispatch, advanceStep }: PostcodeInputProps) {
  const [input, setInput] = useState(state.postcode ?? '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);

    if (!validatePostcode(input)) {
      setValidationError('Please enter a valid postcode (5–8 characters).');
      return;
    }

    const postcode = input.trim();
    dispatch({ type: 'SET_POSTCODE', payload: postcode });
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const addresses = await apiClient.getAddresses(postcode);
      dispatch({ type: 'SET_ADDRESSES', payload: addresses });

      if (addresses.length === 0) {
        dispatch({ type: 'SET_ERROR', payload: 'No addresses found for this postcode.' });
        return;
      }

      advanceStep(1);
    } catch {
      dispatch({ type: 'SET_ERROR', payload: 'Address lookup failed. Please try again.' });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const error = validationError || state.error;

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0 0 1rem 0' }}>
        Enter your postcode to check broadband availability.
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setValidationError(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="e.g. SW1A 1AA"
          aria-label="Postcode"
          aria-invalid={!!error}
          style={{
            flex: 1,
            padding: '0.65rem 0.85rem',
            borderRadius: '8px',
            border: error ? '1.5px solid #ef4444' : '1.5px solid var(--border)',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={state.loading}
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.25rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
        >
          {state.loading ? 'Searching…' : 'Find Address'}
        </button>
      </div>

      {error && (
        <div role="alert" style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0 }}>{error}</p>
          {state.error && !validationError && (
            <button
              onClick={handleSubmit}
              className="btn"
              style={{
                padding: '0.3rem 0.75rem',
                fontSize: '0.8rem',
                border: '1.5px solid #e5e7eb',
                color: 'var(--primary)',
                fontWeight: 600,
              }}
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
