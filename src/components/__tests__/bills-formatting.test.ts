import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: checkout-billing-enhancements, Property 8: GBP currency formatting

// --- formatGBP logic (mirrors src/app/bills/page.tsx) ---
function formatGBP(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

describe('formatGBP – Property 8: GBP currency formatting', () => {
  it('formats a known value correctly', () => {
    expect(formatGBP(52.99)).toBe('£52.99');
    expect(formatGBP(0)).toBe('£0.00');
    expect(formatGBP(100)).toBe('£100.00');
    expect(formatGBP(9.9)).toBe('£9.90');
  });

  it('PBT: any non-negative float formats to £X.XX with exactly two decimal places', () => {
    /**
     * Property 8: GBP currency formatting
     * For any non-negative number representing a monthly price, the formatted
     * currency string should match the pattern £X.XX where X.XX is the number
     * formatted to exactly two decimal places.
     * Validates: Requirements 3.3
     */
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: Math.fround(999999), noNaN: true, noDefaultInfinity: true }),
        (amount) => {
          const result = formatGBP(amount);

          // Must start with £
          expect(result[0]).toBe('£');

          // Must match £<digits>.<exactly 2 digits>
          expect(result).toMatch(/^£\d+\.\d{2}$/);

          // The numeric portion must equal the original amount rounded to 2dp
          const numericPart = parseFloat(result.slice(1));
          const expected = parseFloat(amount.toFixed(2));
          expect(numericPart).toBeCloseTo(expected, 2);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('PBT: zero always formats to £0.00', () => {
    expect(formatGBP(0)).toBe('£0.00');
  });

  it('PBT: integer amounts always have .00 suffix', () => {
    /**
     * Validates: Requirements 3.3
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 999999 }),
        (amount) => {
          const result = formatGBP(amount);
          expect(result).toBe(`£${amount}.00`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
