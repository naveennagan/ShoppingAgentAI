'use client';

import { ReactNode } from 'react';

interface StepCardProps {
  stepIndex: number;
  stepName: string;
  active: boolean;
  completed: boolean;
  summary?: string;
  onEdit: () => void;
  children: ReactNode;
}

export default function StepCard({
  stepIndex,
  stepName,
  active,
  completed,
  summary,
  onEdit,
  children,
}: StepCardProps) {
  if (!active && !completed) return null;

  if (completed && !active) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onEdit}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(); }}
        style={{
          border: '1.5px solid var(--border)',
          borderRadius: '12px',
          padding: '0.85rem 1.1rem',
          marginBottom: '0.75rem',
          cursor: 'pointer',
          background: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div style={{
            width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
            background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.72rem', fontWeight: 700,
          }}>
            ✓
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 500 }}>Step {stepIndex + 1}: {stepName}</div>
            {summary && (
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {summary}
              </div>
            )}
          </div>
        </div>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', marginLeft: '0.75rem' }}>
          Edit
        </span>
      </div>
    );
  }

  // Active card
  return (
    <div
      className="card"
      style={{
        marginBottom: '0.75rem',
        border: '1.5px solid var(--primary)',
        borderRadius: '12px',
        padding: '1.25rem',
      }}
    >
      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Step {stepIndex + 1}: {stepName}
      </div>
      {children}
    </div>
  );
}
