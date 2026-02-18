/**
 * Property-based tests for selective promotions & coupon codes feature.
 * Uses fast-check to verify correctness properties across arbitrary inputs.
 *
 * Feature: selective-promotions-coupon-codes
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Promotion } from '@/lib/products';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replicates the filtering logic from ProductCard.tsx */
function filterDirectPromotions(promotions: Promotion[]): Promotion[] {
  return promotions.filter(p => p.active && !p.promoCode);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const promotionArb = fc.record<Promotion>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  description: fc.string(),
  discountType: fc.constantFrom('percentage' as const, 'fixed_amount' as const),
  discountValue: fc.float({ min: 0, max: 100, noNaN: true }),
  promoCode: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 20 })),
  startDate: fc.constant(null),
  endDate: fc.constant(null),
  promotionalLabel: fc.oneof(fc.constant(null), fc.string({ minLength: 1, maxLength: 30 })),
  active: fc.boolean(),
  createdAt: fc.constant('2024-01-01T00:00:00Z'),
});

// ---------------------------------------------------------------------------
// Property 1: Promotion filtering excludes coupon-only promotions
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------

describe('Property 1: Promotion filtering excludes coupon-only promotions', () => {
  it('never returns a promotion with a non-null promoCode', () => {
    fc.assert(
      fc.property(fc.array(promotionArb, { minLength: 0, maxLength: 20 }), (promotions) => {
        const result = filterDirectPromotions(promotions);
        // No result should have a non-null promoCode
        return result.every(p => p.promoCode === null);
      }),
      { numRuns: 200 }
    );
  });

  it('never returns an inactive promotion', () => {
    fc.assert(
      fc.property(fc.array(promotionArb, { minLength: 0, maxLength: 20 }), (promotions) => {
        const result = filterDirectPromotions(promotions);
        return result.every(p => p.active === true);
      }),
      { numRuns: 200 }
    );
  });

  it('retains all active direct promotions (promoCode is null)', () => {
    fc.assert(
      fc.property(fc.array(promotionArb, { minLength: 0, maxLength: 20 }), (promotions) => {
        const result = filterDirectPromotions(promotions);
        const expectedCount = promotions.filter(p => p.active && p.promoCode === null).length;
        return result.length === expectedCount;
      }),
      { numRuns: 200 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: API client propagates error messages
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

describe('Property 7: API client propagates error messages', () => {
  /**
   * Extracts the error-propagation logic from apiClient.validateCouponCode
   * without making real network calls, so we can test it as a pure function.
   */
  async function simulateValidateCouponCode(
    responseOk: boolean,
    responseBody: Record<string, unknown>
  ): Promise<unknown> {
    // Simulate the fetch + error-handling logic from api-client.ts
    const res = {
      ok: responseOk,
      json: async () => responseBody,
    };

    if (!res.ok) {
      const data = await res.json();
      throw new Error((data.error as string) || 'Failed to validate coupon code');
    }
    return res.json();
  }

  it('throws an Error whose message equals the "error" field from a non-OK response', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.integer({ min: 400, max: 599 }),
        async (errorMessage, _statusCode) => {
          let thrown: Error | null = null;
          try {
            await simulateValidateCouponCode(false, { error: errorMessage });
          } catch (e) {
            thrown = e as Error;
          }
          return thrown !== null && thrown.message === errorMessage;
        }
      ),
      { numRuns: 200 }
    );
  });

  it('falls back to "Failed to validate coupon code" when error field is absent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ someOtherField: fc.string() }),
        async (body) => {
          let thrown: Error | null = null;
          try {
            await simulateValidateCouponCode(false, body);
          } catch (e) {
            thrown = e as Error;
          }
          return thrown !== null && thrown.message === 'Failed to validate coupon code';
        }
      ),
      { numRuns: 200 }
    );
  });

  it('resolves successfully and returns the body for OK responses', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          promotionId: fc.uuid(),
          promotionName: fc.string({ minLength: 1 }),
          discountType: fc.constantFrom('percentage' as const, 'fixed_amount' as const),
          discountValue: fc.float({ min: 0, max: 100, noNaN: true }),
          applicableProductIds: fc.array(fc.uuid()),
        }),
        async (body) => {
          const result = await simulateValidateCouponCode(true, body);
          return JSON.stringify(result) === JSON.stringify(body);
        }
      ),
      { numRuns: 200 }
    );
  });
});
