'use client';

export interface SuggestionChipProps {
  label: string;
  onClick: (label: string) => void;
}

export default function SuggestionChip({ label, onClick }: SuggestionChipProps) {
  return (
    <button
      onClick={() => onClick(label)}
      style={{
        padding: '0.4rem 0.85rem',
        background: 'var(--surface)',
        color: 'var(--primary)',
        border: '1px solid var(--primary)',
        borderRadius: '999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background 0.2s, color 0.2s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--primary)';
        e.currentTarget.style.color = 'white';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface)';
        e.currentTarget.style.color = 'var(--primary)';
      }}
    >
      {label}
    </button>
  );
}
