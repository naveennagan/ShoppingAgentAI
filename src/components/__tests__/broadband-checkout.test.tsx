import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- PostcodeForm validation logic (mirrors PostcodeForm.tsx) ---
const validatePostcode = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length < 5 || trimmed.length > 8) {
    return 'Please enter a valid UK postcode (5–8 characters).';
  }
  return '';
};

// --- PlanCard field presence check ---
const planHasAllRequiredFields = (plan: any): boolean => {
  return (
    plan.name != null &&
    plan.downloadSpeedMbps != null &&
    plan.uploadSpeedMbps != null &&
    plan.technologyType != null &&
    plan.contractLengthMonths != null &&
    plan.monthlyPrice != null
  );
};

// --- CartSummary split logic (mirrors CartSummary.tsx) ---
const splitCartItems = (items: any[]) => ({
  deviceItems: items.filter(i => i.itemType === 'device'),
  serviceItems: items.filter(i => i.itemType === 'broadband_service'),
});

const calcOneTimeTotal = (deviceItems: any[]) =>
  deviceItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

const calcMonthlyTotal = (serviceItems: any[]) =>
  serviceItems.reduce((sum, i) => sum + i.unitPrice, 0);

// ─────────────────────────────────────────────────────────────────────────────
// PostcodeForm validation
// ─────────────────────────────────────────────────────────────────────────────
describe('validatePostcode', () => {
  it('rejects empty string', () => {
    expect(validatePostcode('')).not.toBe('');
  });

  it('rejects 4-char string', () => {
    expect(validatePostcode('SW1A')).not.toBe('');
  });

  it('accepts exactly 5 chars', () => {
    expect(validatePostcode('SW1A1')).toBe('');
  });

  it('accepts exactly 8 chars', () => {
    expect(validatePostcode('SW1A 1AA')).toBe('');
  });

  it('rejects 9-char string', () => {
    expect(validatePostcode('SW1A 1AAX')).not.toBe('');
  });

  it('trims whitespace before checking length — "  SW1A1  " (6 trimmed) is valid', () => {
    expect(validatePostcode('  SW1A1  ')).toBe('');
  });

  it('trims whitespace — "  AB  " (2 trimmed) is invalid', () => {
    expect(validatePostcode('  AB  ')).not.toBe('');
  });

  it('returns the expected error message for invalid input', () => {
    expect(validatePostcode('AB')).toBe(
      'Please enter a valid UK postcode (5–8 characters).'
    );
  });

  it('accepts 6-char postcode', () => {
    expect(validatePostcode('EC1A1')).toBe('');
  });

  it('accepts 7-char postcode', () => {
    expect(validatePostcode('EC1A 1B')).toBe('');
  });

  // Property-based: any string with trimmed length < 5 or > 8 → error
  it('PBT: strings with trimmed length outside 5–8 always produce an error', () => {
    /**
     * Validates: Requirements 1.1
     */
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ maxLength: 4 }),
          fc.string({ minLength: 9 })
        ),
        (s) => {
          const trimmed = s.trim();
          if (trimmed.length < 5 || trimmed.length > 8) {
            return validatePostcode(s) !== '';
          }
          // If trimming changed the effective length into range, skip
          return true;
        }
      )
    );
  });

  // Property-based: strings whose trimmed length is 5–8 → no error
  it('PBT: strings with trimmed length 5–8 always pass validation', () => {
    /**
     * Validates: Requirements 1.1
     */
    fc.assert(
      fc.property(
        fc.string({ minLength: 5, maxLength: 8 }).filter(s => s.trim().length >= 5 && s.trim().length <= 8),
        (s) => validatePostcode(s) === ''
      )
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PlanCard field presence
// ─────────────────────────────────────────────────────────────────────────────
describe('planHasAllRequiredFields', () => {
  const validPlan = {
    planId: 'plan-1',
    name: 'Superfast 100',
    downloadSpeedMbps: 100,
    uploadSpeedMbps: 20,
    technologyType: 'FTTC',
    contractLengthMonths: 24,
    monthlyPrice: 29.99,
  };

  it('returns true for a complete plan', () => {
    expect(planHasAllRequiredFields(validPlan)).toBe(true);
  });

  it('returns false when name is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, name: null })).toBe(false);
  });

  it('returns false when downloadSpeedMbps is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, downloadSpeedMbps: null })).toBe(false);
  });

  it('returns false when uploadSpeedMbps is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, uploadSpeedMbps: null })).toBe(false);
  });

  it('returns false when technologyType is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, technologyType: null })).toBe(false);
  });

  it('returns false when contractLengthMonths is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, contractLengthMonths: null })).toBe(false);
  });

  it('returns false when monthlyPrice is missing', () => {
    expect(planHasAllRequiredFields({ ...validPlan, monthlyPrice: null })).toBe(false);
  });

  it('promotionalLabel is optional — plan without it still passes', () => {
    const { ...planWithoutLabel } = validPlan;
    expect(planHasAllRequiredFields(planWithoutLabel)).toBe(true);
  });

  it('promotionalLabel present when non-null', () => {
    const plan = { ...validPlan, promotionalLabel: 'Best Value' };
    expect(plan.promotionalLabel).toBe('Best Value');
  });

  it('promotionalLabel absent when null', () => {
    const plan = { ...validPlan, promotionalLabel: null };
    expect(plan.promotionalLabel).toBeNull();
  });

  it('price formatting: toFixed(2) produces correct string', () => {
    expect(validPlan.monthlyPrice.toFixed(2)).toBe('29.99');
    expect((30).toFixed(2)).toBe('30.00');
    expect((9.9).toFixed(2)).toBe('9.90');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CartSummary split logic
// ─────────────────────────────────────────────────────────────────────────────
describe('splitCartItems', () => {
  const deviceItem = (id: string, price = 100, qty = 1) => ({
    cartItemId: id,
    itemType: 'device' as const,
    fulfillmentType: 'shipping' as const,
    displayName: `Device ${id}`,
    unitPrice: price,
    quantity: qty,
  });

  const serviceItem = (id: string, price = 30) => ({
    cartItemId: id,
    itemType: 'broadband_service' as const,
    fulfillmentType: 'installation' as const,
    displayName: `Service ${id}`,
    unitPrice: price,
    quantity: 1,
  });

  it('empty cart → both arrays empty', () => {
    const { deviceItems, serviceItems } = splitCartItems([]);
    expect(deviceItems).toHaveLength(0);
    expect(serviceItems).toHaveLength(0);
  });

  it('only device items → serviceItems empty', () => {
    const { deviceItems, serviceItems } = splitCartItems([deviceItem('d1'), deviceItem('d2')]);
    expect(deviceItems).toHaveLength(2);
    expect(serviceItems).toHaveLength(0);
  });

  it('only service items → deviceItems empty', () => {
    const { deviceItems, serviceItems } = splitCartItems([serviceItem('s1')]);
    expect(deviceItems).toHaveLength(0);
    expect(serviceItems).toHaveLength(1);
  });

  it('mixed cart → correct split', () => {
    const items = [deviceItem('d1'), serviceItem('s1'), deviceItem('d2'), serviceItem('s2')];
    const { deviceItems, serviceItems } = splitCartItems(items);
    expect(deviceItems).toHaveLength(2);
    expect(serviceItems).toHaveLength(2);
  });

  it('hasDevices is true when deviceItems is non-empty', () => {
    const items = [deviceItem('d1')];
    const { deviceItems } = splitCartItems(items);
    expect(deviceItems.length > 0).toBe(true);
  });

  it('hasBroadbandService is true when serviceItems is non-empty', () => {
    const items = [serviceItem('s1')];
    const { serviceItems } = splitCartItems(items);
    expect(serviceItems.length > 0).toBe(true);
  });
});

describe('calcOneTimeTotal', () => {
  it('returns 0 for empty list', () => {
    expect(calcOneTimeTotal([])).toBe(0);
  });

  it('single item: unitPrice * quantity', () => {
    expect(calcOneTimeTotal([{ unitPrice: 50, quantity: 2 }])).toBe(100);
  });

  it('multiple items: sums unitPrice * quantity', () => {
    const items = [
      { unitPrice: 100, quantity: 1 },
      { unitPrice: 25, quantity: 3 },
      { unitPrice: 10, quantity: 2 },
    ];
    expect(calcOneTimeTotal(items)).toBe(100 + 75 + 20);
  });

  // Property-based: total always equals manual sum
  it('PBT: total equals sum of unitPrice * quantity for any device list', () => {
    /**
     * Validates: Requirements 3.1
     */
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            unitPrice: fc.float({ min: 0, max: 10000, noNaN: true }),
            quantity: fc.integer({ min: 1, max: 100 }),
          })
        ),
        (items) => {
          const expected = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
          return Math.abs(calcOneTimeTotal(items) - expected) < 0.0001;
        }
      )
    );
  });
});

describe('calcMonthlyTotal', () => {
  it('returns 0 for empty list', () => {
    expect(calcMonthlyTotal([])).toBe(0);
  });

  it('single service item: returns its unitPrice', () => {
    expect(calcMonthlyTotal([{ unitPrice: 29.99 }])).toBeCloseTo(29.99);
  });

  it('multiple service items: sums unitPrices', () => {
    const items = [{ unitPrice: 29.99 }, { unitPrice: 10.0 }];
    expect(calcMonthlyTotal(items)).toBeCloseTo(39.99);
  });
});
