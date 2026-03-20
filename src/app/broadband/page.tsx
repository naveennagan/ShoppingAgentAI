'use client';

import JourneyWizard from '@/components/broadband/JourneyWizard';

export default function BroadbandPage() {
  return (
    <main style={{
      padding: '2rem 1rem',
      maxWidth: '900px',
      marginLeft: 'auto',
      marginRight: 'auto',
    }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Broadband
        </h1>
        <p style={{ color: '#6b7280' }}>
          Find and customise the perfect broadband package for your home.
        </p>
      </header>

      <JourneyWizard />
    </main>
  );
}
