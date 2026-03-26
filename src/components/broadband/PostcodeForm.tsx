'use client';

import { useState } from 'react';

interface PostcodeFormProps {
  onSubmit: (postcode: string) => void;
  loading?: boolean;
}

export default function PostcodeForm({ onSubmit, loading = false }: PostcodeFormProps) {
  const [postcode, setPostcode] = useState('');
  const [error, setError] = useState('');

  const validate = (value: string): string => {
    const trimmed = value.trim();
    if (trimmed.length < 5 || trimmed.length > 8) {
      return 'Please enter a valid UK postcode (5–8 characters).';
    }
    return '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate(postcode);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    onSubmit(postcode.trim().toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <input
            type="text"
            value={postcode}
            onChange={e => { setPostcode(e.target.value); setError(''); }}
            placeholder="e.g. SW1A 1AA"
            aria-label="Postcode"
            aria-describedby={error ? 'postcode-error' : undefined}
            aria-invalid={!!error}
            maxLength={8}
            style={{
              width: '100%',
              padding: '0.7rem 1rem',
              border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: '8px',
              fontSize: '1rem',
              background: 'var(--surface)',
              color: 'var(--foreground)',
              outline: 'none',
              textTransform: 'uppercase',
            }}
          />
          {error && (
            <p id="postcode-error" role="alert" style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.35rem' }}>
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
          style={{ padding: '0.7rem 1.5rem', fontSize: '1rem', whiteSpace: 'nowrap' }}
        >
          {loading ? 'Searching…' : 'Find Address'}
        </button>
      </div>
    </form>
  );
}
