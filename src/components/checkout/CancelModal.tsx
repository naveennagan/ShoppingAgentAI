'use client';

interface Props {
  isOpen: boolean;
  target: 'devices' | 'broadband' | null;
  onConfirm: () => void;
  onClose: () => void;
}

export default function CancelModal({ isOpen, target, onConfirm, onClose }: Props) {
  if (!isOpen || !target) return null;

  const isDevices = target === 'devices';
  const title = isDevices ? 'Remove devices from order?' : 'Cancel broadband?';
  const body = isDevices
    ? 'This will remove all device items from your order. You can add them back from the cart.'
    : 'This will cancel your broadband plan from this order. You can add it again from the Broadband page.';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }} onClick={onClose}>
      <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{isDevices ? '📦' : '📡'}</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>{title}</h2>
        <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.75rem' }}>{body}</p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={onConfirm} className="btn" style={{
            padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white',
            border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
          }}>
            Yes, remove
          </button>
          <button onClick={onClose} className="btn" style={{
            padding: '0.75rem 1.5rem', border: '1.5px solid #e5e7eb', color: '#374151',
            background: 'transparent', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem',
          }}>
            Keep it
          </button>
        </div>
      </div>
    </div>
  );
}
