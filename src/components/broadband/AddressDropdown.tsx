'use client';

import { BroadbandAddress } from '@/types/broadband';

interface AddressDropdownProps {
  addresses: BroadbandAddress[];
  selectedUprn: string | null;
  onChange: (address: BroadbandAddress) => void;
}

export default function AddressDropdown({ addresses, selectedUprn, onChange }: AddressDropdownProps) {
  if (addresses.length === 0) {
    return (
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.5rem' }}>
        No addresses found for that postcode.
      </p>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = addresses.find(a => a.uprn === e.target.value);
    if (selected) onChange(selected);
  };

  return (
    <div>
      <label htmlFor="address-select" style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
        Select your address
      </label>
      <select
        id="address-select"
        value={selectedUprn ?? ''}
        onChange={handleChange}
        style={{
          width: '100%',
          padding: '0.7rem 1rem',
          border: '1.5px solid var(--border)',
          borderRadius: '8px',
          fontSize: '0.95rem',
          background: 'var(--surface)',
          color: 'var(--foreground)',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <option value="" disabled>— Choose an address —</option>
        {addresses.map(addr => (
          <option key={addr.uprn} value={addr.uprn}>
            {addr.formattedAddress}, {addr.town}, {addr.postcode}
          </option>
        ))}
      </select>
    </div>
  );
}
