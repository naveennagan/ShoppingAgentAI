'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { useCart } from '@/context/CartContext';
import { BroadbandAddress, BroadbandAddon, BroadbandPlan } from '@/types/broadband';
import PostcodeForm from '@/components/broadband/PostcodeForm';
import AddressDropdown from '@/components/broadband/AddressDropdown';
import PlanList from '@/components/broadband/PlanList';
import { Sparkles } from 'lucide-react';

export default function BroadbandPage() {
  const { addBroadbandServiceToCart } = useCart();

  // Address lookup state
  const [addresses, setAddresses] = useState<BroadbandAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressesLoaded, setAddressesLoaded] = useState(false);

  // Selected address + plans state
  const [selectedAddress, setSelectedAddress] = useState<BroadbandAddress | null>(null);
  const [plans, setPlans] = useState<BroadbandPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState('');

  // Addons
  const [addons, setAddons] = useState<BroadbandAddon[]>([]);

  // Cart state
  const [addingPlanId, setAddingPlanId] = useState<string | null>(null);
  const [addedPlanId, setAddedPlanId] = useState<string | null>(null);

  // Fetch addons once on mount
  useEffect(() => {
    apiClient.getAddons().then(setAddons).catch(() => {});
  }, []);

  const handlePostcodeSubmit = async (postcode: string) => {
    setAddressLoading(true);
    setAddressError('');
    setAddresses([]);
    setAddressesLoaded(false);
    setSelectedAddress(null);
    setPlans([]);
    setPlansError('');

    try {
      const result = await apiClient.getAddresses(postcode);
      setAddresses(result);
      setAddressesLoaded(true);
    } catch (err) {
      setAddressError(err instanceof Error ? err.message : 'Failed to look up addresses. Please try again.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleAddressSelect = async (address: BroadbandAddress) => {
    setSelectedAddress(address);
    setPlans([]);
    setPlansError('');
    setPlansLoading(true);

    try {
      const result = await apiClient.getPlansForAddress(address.uprn);
      setPlans(result);
      // Notify the AI chat panel about available broadband plans
      window.dispatchEvent(new CustomEvent('broadband-plans-loaded', { detail: result }));
    } catch (err) {
      setPlansError(err instanceof Error ? err.message : 'Failed to fetch broadband plans. Please try again.');
    } finally {
      setPlansLoading(false);
    }
  };

  const handleAddToCart = async (plan: BroadbandPlan, selectedAddons: BroadbandAddon[]) => {
    setAddingPlanId(plan.planId);
    try {
      // Build a combined plan with addons baked into display fields
      const addonSummary = selectedAddons.length > 0
        ? ` + ${selectedAddons.map(a => a.name).join(', ')}`
        : '';
      const totalMonthly = plan.monthlyPrice + selectedAddons.reduce((s, a) => s + a.monthlyPrice, 0);
      const enrichedPlan: BroadbandPlan = {
        ...plan,
        monthlyPrice: totalMonthly,
      };
      const displaySummary = `${plan.downloadSpeedMbps}Mbps / ${plan.uploadSpeedMbps}Mbps · ${plan.technologyType}${addonSummary} · £${totalMonthly.toFixed(2)}/mo`;
      await addBroadbandServiceToCart(enrichedPlan, plan.planId, displaySummary);
      setAddedPlanId(plan.planId);
      setTimeout(() => setAddedPlanId(null), 2000);
    } catch (err) {
      setPlansError(err instanceof Error ? err.message : 'Failed to add plan to cart. Please try again.');
    } finally {
      setAddingPlanId(null);
    }
  };

  return (
    <main className="container" style={{ padding: '2rem 0', maxWidth: '760px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Broadband Checker</h1>
        <p style={{ color: '#6b7280' }}>Enter your postcode to see available broadband plans at your address.</p>
      </header>

      {/* Step 1: Postcode */}
      <section style={{ marginBottom: '1.5rem' }}>
        <PostcodeForm onSubmit={handlePostcodeSubmit} loading={addressLoading} />
        {addressError && (
          <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem', marginTop: '0.5rem' }}>{addressError}</p>
        )}
      </section>

      {/* Step 2: Address selection */}
      {addressesLoaded && (
        <section style={{ marginBottom: '1.5rem' }}>
          <AddressDropdown
            addresses={addresses}
            selectedUprn={selectedAddress?.uprn ?? null}
            onChange={handleAddressSelect}
          />
        </section>
      )}

      {plansLoading && (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Checking availability…</p>
      )}

      {plansError && (
        <p role="alert" style={{ color: '#ef4444', fontSize: '0.85rem' }}>{plansError}</p>
      )}

      {/* Step 3: Plans + addons */}
      {plans.length > 0 && !plansLoading && (
        <>
          {addedPlanId && (
            <div role="status" style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px',
              padding: '0.6rem 1rem', marginBottom: '1rem', color: '#15803d', fontSize: '0.9rem', fontWeight: 600,
            }}>
              ✓ Plan added to cart
            </div>
          )}

          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Available Plans</h2>
            <PlanList
              plans={plans}
              addons={addons}
              onAddToCart={handleAddToCart}
              addingPlanId={addingPlanId}
            />
          </section>

          <section>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.85rem 1.1rem',
              background: 'linear-gradient(135deg, #f0fafa 0%, #f8f9fa 100%)',
              border: '1.5px solid #b2d4d6', borderRadius: '10px',
              color: '#3D7A7F', fontSize: '0.9rem',
            }}>
              <Sparkles size={16} />
              <span>Not sure which plan to pick? <strong>Ask the AI Assistant</strong> — describe how you use the internet and it&apos;ll recommend the best plan for you.</span>
            </div>
          </section>
        </>
      )}

      {selectedAddress && !plansLoading && !plansError && plans.length === 0 && (
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Broadband is not available at the selected address.
        </p>
      )}
    </main>
  );
}
