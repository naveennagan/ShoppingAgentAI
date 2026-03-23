'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import type { JourneyState, JourneyAction } from '@/types/broadband';

/** Compute the monthly total from all selected items. */
export function calculateMonthlyTotal(
  planPrice: number,
  addons: { monthlyPrice: number }[],
  tvPackagePrice: number | null,
  simPlanPrice: number | null,
  homePhonePrice: number | null,
): number {
  const addonsSubtotal = addons.reduce((sum, a) => sum + a.monthlyPrice, 0);
  return planPrice + addonsSubtotal + (tvPackagePrice ?? 0) + (simPlanPrice ?? 0) + (homePhonePrice ?? 0);
}

/** Build the list of one-time fee line items and compute the total. */
export function calculateOneTimeFees(
  activationFee: number,
  includesRouter: boolean,
  routerName?: string,
): { fees: { label: string; amount: number }[]; total: number } {
  const fees: { label: string; amount: number }[] = [];
  if (activationFee > 0) {
    fees.push({ label: 'Activation fee', amount: activationFee });
  }
  if (!includesRouter && routerName) {
    fees.push({ label: `${routerName} (router)`, amount: 0 });
  }
  const total = fees.reduce((sum, f) => sum + f.amount, 0);
  return { fees, total };
}

interface PricingSummaryProps {
  state: JourneyState;
  dispatch: React.Dispatch<JourneyAction>;
  onOrderConfirm: () => void;
}

export default function PricingSummary({ state, dispatch, onOrderConfirm }: PricingSummaryProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { addBroadbandServiceToCart } = useCart();

  const plan = state.selectedPlan;
  if (!plan) return null;

  const addonsSubtotal = state.selectedAddons.reduce((sum, a) => sum + a.monthlyPrice, 0);
  const monthlyTotal = calculateMonthlyTotal(
    plan.monthlyPrice,
    state.selectedAddons,
    state.selectedTvPackage?.monthlyPrice ?? null,
    state.selectedSimPlan?.monthlyPrice ?? null,
    state.selectedHomePhoneService?.monthlyPrice ?? null,
  );

  const { fees: oneTimeFees, total: oneTimeTotal } = calculateOneTimeFees(
    plan.activationFee,
    plan.includesRouter,
    plan.routerName,
  );

  const handleConfirm = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const summaryParts: string[] = [
        `${plan.downloadSpeedMbps}Mbps / ${plan.uploadSpeedMbps}Mbps · ${plan.technologyType}`,
      ];
      if (state.selectedAddons.length > 0) {
        summaryParts.push(`${state.selectedAddons.length} add-on${state.selectedAddons.length > 1 ? 's' : ''}`);
      }
      if (state.selectedTvPackage) summaryParts.push(state.selectedTvPackage.name);
      if (state.selectedSimPlan) summaryParts.push(state.selectedSimPlan.name);
      if (state.selectedHomePhoneService) summaryParts.push(state.selectedHomePhoneService.name);
      summaryParts.push(`£${monthlyTotal.toFixed(2)}/mo`);

      await addBroadbandServiceToCart(plan, crypto.randomUUID(), summaryParts.join(' · '), monthlyTotal);
      setConfirmed(true);
      onOrderConfirm();
    } catch {
      setSubmitError('Failed to add to cart. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✓</div>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#111827' }}>Added to Cart</h3>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Your broadband bundle has been added to your cart.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Broadband Section */}
      <Section title="Broadband">
        <LineItem label={plan.name} value={`£${plan.monthlyPrice.toFixed(2)}/mo`} bold />
        <LineItem label="Contract" value={`${plan.contractLengthMonths} months`} />
        {plan.routerName && (
          <LineItem
            label={plan.routerName}
            value={plan.includesRouter ? 'Included' : 'Additional charge'}
          />
        )}
        {plan.activationFee > 0 && (
          <LineItem label="Activation fee" value={`£${plan.activationFee.toFixed(2)} (one-time)`} subtle />
        )}
        {plan.outOfContractPrice != null && plan.outOfContractPrice > 0 && (
          <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '0.4rem', padding: '0.4rem 0.6rem', background: '#fffbeb', borderRadius: '6px' }}>
            Price rises to £{plan.outOfContractPrice.toFixed(2)}/mo after {plan.contractLengthMonths} months
          </div>
        )}
      </Section>

      {/* Add-ons Section */}
      {state.selectedAddons.length > 0 && (
        <Section title="Add-ons">
          {state.selectedAddons.map((addon) => (
            <LineItem key={addon.id} label={addon.name} value={`£${addon.monthlyPrice.toFixed(2)}/mo`} />
          ))}
          <LineItem label="Add-ons subtotal" value={`£${addonsSubtotal.toFixed(2)}/mo`} bold />
        </Section>
      )}

      {/* TV Section */}
      {state.selectedTvPackage && (
        <Section title="TV">
          <LineItem
            label={state.selectedTvPackage.name}
            value={state.selectedTvPackage.monthlyPrice === 0 ? 'Included' : `£${state.selectedTvPackage.monthlyPrice.toFixed(2)}/mo`}
          />
        </Section>
      )}

      {/* Mobile Section */}
      {state.selectedSimPlan && (
        <Section title="Mobile">
          <LineItem label={state.selectedSimPlan.name} value={`£${state.selectedSimPlan.monthlyPrice.toFixed(2)}/mo`} />
          <LineItem label="Data" value={state.selectedSimPlan.isUnlimited ? 'Unlimited' : state.selectedSimPlan.description} subtle />
        </Section>
      )}

      {/* Home Phone Section */}
      {state.selectedHomePhoneService && (
        <Section title="Home Phone">
          <LineItem
            label={state.selectedHomePhoneService.name}
            value={state.selectedHomePhoneService.monthlyPrice === 0 ? 'Included' : `£${state.selectedHomePhoneService.monthlyPrice.toFixed(2)}/mo`}
          />
        </Section>
      )}

      {/* One-Time Fees Section */}
      {oneTimeFees.length > 0 && (
        <Section title="One-Time Fees">
          {oneTimeFees.map((fee, i) => (
            <LineItem key={i} label={fee.label} value={fee.amount > 0 ? `£${fee.amount.toFixed(2)}` : 'TBC'} />
          ))}
          {oneTimeTotal > 0 && (
            <LineItem label="One-time total" value={`£${oneTimeTotal.toFixed(2)}`} bold />
          )}
        </Section>
      )}

      {/* Monthly Total */}
      <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f0fafa', borderRadius: '10px', border: '2px solid var(--primary)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#111827' }}>Monthly Total</div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{plan.contractLengthMonths}-month contract</div>
          </div>
          <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>
            £{monthlyTotal.toFixed(2)}<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/mo</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      {submitError && (
        <p style={{ color: '#ef4444', fontSize: '0.85rem', margin: '0.75rem 0 0 0' }}>{submitError}</p>
      )}
      <button
        onClick={handleConfirm}
        disabled={submitting}
        style={{
          marginTop: '1rem', width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: 700,
          borderRadius: '8px', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
          background: submitting ? '#9ca3af' : 'var(--primary)', color: '#fff',
          transition: 'background 0.15s',
        }}
      >
        {submitting ? 'Adding…' : 'Add to Cart'}
      </button>
    </div>
  );
}

/* ---- Helper components ---- */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.5rem' }}>{title}</div>
      {children}
    </div>
  );
}

function LineItem({ label, value, bold, subtle }: { label: string; value: string; bold?: boolean; subtle?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0' }}>
      <span style={{ fontSize: '0.85rem', color: subtle ? '#9ca3af' : '#374151', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: bold ? '#111827' : '#374151', fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}
