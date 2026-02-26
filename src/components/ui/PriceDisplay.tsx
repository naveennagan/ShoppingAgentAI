export interface PriceDisplayProps {
    originalPrice: number;
    discountedPrice?: number | null;
    promotionalLabel?: string | null;
}

export default function PriceDisplay({ originalPrice, discountedPrice, promotionalLabel }: PriceDisplayProps) {
    const hasDiscount = discountedPrice != null && discountedPrice > 0 && originalPrice > 0 && discountedPrice < originalPrice;

    if (!hasDiscount) {
        return (
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                £{originalPrice.toFixed(2)}
            </span>
        );
    }

    return (
        <div>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ef4444' }}>
                £{discountedPrice!.toFixed(2)}
            </span>
            <span style={{ fontSize: '0.9rem', color: '#9ca3af', textDecoration: 'line-through', marginLeft: '0.5rem' }}>
                £{originalPrice.toFixed(2)}
            </span>
            {promotionalLabel && (
                <span style={{
                    background: '#ef4444',
                    color: '#fff',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    marginLeft: '0.5rem',
                }}>
                    {promotionalLabel}
                </span>
            )}
        </div>
    );
}
