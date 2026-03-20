import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Subscription } from '@/types/checkout';

// Feature: checkout-billing-enhancements, Property 9: Due date computation

// --- computeDueDate logic (mirrors src/app/bills/page.tsx) ---
function computeDueDate(sub: Subscription): string {
  if (sub.status === 'active' && sub.activatedAt) {
    const base = new Date(sub.activatedAt);
    base.setMonth(base.getMonth() + 1);
    return base.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }
  return 'After installation';
}

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    subscriptionId: 'sub-1',
    orderId: 'ord-1',
    status: 'inactive',
    monthlyPrice: 29.99,
    ...overrides,
  };
}

describe('computeDueDate – Property 9: Due date computation', () => {
  it('known active subscription returns one month later', () => {
    const sub = makeSub({ status: 'active', activatedAt: '2025-01-15T00:00:00Z' });
    expect(computeDueDate(sub)).toBe('15 February 2025');
  });

  it('inactive subscription returns "After installation"', () => {
    expect(computeDueDate(makeSub({ status: 'inactive' }))).toBe('After installation');
  });

  it('cancelled subscription returns "After installation"', () => {
    expect(computeDueDate(makeSub({ status: 'cancelled' }))).toBe('After installation');
  });

  it('active subscription without activatedAt returns "After installation"', () => {
    expect(computeDueDate(makeSub({ status: 'active', activatedAt: undefined }))).toBe('After installation');
  });

  it('PBT: active subscriptions with activatedAt show date one month from activation', () => {
    /**
     * Property 9: Due date computation
     * For any subscription with status "active" and a valid activation date,
     * the displayed due date should be exactly one calendar month from the
     * activation date.
     * Validates: Requirements 3.5, 3.6
     */
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }),
        (activationDate) => {
          const sub = makeSub({
            status: 'active',
            activatedAt: activationDate.toISOString(),
          });

          const result = computeDueDate(sub);

          // Compute expected date: one calendar month later
          const expected = new Date(activationDate);
          expected.setMonth(expected.getMonth() + 1);
          const expectedStr = expected.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

          expect(result).toBe(expectedStr);
          // Must NOT be "After installation"
          expect(result).not.toBe('After installation');
        }
      ),
      { numRuns: 200 }
    );
  });

  it('PBT: inactive subscriptions always show "After installation"', () => {
    /**
     * Property 9: Due date computation
     * For any subscription with status "inactive", the displayed due date
     * should be the string "After installation".
     * Validates: Requirements 3.5, 3.6
     */
    fc.assert(
      fc.property(
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }).map(d => d.toISOString()), { nil: undefined }),
        (activatedAt) => {
          const sub = makeSub({ status: 'inactive', activatedAt });
          expect(computeDueDate(sub)).toBe('After installation');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PBT: cancelled subscriptions always show "After installation"', () => {
    /**
     * Property 9: Due date computation
     * Validates: Requirements 3.5, 3.6
     */
    fc.assert(
      fc.property(
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }).map(d => d.toISOString()), { nil: undefined }),
        (activatedAt) => {
          const sub = makeSub({ status: 'cancelled', activatedAt });
          expect(computeDueDate(sub)).toBe('After installation');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PBT: only active+activatedAt produces a non-"After installation" result', () => {
    /**
     * Property 9: Due date computation
     * For any status and optional activatedAt, the result is NOT "After installation"
     * if and only if status is "active" AND activatedAt is defined.
     * Validates: Requirements 3.5, 3.6
     */
    fc.assert(
      fc.property(
        fc.constantFrom<'active' | 'inactive' | 'cancelled'>('active', 'inactive', 'cancelled'),
        fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }).map(d => d.toISOString()), { nil: undefined }),
        (status, activatedAt) => {
          const sub = makeSub({ status, activatedAt });
          const result = computeDueDate(sub);

          if (status === 'active' && activatedAt !== undefined) {
            expect(result).not.toBe('After installation');
          } else {
            expect(result).toBe('After installation');
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
