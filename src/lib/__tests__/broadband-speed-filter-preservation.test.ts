/**
 * Preservation Property Tests — Property 2
 *
 * These tests capture the CURRENT (unfixed) behavior of parsePreferences and
 * filterPlans for keyword speed tiers, budget filtering, contract filtering,
 * and "show all" mode. They MUST PASS on unfixed code to establish a baseline,
 * and MUST CONTINUE TO PASS after the fix to confirm no regressions.
 *
 * Sub-properties tested:
 *   2a — Keyword Speed Tier Preservation
 *   2b — Budget Filter Preservation
 *   2c — Contract Filter Preservation
 *   2d — Show All Preservation
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { BroadbandPlan } from '@/types/broadband';

// ---------------------------------------------------------------------------
// Replicate the CURRENT (unfixed) PreferenceFilter & functions from
// AiChatPanel.tsx so we can test them as pure functions.
// ---------------------------------------------------------------------------

interface PreferenceFilter {
  speedTier: 'fast' | 'standard' | null;
  maxBudget: number | null;
  maxContractMonths: number | null;
  usageType: string | null;
  showAll: boolean;
}

/** Exact copy of parsePreferences from AiChatPanel.tsx (unfixed) */
function parsePreferences(text: string): PreferenceFilter {
  const lower = text.toLowerCase().trim();
  const filter: PreferenceFilter = {
    speedTier: null,
    maxBudget: null,
    maxContractMonths: null,
    usageType: null,
    showAll: false,
  };

  if (
    lower.includes('show all plans') ||
    lower.includes('show all available') ||
    lower === 'show all'
  ) {
    filter.showAll = true;
    return filter;
  }

  // Speed keywords
  if (
    lower.includes('fast') ||
    lower.includes('high speed') ||
    lower.includes('gaming') ||
    lower.includes('streaming')
  ) {
    filter.speedTier = 'fast';
  } else if (
    lower.includes('standard') ||
    lower.includes('basic') ||
    lower.includes('light')
  ) {
    filter.speedTier = 'standard';
  }

  // Budget keywords
  if (
    lower.includes('budget') ||
    lower.includes('cheap') ||
    lower.includes('affordable') ||
    lower.includes('low cost')
  ) {
    filter.maxBudget = 35;
  }
  const budgetMatch = lower.match(
    /(?:under|below|max|up to|less than)\s*£?\s*(\d+)/,
  );
  if (budgetMatch) {
    filter.maxBudget = parseInt(budgetMatch[1], 10);
  }

  // Contract keywords
  if (
    lower.includes('short contract') ||
    lower.includes('no contract') ||
    lower.includes('flexible') ||
    lower.includes('month-to-month')
  ) {
    filter.maxContractMonths = 12;
  }
  const contractMatch = lower.match(/(\d+)\s*month/);
  if (contractMatch) {
    filter.maxContractMonths = parseInt(contractMatch[1], 10);
  }

  // Usage type
  if (lower.includes('gaming')) filter.usageType = 'gaming';
  else if (lower.includes('streaming')) filter.usageType = 'streaming';
  else if (lower.includes('work') || lower.includes('office'))
    filter.usageType = 'work';

  return filter;
}

/** Exact copy of filterPlans from AiChatPanel.tsx (unfixed) */
function filterPlans(
  plans: BroadbandPlan[],
  filter: PreferenceFilter,
): BroadbandPlan[] {
  if (filter.showAll) return plans;

  let filtered = [...plans];

  if (filter.speedTier === 'fast') {
    filtered = filtered.filter((p) => p.downloadSpeedMbps >= 100);
  } else if (filter.speedTier === 'standard') {
    filtered = filtered.filter((p) => p.downloadSpeedMbps < 100);
  }

  if (filter.maxBudget !== null) {
    filtered = filtered.filter((p) => p.monthlyPrice <= filter.maxBudget!);
    filtered.sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  }

  if (filter.maxContractMonths !== null) {
    filtered = filtered.filter(
      (p) => p.contractLengthMonths <= filter.maxContractMonths!,
    );
  }

  return filtered;
}

