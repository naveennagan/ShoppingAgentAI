'use client';

import { BroadbandPlan, BroadbandAddon } from '@/types/broadband';
import PlanCard from './PlanCard';

interface PlanListProps {
  plans: BroadbandPlan[];
  addons: BroadbandAddon[];
  onAddToCart: (plan: BroadbandPlan, selectedAddons: BroadbandAddon[]) => void;
  addingPlanId?: string | null;
}

export default function PlanList({ plans, addons, onAddToCart, addingPlanId = null }: PlanListProps) {
  const sorted = [...plans].sort((a, b) => a.monthlyPrice - b.monthlyPrice);

  return (
    <div>
      <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>
        {sorted.length} plan{sorted.length !== 1 ? 's' : ''} available at your address
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {sorted.map(plan => (
          <PlanCard
            key={plan.planId}
            plan={plan}
            addons={addons}
            onAddToCart={onAddToCart}
            adding={addingPlanId === plan.planId}
          />
        ))}
      </div>
    </div>
  );
}
