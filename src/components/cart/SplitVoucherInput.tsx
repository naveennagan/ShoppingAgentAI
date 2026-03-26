'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';

function VoucherField({
    label,
    appliedVoucher,
    onApply,
    onRemove,
    showDuration,
}: {
    label: string;
    appliedVoucher: { promotionName: string; validTill: number | null } | null;
    onApply: (code: string) => Promise<void>;
    onRemove: () => void;
    showDuration?: boolean;
}) {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    async function handleApply() {
        if (!code.trim()) {
            setError('Please enter a voucher code.');
            return;
        }
        setError('');
        setIsLoading(true);
        try {
            await onApply(code.trim());
            setCode('');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to validate voucher code');
        } finally {
            setIsLoading(false);
        }
    }

    if (appliedVoucher) {
        return (
            <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem', display: 'block' }}>
                    {label}
                </label>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                }}>
                    <div>
                        <span style={{ color: '#15803d', fontSize: '0.9rem', fontWeight: 600 }}>
                            ✓ {appliedVoucher.promotionName}
                        </span>
                        {showDuration && appliedVoucher.validTill != null && (
                            <span style={{ color: '#15803d', fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                                (for {appliedVoucher.validTill} months)
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onRemove}
                        style={{
                            background: 'none', border: 'none', color: '#6b7280',
                            fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.25rem',
                        }}
                        aria-label={`Remove ${label.toLowerCase()} voucher`}
                    >
                        Remove
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563', marginBottom: '0.4rem', display: 'block' }}>
                {label}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="text"
                    value={code}
                    onChange={e => { setCode(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleApply()}
                    placeholder="Voucher code"
                    aria-label={`${label} voucher code`}
                    style={{
                        flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border)',
                        borderRadius: '8px', fontSize: '0.9rem', background: 'var(--surface)',
                        color: 'var(--foreground)', outline: 'none',
                    }}
                />
                <button
                    onClick={handleApply}
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                >
                    {isLoading ? 'Applying…' : 'Apply'}
                </button>
            </div>
            {error && (
                <p style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.4rem' }} role="alert">
                    {error}
                </p>
            )}
        </div>
    );
}

export default function SplitVoucherInput() {
    const {
        items,
        appliedDeviceVoucher,
        appliedBroadbandVoucher,
        applyDeviceVoucher,
        applyBroadbandVoucher,
        removeDeviceVoucher,
        removeBroadbandVoucher,
    } = useCart();

    const hasDeviceItems = items.some(item => item.item_type !== 'broadband_service');
    const hasBroadbandItems = items.some(item => item.item_type === 'broadband_service');

    if (!hasDeviceItems && !hasBroadbandItems) return null;

    return (
        <div>
            {hasDeviceItems && (
                <VoucherField
                    label="Device Voucher"
                    appliedVoucher={appliedDeviceVoucher}
                    onApply={applyDeviceVoucher}
                    onRemove={removeDeviceVoucher}
                />
            )}
            {hasBroadbandItems && (
                <VoucherField
                    label="Broadband Voucher"
                    appliedVoucher={appliedBroadbandVoucher}
                    onApply={applyBroadbandVoucher}
                    onRemove={removeBroadbandVoucher}
                    showDuration
                />
            )}
        </div>
    );
}