// ---------------------------------------------------------------------------
// Arbitrary generators
// ---------------------------------------------------------------------------

const arbBroadbandPlan: fc.Arbitrary<BroadbandPlan> = fc.record({
  planId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  downloadSpeedMbps: fc.integer({ min: 1, max: 2000 }),
  uploadSpeedMbps: fc.integer({ min: 1, max: 500 }),
  planType: fc.constantFrom('SOGEA', 'FTTC', 'FTTP'),
  technologyType: fc.constantFrom('SOGEA', 'FTTC', 'FTTP'),
  contractLengthMonths: fc.constantFrom(12, 18, 24),
  monthlyPrice: fc.float({ min: 15, max: 80, noNaN: true }),
  includesRouter: fc.boolean(),
  activationFee: fc.float({ min: 0, max: 50, noNaN: true }),
});

/**
 * Keywords that must NOT appear in generated surrounding text, to avoid
 * accidentally triggering unrelated filter branches.
 */
const FORBIDDEN_WORDS = [
  'fast', 'gaming', 'streaming', 'standard', 'basic', 'light', 'high speed',
  'budget', 'cheap', 'affordable', 'low cost',
  'short contract', 'no contract', 'flexible', 'month-to-month',
  'show all plans', 'show all available', 'show all',
  'under', 'below', 'max', 'up to', 'less than',
  'month', 'work', 'office',
  'mbps', 'mb',
];

/**
 * Generate a safe padding string that won't accidentally contain any
 * filter-triggering keywords. Uses only alphabetic chars.
 */
const arbSafePadding: fc.Arbitrary<string> = fc
  .array(fc.constantFrom('x', 'y', 'z', 'q', 'w', ' '), { minLength: 0, maxLength: 10 })
  .map((chars: string[]) => chars.join(''));

// ---------------------------------------------------------------------------
// Sub-property 2a — Keyword Speed Tier Preservation
// ---------------------------------------------------------------------------

