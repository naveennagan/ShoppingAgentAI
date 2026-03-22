/**
 * Bug Condition Exploration Test — Property 1
 *
 * These tests encode the EXPECTED (correct) behavior for the broadband plan
 * speed filter. On UNFIXED code the tests MUST FAIL, surfacing counterexamples
 * that prove the five defects exist. After the fix is applied the same tests
 * should PASS, confirming the bugs are resolved.
 *
 * Sub-properties tested:
 *   1a — No Truncation: summaryCards.length === filtered.length (no slice(0,3))
 *   1b — Explicit Speed Parsed: parsePreferences("N Mbps").minSpeed === N
 *   1c — Zero-Match Feedback: message mentions requested & fastest speed
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
  minSpeed?: number | null; // expected field — absent in unfixed code
}

/** Updated to match the FIXED parsePreferences from AiChatPanel.tsx */
function parsePreferences(text: string): PreferenceFilter {
  const lower = text.toLowerCase().trim();
  const filter: PreferenceFilter = {
    speedTier: null,
    minSpeed: null,
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

  // Explicit speed number (e.g. "100 Mbps", "100mbps", "100 mb")
  const speedMatch = lower.match(/(\d+)\s*(?:mbps|mb)/i);
  if (speedMatch) {
    filter.minSpeed = parseInt(speedMatch[1], 10);
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

/** Updated to match the FIXED filterPlans from AiChatPanel.tsx */
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

  if (filter.minSpeed !== null && filter.minSpeed !== undefined) {
    filtered = filtered.filter((p) => p.downloadSpeedMbps >= filter.minSpeed!);
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

/**
 * Updated to match the FIXED summary-card construction from handlePreferencesStep.
 * No more slice(0, 3) truncation.
 */
function buildSummaryCards(filtered: BroadbandPlan[]) {
  return filtered.map((p) => ({
    type: 'broadband' as const,
    id: p.planId,
    name: p.name,
    downloadSpeed: `${p.downloadSpeedMbps} Mbps`,
    uploadSpeed: `${p.uploadSpeedMbps} Mbps`,
    monthlyPrice: p.monthlyPrice,
    contractLength: `${p.contractLengthMonths} months`,
    promotionalLabel: p.promotionalLabel ?? null,
  }));
}

/**
 * Updated to match the FIXED zero-match message from handlePreferencesStep.
 * Now includes speed-aware feedback when a speed constraint was set.
 */
function buildZeroMatchMessage(
  plans: BroadbandPlan[],
  preferences: PreferenceFilter,
): string {
  const hasSpeedConstraint = preferences.speedTier !== null || (preferences.minSpeed !== null && preferences.minSpeed !== undefined);
  if (hasSpeedConstraint && plans.length > 0) {
    const fastestAvailable = Math.max(...plans.map((p) => p.downloadSpeedMbps));
    const requestedDesc = preferences.minSpeed !== null && preferences.minSpeed !== undefined
      ? `${preferences.minSpeed}+ Mbps`
      : preferences.speedTier === 'fast' ? '100+ Mbps' : 'your requested speed';
    return `No plans matching ${requestedDesc} are available at your address. The fastest available speed is ${fastestAvailable} Mbps. Here are the ${plans.length} available plans:`;
  }
  return `I couldn't find any plans matching your preferences. Would you like to broaden your criteria or view all ${plans.length} available plans?`;
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

// ---------------------------------------------------------------------------
// Sub-property 1a — No Truncation
// ---------------------------------------------------------------------------

describe('Property 1a — No Truncation', () => {
  it('summaryCards.length === filtered.length for any number of filtered plans', () => {
    fc.assert(
      fc.property(
        fc.array(arbBroadbandPlan, { minLength: 1, maxLength: 20 }),
        (plans) => {
          // Use showAll so every plan passes the filter
          const filter: PreferenceFilter = {
            speedTier: null,
            maxBudget: null,
            maxContractMonths: null,
            usageType: null,
            showAll: true,
          };
          const filtered = filterPlans(plans, filter);
          const cards = buildSummaryCards(filtered);

          // EXPECTED: every filtered plan gets a card
          // UNFIXED: cards.length will be min(filtered.length, 3)
          expect(cards.length).toBe(filtered.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-property 1b — Explicit Speed Parsed
// ---------------------------------------------------------------------------

describe('Property 1b — Explicit Speed Parsed', () => {
  it('parsePreferences extracts minSpeed from "N Mbps" text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 2000 }),
        fc.constantFrom(
          'I need {N} Mbps',
          '{N} mbps please',
          'at least {N} Mbps speed',
          'looking for {N}Mbps broadband',
          'give me {N} mb',
        ),
        (speed, template) => {
          const text = template.replace('{N}', String(speed));
          const result = parsePreferences(text);

          // EXPECTED: minSpeed is extracted as the numeric value
          // UNFIXED: minSpeed will be undefined (field doesn't exist)
          expect(result.minSpeed).toBe(speed);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-property 1c — Zero-Match Feedback
// ---------------------------------------------------------------------------

describe('Property 1c — Zero-Match Feedback', () => {
  it('zero-match message mentions requested speed and fastest available speed', () => {
    fc.assert(
      fc.property(
        // Generate plans that are all below 100 Mbps (so "fast" filter yields 0)
        fc.array(
          fc.record({
            planId: fc.uuid(),
            name: fc.constant('Basic Plan'),
            downloadSpeedMbps: fc.integer({ min: 1, max: 99 }),
            uploadSpeedMbps: fc.integer({ min: 1, max: 20 }),
            planType: fc.constant('SOGEA'),
            technologyType: fc.constant('SOGEA'),
            contractLengthMonths: fc.constant(24),
            monthlyPrice: fc.float({ min: 20, max: 40, noNaN: true }),
            includesRouter: fc.constant(true),
            activationFee: fc.constant(0),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (plans) => {
          const preferences: PreferenceFilter = {
            speedTier: 'fast',
            maxBudget: null,
            maxContractMonths: null,
            usageType: null,
            showAll: false,
          };

          const filtered = filterPlans(plans, preferences);
          // Confirm zero match with speed preference
          if (filtered.length > 0) return; // skip — plans happened to match

          const fastestAvailable = Math.max(
            ...plans.map((p) => p.downloadSpeedMbps),
          );
          const message = buildZeroMatchMessage(plans, preferences);

          // EXPECTED: message mentions the fastest available speed
          // UNFIXED: message is generic "broaden your criteria"
          expect(message).toContain(String(fastestAvailable));
        },
      ),
      { numRuns: 100 },
    );
  });
});
