import { describe, it, expect } from 'vitest';
import { isPlanFeatureQuery, formatPlanDetails } from '../plan-feature-utils';
import type { BroadbandPlan } from '@/types/broadband';

describe('isPlanFeatureQuery', () => {
  it('detects "features" keyword', () => {
    expect(isPlanFeatureQuery('What are the features?')).toBe(true);
  });

  it('detects "details" keyword', () => {
    expect(isPlanFeatureQuery('Show me the details')).toBe(true);
  });

  it('detects "what does this plan include"', () => {
    expect(isPlanFeatureQuery('What does this plan include?')).toBe(true);
  });

  it('detects "tell me more"', () => {
    expect(isPlanFeatureQuery('Tell me more about this plan')).toBe(true);
  });

  it('detects "plan details"', () => {
    expect(isPlanFeatureQuery('plan details please')).toBe(true);
  });

  it('detects "specs"', () => {
    expect(isPlanFeatureQuery('What are the specs?')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isPlanFeatureQuery('TELL ME MORE')).toBe(true);
    expect(isPlanFeatureQuery('Plan Features')).toBe(true);
  });

  it('returns false for unrelated messages', () => {
    expect(isPlanFeatureQuery('add to cart')).toBe(false);
    expect(isPlanFeatureQuery('go back')).toBe(false);
    expect(isPlanFeatureQuery('hello')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isPlanFeatureQuery('')).toBe(false);
  });
});

describe('formatPlanDetails', () => {
  const basePlan: BroadbandPlan = {
    planId: 'plan-1',
    name: 'Superfast Fibre',
    downloadSpeedMbps: 80,
    uploadSpeedMbps: 20,
    planType: 'Standard',
    technologyType: 'FTTC',
    contractLengthMonths: 24,
    monthlyPrice: 29.99,
    includesRouter: true,
    routerName: 'Smart Hub',
    activationFee: 9.99,
    speedGuaranteeMbps: 50,
    outOfContractPrice: 39.99,
    promotionalLabel: 'Half price for 6 months',
  };

  it('includes plan name in header', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Superfast Fibre');
  });

  it('includes download speed', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Download Speed: 80 Mbps');
  });

  it('includes upload speed', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Upload Speed: 20 Mbps');
  });

  it('includes technology type', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Technology: FTTC');
  });

  it('includes contract length', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Contract Length: 24 months');
  });

  it('includes monthly price', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Monthly Price: £29.99/mo');
  });

  it('includes promotional label when present', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Promotion: Half price for 6 months');
  });

  it('omits promotional label when absent', () => {
    const plan = { ...basePlan, promotionalLabel: undefined };
    const result = formatPlanDetails(plan);
    expect(result).not.toContain('Promotion:');
  });

  it('includes router name when included', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Router: Smart Hub (included)');
  });

  it('shows "Included" when router included but no name', () => {
    const plan = { ...basePlan, routerName: undefined };
    const result = formatPlanDetails(plan);
    expect(result).toContain('Router: Included');
  });

  it('shows "Not included" when router not included', () => {
    const plan = { ...basePlan, includesRouter: false, routerName: undefined };
    const result = formatPlanDetails(plan);
    expect(result).toContain('Router: Not included');
  });

  it('includes activation fee', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Activation Fee: £9.99');
  });

  it('includes speed guarantee when present', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Speed Guarantee: 50 Mbps');
  });

  it('omits speed guarantee when absent', () => {
    const plan = { ...basePlan, speedGuaranteeMbps: undefined };
    const result = formatPlanDetails(plan);
    expect(result).not.toContain('Speed Guarantee');
  });

  it('includes out-of-contract price when present', () => {
    const result = formatPlanDetails(basePlan);
    expect(result).toContain('Out-of-Contract Price: £39.99/mo');
  });

  it('omits out-of-contract price when absent', () => {
    const plan = { ...basePlan, outOfContractPrice: undefined };
    const result = formatPlanDetails(plan);
    expect(result).not.toContain('Out-of-Contract Price');
  });

  it('uses bullet points for all attributes', () => {
    const result = formatPlanDetails(basePlan);
    const bulletLines = result.split('\n').filter(l => l.startsWith('•'));
    // Should have at least 6 core attributes + optional ones
    expect(bulletLines.length).toBeGreaterThanOrEqual(6);
  });
});
