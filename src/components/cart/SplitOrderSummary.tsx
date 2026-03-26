'use client';

import { useCart } from '@/context/CartContext';
import { calculateDiscountedPrice } from '@/lib/discountCalculator';
import Link from 'next/link';

function formatPrice(amount: number): string {
    return `£${amount.toFixed(2)}`;
}

export default function SplitOrderSummary() {
    const {
        items,
        payTodayTotal,
        payMonthlyTotal,
        deviceDiscount,
        broadbandDiscount,
        appliedDeviceVoucher,
        appliedBroadbandVoucher,
    } = useCart();

    const hasDeviceItems = items.some(item => item.item_type !== 'broadband_service');
    const hasBroadbandItems = items.some(item => item.item_type === 'broadband_service');

    // Device subtotal (before voucher discount)
    const deviceSubtotal = items
        .filter(item => item.item_type !== 'broadband_service')
        .reduce((sum, item) => {
            const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
            return sum + price * item.quantity;
        }, 0);

    // Broadband subtotal (before voucher discount)
    const broadbandSubtotal = items
        .filter(item => item.item_type === 'broadband_service')
        .reduce((sum, item) => {
            const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
            return sum + price * item.quantity;
        }, 0);

    // Compute discounted broadband monthly price for the duration note
    const broadbandDiscountedMonthly = appliedBroadbandVoucher
        ? items
            .filter(item => item.item_type === 'broadband_service')
            .reduce((sum, item) => {
                const price = item.promotion ? item.promotion.discountedPrice : item.product.price;
                return sum + calculateDiscountedPrice(price, appliedBroadbandVoucher.discountType, appliedBroadbandVoucher.discountValue) * item.quantity;
            }, 0)
        : broadbandSubtotal;

    const sectionStyle = { marginBottom: '1.5rem' };
    const sectionTitleStyle = { fontSize: '0.95rem', fontWeight: 700 as const, marginBottom: '0.75rem', color: 'var(--foreground)' };
    const rowStyle = { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#4b5563', fontSize: '0.9rem' };
    const discountRowStyle = { ...rowStyle, color: '#15803d' };
    const totalRowStyle = {
        display: 'flex', justifyContent: 'space-between', fontWeight: 700 as const, fontSize: '1rem',
        borderTop: '1px solid var(--border)', paddingTop: '0.5rem', marginTop: '0.25rem',
    };

    return (
        <div className="card" style={{ position: 'sticky', top: '5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Order Summary</h2>

            {hasDeviceItems && (
                <div style={sectionStyle} data-testid="pay-today-section">
                    <div style={sectionTitleStyle}>Pay Today</div>
                    <div style={rowStyle}>
                        <span>Subtotal</span>
                        <span>{formatPrice(deviceSubtotal)}</span>
                    </div>
                    {appliedDeviceVoucher && deviceDiscount > 0 && (
                        <div style={discountRowStyle}>
                            <span>{appliedDeviceVoucher.promotionName}</span>
                            <span>-{formatPrice(deviceDiscount)}</span>
                        </div>
                    )}
                    <div style={totalRowStyle}>
                        <span>Total</span>
                        <span>{formatPrice(payTodayTotal)}</span>
                    </div>
                </div>
            )}

            {hasBroadbandItems && (
                <div style={sectionStyle} data-testid="pay-monthly-section">
                    <div style={sectionTitleStyle}>Pay Monthly</div>
                    <div style={rowStyle}>
                        <span>Monthly subtotal</span>
                        <span>{formatPrice(broadbandSubtotal)}/mo</span>
                    </div>
                    {appliedBroadbandVoucher && broadbandDiscount > 0 && (
                        <div style={discountRowStyle}>
                            <span>{appliedBroadbandVoucher.promotionName}</span>
                            <span>-{formatPrice(broadbandDiscount)}/mo</span>
                        </div>
                    )}
                    <div style={totalRowStyle}>
                        <span>Monthly total</span>
                        <span>{formatPrice(payMonthlyTotal)}/mo</span>
                    </div>
                    {appliedBroadbandVoucher && appliedBroadbandVoucher.validTill != null && (
                        <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.5rem', fontStyle: 'italic' }}
                           data-testid="broadband-duration-note">
                            {formatPrice(broadbandDiscountedMonthly)}/mo for first {appliedBroadbandVoucher.validTill} months, then {formatPrice(broadbandSubtotal)}/mo
                        </p>
                    )}
                </div>
            )}

            <div style={{
                borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.25rem',
                display: 'flex', justifyContent: 'space-between', color: '#4b5563', fontSize: '0.9rem',
            }}>
                <span>Shipping</span>
                <span>Free</span>
            </div>

            <Link href="/checkout" className="btn btn-primary" style={{ width: '100%', marginTop: '2rem', textAlign: 'center' }}>
                Proceed to Checkout
            </Link>
        </div>
    );
}