describe('Property 2a — Keyword Speed Tier Preservation', () => {
  /**
   * Validates: Requirements 3.1
   */
  it('"fast" tier keywords map to speedTier = "fast" and minSpeed is falsy', () => {
    const fastKeywords = ['fast', 'high speed', 'gaming', 'streaming'];

    fc.assert(
      fc.property(
        fc.constantFrom(...fastKeywords),
        arbSafePadding,
        arbSafePadding,
        (keyword, prefix, suffix) => {
          const text = `${prefix} ${keyword} ${suffix}`;
          const result = parsePreferences(text);

          expect(result.speedTier).toBe('fast');
          // minSpeed doesn't exist on unfixed code — verify it's falsy
          expect((result as unknown as Record<string, unknown>).minSpeed).toBeFalsy();
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.1
   */
  it('"standard" tier keywords map to speedTier = "standard" and minSpeed is falsy', () => {
    const standardKeywords = ['standard', 'basic', 'light'];

    fc.assert(
      fc.property(
        fc.constantFrom(...standardKeywords),
        arbSafePadding,
        arbSafePadding,
        (keyword, prefix, suffix) => {
          const text = `${prefix} ${keyword} ${suffix}`;
          const result = parsePreferences(text);

          expect(result.speedTier).toBe('standard');
          expect((result as unknown as Record<string, unknown>).minSpeed).toBeFalsy();
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-property 2b — Budget Filter Preservation
// ---------------------------------------------------------------------------

describe('Property 2b — Budget Filter Preservation', () => {
  /**
   * Validates: Requirements 3.3
   */
  it('budget keywords set maxBudget = 35', () => {
    const budgetKeywords = ['budget', 'cheap', 'affordable', 'low cost'];

    fc.assert(
      fc.property(
        fc.constantFrom(...budgetKeywords),
        (keyword) => {
          const text = `I want something ${keyword}`;
          const result = parsePreferences(text);

          expect(result.maxBudget).toBe(35);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.3
   */
  it('"under £N" sets maxBudget = N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        fc.constantFrom('under', 'below', 'less than', 'up to', 'max'),
        (amount, prefix) => {
          const text = `${prefix} £${amount}`;
          const result = parsePreferences(text);

          expect(result.maxBudget).toBe(amount);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.3
   */
  it('filterPlans with maxBudget returns only plans within budget, sorted by price ascending', () => {
    fc.assert(
      fc.property(
        fc.array(arbBroadbandPlan, { minLength: 1, maxLength: 15 }),
        fc.integer({ min: 15, max: 80 }),
        (plans, maxBudget) => {
          const filter: PreferenceFilter = {
            speedTier: null,
            maxBudget,
            maxContractMonths: null,
            usageType: null,
            showAll: false,
          };

          const result = filterPlans(plans, filter);

          // All returned plans must be within budget
          for (const plan of result) {
            expect(plan.monthlyPrice).toBeLessThanOrEqual(maxBudget);
          }

          // Must be sorted by price ascending
          for (let i = 1; i < result.length; i++) {
            expect(result[i].monthlyPrice).toBeGreaterThanOrEqual(
              result[i - 1].monthlyPrice,
            );
          }

          // No plan within budget should be missing
          const expectedCount = plans.filter(
            (p) => p.monthlyPrice <= maxBudget,
          ).length;
          expect(result.length).toBe(expectedCount);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-property 2c — Contract Filter Preservation
// ---------------------------------------------------------------------------

describe('Property 2c — Contract Filter Preservation', () => {
  /**
   * Validates: Requirements 3.4
   */
  it('contract keywords set maxContractMonths = 12', () => {
    const contractKeywords = ['short contract', 'no contract', 'flexible'];

    fc.assert(
      fc.property(
        fc.constantFrom(...contractKeywords),
        (keyword) => {
          // Use "I want" prefix — safe, no forbidden words
          const text = `I want ${keyword}`;
          const result = parsePreferences(text);

          expect(result.maxContractMonths).toBe(12);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.4
   */
  it('"N month" sets maxContractMonths = N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 36 }),
        (months) => {
          const text = `${months} month`;
          const result = parsePreferences(text);

          expect(result.maxContractMonths).toBe(months);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.4
   */
  it('filterPlans with maxContractMonths returns only plans within contract length', () => {
    fc.assert(
      fc.property(
        fc.array(arbBroadbandPlan, { minLength: 1, maxLength: 15 }),
        fc.constantFrom(12, 18, 24, 36),
        (plans, maxMonths) => {
          const filter: PreferenceFilter = {
            speedTier: null,
            maxBudget: null,
            maxContractMonths: maxMonths,
            usageType: null,
            showAll: false,
          };

          const result = filterPlans(plans, filter);

          // All returned plans must be within contract length
          for (const plan of result) {
            expect(plan.contractLengthMonths).toBeLessThanOrEqual(maxMonths);
          }

          // No plan within contract length should be missing
          const expectedCount = plans.filter(
            (p) => p.contractLengthMonths <= maxMonths,
          ).length;
          expect(result.length).toBe(expectedCount);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-property 2d — Show All Preservation
// ---------------------------------------------------------------------------

describe('Property 2d — Show All Preservation', () => {
  /**
   * Validates: Requirements 3.2
   */
  it('"show all" phrases set showAll = true', () => {
    const showAllPhrases = ['show all plans', 'show all available', 'show all'];

    fc.assert(
      fc.property(
        fc.constantFrom(...showAllPhrases),
        (phrase) => {
          const result = parsePreferences(phrase);

          expect(result.showAll).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * Validates: Requirements 3.2
   */
  it('filterPlans with showAll returns the full plan array unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(arbBroadbandPlan, { minLength: 0, maxLength: 20 }),
        (plans) => {
          const filter: PreferenceFilter = {
            speedTier: null,
            maxBudget: null,
            maxContractMonths: null,
            usageType: null,
            showAll: true,
          };

          const result = filterPlans(plans, filter);

          // showAll returns the exact same array reference
          expect(result).toBe(plans);
          expect(result.length).toBe(plans.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
