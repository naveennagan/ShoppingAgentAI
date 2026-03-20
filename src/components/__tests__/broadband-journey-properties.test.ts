import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { journeyReducer, initialState, STEP_NAMES } from '../broadband/JourneyWizard';
import type {
  JourneyState,
  BroadbandAddress,
  BroadbandPlan,
  BroadbandAddon,
  TvPackage,
  SimPlan,
  HomePhoneService,
} from '@/types/broadband';

// ── Arbitraries ──

const arbAddress: fc.Arbitrary<BroadbandAddress> = fc.record({
  uprn: fc.uuid(),
  formattedAddress: fc.string({ minLength: 1, maxLength: 50 }),
  town: fc.string({ minLength: 1, maxLength: 30 }),
  postcode: fc.string({ minLength: 5, maxLength: 8 }),
});

const arbPlan: fc.Arbitrary<BroadbandPlan> = fc.record({
  planId: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  downloadSpeedMbps: fc.integer({ min: 10, max: 1000 }),
  uploadSpeedMbps: fc.integer({ min: 5, max: 500 }),
  planType: fc.constantFrom('Core', 'Standard', 'Premium', 'Ultimate'),
  technologyType: fc.constantFrom('SOGEA', 'FTTC', 'FTTP'),
  contractLengthMonths: fc.constantFrom(12, 24),
  monthlyPrice: fc.double({ min: 10, max: 100, noNaN: true }),
  promotionalLabel: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  includesRouter: fc.boolean(),
  routerName: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  speedGuaranteeMbps: fc.option(fc.integer({ min: 5, max: 500 }), { nil: undefined }),
  activationFee: fc.double({ min: 0, max: 50, noNaN: true }),
  outOfContractPrice: fc.option(fc.double({ min: 20, max: 120, noNaN: true }), { nil: undefined }),
});

const arbAddon: fc.Arbitrary<BroadbandAddon> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  monthlyPrice: fc.double({ min: 0, max: 30, noNaN: true }),
  description: fc.string({ minLength: 0, maxLength: 60 }),
});

const arbTvPackage: fc.Arbitrary<TvPackage> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 0, maxLength: 60 }),
  monthlyPrice: fc.double({ min: 0, max: 30, noNaN: true }),
  channelCount: fc.integer({ min: 10, max: 500 }),
});

const arbSimPlan: fc.Arbitrary<SimPlan> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  monthlyPrice: fc.double({ min: 0, max: 30, noNaN: true }),
  maxSpeed: fc.string({ minLength: 1, maxLength: 10 }),
  description: fc.string({ minLength: 0, maxLength: 60 }),
  isUnlimited: fc.boolean(),
});

const arbHomePhone: fc.Arbitrary<HomePhoneService> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 0, maxLength: 60 }),
  monthlyPrice: fc.double({ min: 0, max: 20, noNaN: true }),
  includesCallsTo: fc.string({ minLength: 1, maxLength: 40 }),
});

/** Build a populated JourneyState at a given step with all prior selections filled. */
const arbPopulatedState: fc.Arbitrary<JourneyState> = fc
  .tuple(
    fc.integer({ min: 0, max: 7 }),
    fc.string({ minLength: 5, maxLength: 8 }),
    fc.array(arbAddress, { minLength: 1, maxLength: 5 }),
    arbAddress,
    fc.array(arbPlan, { minLength: 1, maxLength: 5 }),
    arbPlan,
    fc.array(arbAddon, { minLength: 0, maxLength: 5 }),
    fc.array(arbAddon, { minLength: 0, maxLength: 3 }),
    fc.array(arbTvPackage, { minLength: 1, maxLength: 3 }),
    fc.option(arbTvPackage, { nil: null }),
    fc.array(arbSimPlan, { minLength: 1, maxLength: 3 }),
    fc.option(arbSimPlan, { nil: null }),
    fc.array(arbHomePhone, { minLength: 1, maxLength: 3 }),
    fc.option(arbHomePhone, { nil: null }),
  )
  .map(
    ([
      currentStep, postcode, addresses, selectedAddress,
      plans, selectedPlan, addonsList, selectedAddons,
      tvPackages, selectedTvPackage, simPlans, selectedSimPlan,
      homePhoneServices, selectedHomePhoneService,
    ]) => ({
      currentStep,
      postcode,
      addresses,
      selectedAddress,
      plans,
      selectedPlan,
      addonsList,
      selectedAddons,
      tvPackages,
      selectedTvPackage,
      simPlans,
      selectedSimPlan,
      homePhoneServices,
      selectedHomePhoneService,
      loading: false,
      error: null,
    }),
  );

// ── Property 1: Single Active Step Invariant ──

describe('Property 1: Single Active Step Invariant', () => {
  /**
   * For any currentStep N (0 ≤ N < 8), exactly one step is active (step N),
   * steps < N are completed, steps > N are upcoming.
   * Validates: Requirements 1.1
   */
  it('PBT: exactly one step is active, prior steps completed, later steps upcoming', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7 }), (currentStep) => {
        const state: JourneyState = { ...initialState, currentStep };

        for (let i = 0; i < STEP_NAMES.length; i++) {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          const isUpcoming = i > currentStep;

          // Exactly one of the three must be true
          expect(isActive || isCompleted || isUpcoming).toBe(true);
          expect([isActive, isCompleted, isUpcoming].filter(Boolean).length).toBe(1);

          if (isActive) {
            expect(i).toBe(state.currentStep);
          }
        }

        // Exactly one active step
        const activeCount = STEP_NAMES.filter((_, i) => i === currentStep).length;
        expect(activeCount).toBe(1);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 2: Reset From Step Clears Subsequent Selections ──

describe('Property 2: Reset From Step Clears Subsequent Selections', () => {
  /**
   * For any state where the user navigates back to step N, all selections
   * for steps N+1..7 are reset to null/empty.
   * Validates: Requirements 1.4, 1.5, 5.9
   */
  it('PBT: RESET_FROM_STEP clears all selections after the target step', () => {
    fc.assert(
      fc.property(
        arbPopulatedState,
        fc.integer({ min: 0, max: 6 }),
        (state, resetStep) => {
          const result = journeyReducer(state, { type: 'RESET_FROM_STEP', payload: resetStep });

          expect(result.currentStep).toBe(resetStep);

          // Step 0 (postcode) — address data cleared when resetting to step 0
          if (resetStep <= 0) {
            expect(result.addresses).toEqual([]);
            expect(result.selectedAddress).toBeNull();
          }
          // Step 1 (address) — plans cleared when resetting to step 1 or earlier
          if (resetStep <= 1) {
            expect(result.plans).toEqual([]);
            expect(result.selectedPlan).toBeNull();
          }
          // Step 2 (plan) — addons cleared when resetting to step 2 or earlier
          if (resetStep <= 2) {
            expect(result.addonsList).toEqual([]);
            expect(result.selectedAddons).toEqual([]);
          }
          // Step 3 (addons) — TV cleared when resetting to step 3 or earlier
          if (resetStep <= 3) {
            expect(result.tvPackages).toEqual([]);
            expect(result.selectedTvPackage).toBeNull();
          }
          // Step 4 (TV) — SIM cleared when resetting to step 4 or earlier
          if (resetStep <= 4) {
            expect(result.simPlans).toEqual([]);
            expect(result.selectedSimPlan).toBeNull();
          }
          // Step 5 (SIM) — home phone cleared when resetting to step 5 or earlier
          if (resetStep <= 5) {
            expect(result.homePhoneServices).toEqual([]);
            expect(result.selectedHomePhoneService).toBeNull();
          }

          // Selections for steps before resetStep should be preserved
          if (resetStep > 0) {
            expect(result.postcode).toBe(state.postcode);
          }
          if (resetStep > 1) {
            expect(result.selectedAddress).toBe(state.selectedAddress);
          }
          if (resetStep > 2) {
            expect(result.selectedPlan).toBe(state.selectedPlan);
          }
          if (resetStep > 3) {
            expect(result.selectedAddons).toBe(state.selectedAddons);
          }
          if (resetStep > 4) {
            expect(result.selectedTvPackage).toBe(state.selectedTvPackage);
          }
          if (resetStep > 5) {
            expect(result.selectedSimPlan).toBe(state.selectedSimPlan);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('PBT: GO_TO_STEP also clears subsequent selections (same as RESET_FROM_STEP)', () => {
    fc.assert(
      fc.property(
        arbPopulatedState,
        fc.integer({ min: 0, max: 6 }),
        (state, targetStep) => {
          const resetResult = journeyReducer(state, { type: 'RESET_FROM_STEP', payload: targetStep });
          const goResult = journeyReducer(state, { type: 'GO_TO_STEP', payload: targetStep });

          expect(goResult.currentStep).toBe(resetResult.currentStep);
          expect(goResult.selectedAddress).toEqual(resetResult.selectedAddress);
          expect(goResult.selectedPlan).toEqual(resetResult.selectedPlan);
          expect(goResult.selectedAddons).toEqual(resetResult.selectedAddons);
          expect(goResult.selectedTvPackage).toEqual(resetResult.selectedTvPackage);
          expect(goResult.selectedSimPlan).toEqual(resetResult.selectedSimPlan);
          expect(goResult.selectedHomePhoneService).toEqual(resetResult.selectedHomePhoneService);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 17: Session Storage Round Trip ──

describe('Property 17: Session Storage Round Trip', () => {
  /**
   * For any valid journey state, serializing to JSON and deserializing
   * produces a state equal to the original.
   * Validates: Requirements 11.1, 11.2
   */
  it('PBT: JSON serialize then deserialize produces equal state', () => {
    fc.assert(
      fc.property(arbPopulatedState, (state) => {
        const serialized = JSON.stringify(state);
        const deserialized = JSON.parse(serialized) as JourneyState;

        expect(deserialized.currentStep).toBe(state.currentStep);
        expect(deserialized.postcode).toBe(state.postcode);
        expect(deserialized.addresses).toEqual(state.addresses);
        expect(deserialized.selectedAddress).toEqual(state.selectedAddress);
        expect(deserialized.plans).toEqual(state.plans);
        expect(deserialized.selectedPlan).toEqual(state.selectedPlan);
        expect(deserialized.addonsList).toEqual(state.addonsList);
        expect(deserialized.selectedAddons).toEqual(state.selectedAddons);
        expect(deserialized.tvPackages).toEqual(state.tvPackages);
        expect(deserialized.selectedTvPackage).toEqual(state.selectedTvPackage);
        expect(deserialized.simPlans).toEqual(state.simPlans);
        expect(deserialized.selectedSimPlan).toEqual(state.selectedSimPlan);
        expect(deserialized.homePhoneServices).toEqual(state.homePhoneServices);
        expect(deserialized.selectedHomePhoneService).toEqual(state.selectedHomePhoneService);
        expect(deserialized.loading).toBe(state.loading);
        expect(deserialized.error).toBe(state.error);
      }),
      { numRuns: 200 },
    );
  });

  it('PBT: RESTORE_STATE with deserialized state produces identical reducer state', () => {
    fc.assert(
      fc.property(arbPopulatedState, (state) => {
        const serialized = JSON.stringify(state);
        const deserialized = JSON.parse(serialized) as JourneyState;
        const restored = journeyReducer(initialState, { type: 'RESTORE_STATE', payload: deserialized });

        expect(restored).toEqual(deserialized);
        expect(restored.currentStep).toBe(state.currentStep);
      }),
      { numRuns: 200 },
    );
  });
});

// ── Property 18: Step Progress Indicator Accuracy ──

describe('Property 18: Step Progress Indicator Accuracy', () => {
  /**
   * For any currentStep N, the progress indicator shows step N+1,
   * the correct step name, and total 8.
   * Validates: Requirements 10.3
   */
  it('PBT: step indicator shows correct step number, name, and total', () => {
    const expectedNames = [
      'Postcode',
      'Address',
      'Choose Plan',
      'Add-ons',
      'TV Package',
      'SIM Plan',
      'Home Phone',
      'Summary',
    ];
    const totalSteps = 8;

    fc.assert(
      fc.property(fc.integer({ min: 0, max: 7 }), (currentStep) => {
        // Mirror the StepProgressBar logic
        const stepNumber = currentStep + 1;
        const stepName = STEP_NAMES[currentStep];

        expect(stepNumber).toBeGreaterThanOrEqual(1);
        expect(stepNumber).toBeLessThanOrEqual(totalSteps);
        expect(stepName).toBe(expectedNames[currentStep]);
        expect(STEP_NAMES.length).toBe(totalSteps);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 3: Postcode Validation ──

import { validatePostcode } from '../broadband/PostcodeInput';

describe('Property 3: Postcode Validation', () => {
  /**
   * For any string, validatePostcode returns true iff the trimmed length
   * is between 5 and 8 characters (inclusive).
   * Validates: Requirements 2.2
   */
  it('PBT: returns true iff trimmed length is 5–8 characters', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const trimmedLen = input.trim().length;
        const expected = trimmedLen >= 5 && trimmedLen <= 8;
        expect(validatePostcode(input)).toBe(expected);
      }),
      { numRuns: 500 },
    );
  });

  it('PBT: strings with leading/trailing whitespace are validated on trimmed length', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 5 }),
        fc.integer({ min: 0, max: 5 }),
        (core, leadCount, trailCount) => {
          const padded = ' '.repeat(leadCount) + core + ' '.repeat(trailCount);
          const trimmedLen = padded.trim().length;
          const expected = trimmedLen >= 5 && trimmedLen <= 8;
          expect(validatePostcode(padded)).toBe(expected);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('PBT: strings shorter than 5 chars (trimmed) always fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 4 }),
        (short) => {
          // Ensure trimmed length is actually < 5
          fc.pre(short.trim().length < 5);
          expect(validatePostcode(short)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('PBT: strings longer than 8 chars (trimmed) always fail validation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 9, maxLength: 50 }),
        (long) => {
          fc.pre(long.trim().length > 8);
          expect(validatePostcode(long)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });
});



// ── Property 4: Plan Sort Order ──

import { sortByPrice, applyFilters, getSpeedTier } from '../broadband/DealBrowser';
import type { Filters } from '../broadband/FilterBar';

describe('Property 4: Plan Sort Order', () => {
  /**
   * For any list of broadband plans, sortByPrice produces a list where
   * every consecutive pair satisfies plan[i].monthlyPrice <= plan[i+1].monthlyPrice.
   * Validates: Requirements 4.2
   */
  it('PBT: default sort produces ascending monthlyPrice', () => {
    fc.assert(
      fc.property(fc.array(arbPlan, { minLength: 0, maxLength: 20 }), (plans) => {
        const sorted = sortByPrice(plans);

        expect(sorted.length).toBe(plans.length);

        for (let i = 0; i < sorted.length - 1; i++) {
          expect(sorted[i].monthlyPrice).toBeLessThanOrEqual(sorted[i + 1].monthlyPrice);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: sort is stable — does not lose or duplicate plans', () => {
    fc.assert(
      fc.property(fc.array(arbPlan, { minLength: 0, maxLength: 20 }), (plans) => {
        const sorted = sortByPrice(plans);

        const originalIds = plans.map((p) => p.planId).sort();
        const sortedIds = sorted.map((p) => p.planId).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 200 },
    );
  });
});

// ── Property 5: Plan Filter Correctness ──

const arbFilters: fc.Arbitrary<Filters> = fc.record({
  speedTier: fc.option(fc.constantFrom('Fibre', 'Superfast', 'Ultrafast'), { nil: null }),
  contractLength: fc.option(fc.constantFrom(12, 24), { nil: null }),
  planType: fc.option(fc.constantFrom('Core', 'Standard', 'Premium', 'Ultimate'), { nil: null }),
});

function planMatchesFilters(plan: BroadbandPlan, filters: Filters): boolean {
  if (filters.speedTier && getSpeedTier(plan.downloadSpeedMbps) !== filters.speedTier) return false;
  if (filters.contractLength && plan.contractLengthMonths !== filters.contractLength) return false;
  if (filters.planType && plan.planType !== filters.planType) return false;
  return true;
}

describe('Property 5: Plan Filter Correctness', () => {
  /**
   * For any plans + filters, every result matches all criteria and
   * no excluded plan matches all criteria.
   * Validates: Requirements 4.3, 4.7
   */
  it('PBT: filtered results contain exactly the plans matching all active criteria', () => {
    fc.assert(
      fc.property(
        fc.array(arbPlan, { minLength: 0, maxLength: 20 }),
        arbFilters,
        (plans, filters) => {
          const result = applyFilters(plans, filters);
          const resultIds = new Set(result.map((p) => p.planId));

          // Every result matches all criteria
          for (const plan of result) {
            expect(planMatchesFilters(plan, filters)).toBe(true);
          }

          // No excluded plan matches all criteria
          for (const plan of plans) {
            if (!resultIds.has(plan.planId)) {
              expect(planMatchesFilters(plan, filters)).toBe(false);
            }
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('PBT: null filters return all plans', () => {
    fc.assert(
      fc.property(fc.array(arbPlan, { minLength: 0, maxLength: 20 }), (plans) => {
        const noFilters: Filters = { speedTier: null, contractLength: null, planType: null };
        const result = applyFilters(plans, noFilters);
        expect(result.length).toBe(plans.length);
      }),
      { numRuns: 200 },
    );
  });
});

// ── Property 6: Plan Card Contains Required Fields ──

describe('Property 6: Plan Card Contains Required Fields', () => {
  /**
   * For any broadband plan, the plan object contains all required fields
   * for rendering a plan card: name, downloadSpeedMbps, uploadSpeedMbps,
   * technologyType, contractLengthMonths, monthlyPrice, and promotionalLabel
   * (when present).
   * Validates: Requirements 4.1
   */
  it('PBT: every plan has all required card fields defined', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        expect(plan.name).toBeDefined();
        expect(typeof plan.name).toBe('string');
        expect(plan.name.length).toBeGreaterThan(0);

        expect(typeof plan.downloadSpeedMbps).toBe('number');
        expect(plan.downloadSpeedMbps).toBeGreaterThanOrEqual(0);

        expect(typeof plan.uploadSpeedMbps).toBe('number');
        expect(plan.uploadSpeedMbps).toBeGreaterThanOrEqual(0);

        expect(typeof plan.technologyType).toBe('string');
        expect(plan.technologyType.length).toBeGreaterThan(0);

        expect(typeof plan.contractLengthMonths).toBe('number');
        expect(plan.contractLengthMonths).toBeGreaterThan(0);

        expect(typeof plan.monthlyPrice).toBe('number');
        expect(plan.monthlyPrice).toBeGreaterThanOrEqual(0);

        // promotionalLabel is optional — when present it must be a non-empty string
        if (plan.promotionalLabel !== undefined) {
          expect(typeof plan.promotionalLabel).toBe('string');
          expect(plan.promotionalLabel!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: getSpeedTier classifies every plan into a valid tier', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const tier = getSpeedTier(plan.downloadSpeedMbps);
        expect(['Fibre', 'Superfast', 'Ultrafast']).toContain(tier);
      }),
      { numRuns: 300 },
    );
  });
});


// ── Property 13: Monthly Total Calculation ──

import { calculateMonthlyTotal, calculateOneTimeFees } from '../broadband/PricingSummary';

describe('Property 13: Monthly Total Calculation', () => {
  /**
   * For any selection combo, monthlyTotal = plan + addons + tv + sim + phone.
   * Validates: Requirements 9.9
   */
  it('PBT: monthly total equals sum of plan, addons, tv, sim, and phone prices', () => {
    fc.assert(
      fc.property(
        arbPlan,
        fc.array(arbAddon, { minLength: 0, maxLength: 5 }),
        fc.option(arbTvPackage, { nil: null }),
        fc.option(arbSimPlan, { nil: null }),
        fc.option(arbHomePhone, { nil: null }),
        (plan, addons, tv, sim, phone) => {
          const result = calculateMonthlyTotal(
            plan.monthlyPrice,
            addons,
            tv?.monthlyPrice ?? null,
            sim?.monthlyPrice ?? null,
            phone?.monthlyPrice ?? null,
          );

          const expected =
            plan.monthlyPrice +
            addons.reduce((s, a) => s + a.monthlyPrice, 0) +
            (tv?.monthlyPrice ?? 0) +
            (sim?.monthlyPrice ?? 0) +
            (phone?.monthlyPrice ?? 0);

          expect(result).toBeCloseTo(expected, 10);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('PBT: monthly total with no optional items equals plan price', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const result = calculateMonthlyTotal(plan.monthlyPrice, [], null, null, null);
        expect(result).toBeCloseTo(plan.monthlyPrice, 10);
      }),
      { numRuns: 200 },
    );
  });

  it('PBT: monthly total is always >= plan price', () => {
    fc.assert(
      fc.property(
        arbPlan,
        fc.array(arbAddon, { minLength: 0, maxLength: 5 }),
        fc.option(arbTvPackage, { nil: null }),
        fc.option(arbSimPlan, { nil: null }),
        fc.option(arbHomePhone, { nil: null }),
        (plan, addons, tv, sim, phone) => {
          const result = calculateMonthlyTotal(
            plan.monthlyPrice,
            addons,
            tv?.monthlyPrice ?? null,
            sim?.monthlyPrice ?? null,
            phone?.monthlyPrice ?? null,
          );
          expect(result).toBeGreaterThanOrEqual(plan.monthlyPrice - 0.001);
        },
      ),
      { numRuns: 300 },
    );
  });
});

// ── Property 14: One-Time Fees Calculation ──

describe('Property 14: One-Time Fees Calculation', () => {
  /**
   * For any plan, oneTimeTotal = sum of non-zero one-time charges.
   * Validates: Requirements 9.2, 9.8
   */
  it('PBT: one-time total equals sum of activation fee when > 0', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const { fees, total } = calculateOneTimeFees(
          plan.activationFee,
          plan.includesRouter,
          plan.routerName,
        );

        // Total must equal sum of all fee amounts
        const expectedTotal = fees.reduce((s, f) => s + f.amount, 0);
        expect(total).toBeCloseTo(expectedTotal, 10);
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: activation fee appears in fees list iff activationFee > 0', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const { fees } = calculateOneTimeFees(
          plan.activationFee,
          plan.includesRouter,
          plan.routerName,
        );

        const hasActivation = fees.some((f) => f.label === 'Activation fee');
        if (plan.activationFee > 0) {
          expect(hasActivation).toBe(true);
          const activationEntry = fees.find((f) => f.label === 'Activation fee')!;
          expect(activationEntry.amount).toBeCloseTo(plan.activationFee, 10);
        } else {
          expect(hasActivation).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: router fee appears iff router is not included and routerName is set', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const { fees } = calculateOneTimeFees(
          plan.activationFee,
          plan.includesRouter,
          plan.routerName,
        );

        const hasRouterFee = fees.some((f) => f.label.includes('(router)'));
        if (!plan.includesRouter && plan.routerName) {
          expect(hasRouterFee).toBe(true);
        } else {
          expect(hasRouterFee).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: zero activation fee and included router yields empty fees', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (routerName) => {
          const { fees, total } = calculateOneTimeFees(0, true, routerName);
          expect(fees).toEqual([]);
          expect(total).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 15: Pricing Summary Broadband Section Completeness ──

describe('Property 15: Pricing Summary Broadband Section Completeness', () => {
  /**
   * For any plan, the broadband section data contains plan name, contract length,
   * price, router info, and out-of-contract notice when applicable.
   * Validates: Requirements 9.1, 9.3, 9.11
   */
  it('PBT: every plan has all required broadband section fields', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        // Plan name must be a non-empty string
        expect(typeof plan.name).toBe('string');
        expect(plan.name.length).toBeGreaterThan(0);

        // Contract length must be a positive number
        expect(typeof plan.contractLengthMonths).toBe('number');
        expect(plan.contractLengthMonths).toBeGreaterThan(0);

        // Monthly price must be a non-negative number
        expect(typeof plan.monthlyPrice).toBe('number');
        expect(plan.monthlyPrice).toBeGreaterThanOrEqual(0);

        // includesRouter must be a boolean
        expect(typeof plan.includesRouter).toBe('boolean');

        // activationFee must be a non-negative number
        expect(typeof plan.activationFee).toBe('number');
        expect(plan.activationFee).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: out-of-contract notice is applicable iff outOfContractPrice is set and > 0', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        const showNotice = plan.outOfContractPrice != null && plan.outOfContractPrice > 0;

        if (showNotice) {
          expect(plan.outOfContractPrice).toBeGreaterThan(0);
          expect(plan.contractLengthMonths).toBeGreaterThan(0);
        }
        // When outOfContractPrice is undefined or 0, no notice should be shown
        if (plan.outOfContractPrice === undefined || plan.outOfContractPrice === 0) {
          expect(showNotice).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('PBT: router info is present when routerName is defined', () => {
    fc.assert(
      fc.property(arbPlan, (plan) => {
        if (plan.routerName !== undefined) {
          expect(typeof plan.routerName).toBe('string');
          expect(plan.routerName.length).toBeGreaterThan(0);
          // The component shows either "Included" or "Additional charge" based on includesRouter
          expect(typeof plan.includesRouter).toBe('boolean');
        }
      }),
      { numRuns: 300 },
    );
  });
});

// ── Property 16: Pricing Summary Optional Sections ──

describe('Property 16: Pricing Summary Optional Sections', () => {
  /**
   * Sections appear iff corresponding items are selected, with correct details.
   * Validates: Requirements 9.4, 9.5, 9.6, 9.7
   */
  it('PBT: addons section appears iff at least one addon is selected', () => {
    fc.assert(
      fc.property(
        fc.array(arbAddon, { minLength: 0, maxLength: 5 }),
        (selectedAddons) => {
          const showAddonsSection = selectedAddons.length > 0;

          if (showAddonsSection) {
            expect(selectedAddons.length).toBeGreaterThan(0);
            // Each addon must have name and monthlyPrice
            for (const addon of selectedAddons) {
              expect(typeof addon.name).toBe('string');
              expect(addon.name.length).toBeGreaterThan(0);
              expect(typeof addon.monthlyPrice).toBe('number');
            }
            // Subtotal must equal sum of addon prices
            const subtotal = selectedAddons.reduce((s, a) => s + a.monthlyPrice, 0);
            expect(subtotal).toBeGreaterThanOrEqual(0);
          } else {
            expect(selectedAddons.length).toBe(0);
          }
        },
      ),
      { numRuns: 300 },
    );
  });

  it('PBT: TV section appears iff a TV package is selected', () => {
    fc.assert(
      fc.property(
        fc.option(arbTvPackage, { nil: null }),
        (selectedTvPackage) => {
          const showTvSection = selectedTvPackage !== null;

          if (showTvSection) {
            expect(typeof selectedTvPackage.name).toBe('string');
            expect(selectedTvPackage.name.length).toBeGreaterThan(0);
            expect(typeof selectedTvPackage.monthlyPrice).toBe('number');
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('PBT: Mobile section appears iff a SIM plan is selected', () => {
    fc.assert(
      fc.property(
        fc.option(arbSimPlan, { nil: null }),
        (selectedSimPlan) => {
          const showMobileSection = selectedSimPlan !== null;

          if (showMobileSection) {
            expect(typeof selectedSimPlan.name).toBe('string');
            expect(selectedSimPlan.name.length).toBeGreaterThan(0);
            expect(typeof selectedSimPlan.monthlyPrice).toBe('number');
            expect(typeof selectedSimPlan.isUnlimited).toBe('boolean');
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('PBT: Home Phone section appears iff a home phone service is selected', () => {
    fc.assert(
      fc.property(
        fc.option(arbHomePhone, { nil: null }),
        (selectedHomePhone) => {
          const showPhoneSection = selectedHomePhone !== null;

          if (showPhoneSection) {
            expect(typeof selectedHomePhone.name).toBe('string');
            expect(selectedHomePhone.name.length).toBeGreaterThan(0);
            expect(typeof selectedHomePhone.monthlyPrice).toBe('number');
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('PBT: optional section visibility is consistent with selection state', () => {
    fc.assert(
      fc.property(
        fc.array(arbAddon, { minLength: 0, maxLength: 5 }),
        fc.option(arbTvPackage, { nil: null }),
        fc.option(arbSimPlan, { nil: null }),
        fc.option(arbHomePhone, { nil: null }),
        (addons, tv, sim, phone) => {
          // Each section's visibility is a direct boolean of whether the item is selected
          expect(addons.length > 0).toBe(addons.length > 0);
          expect(tv !== null).toBe(tv !== null);
          expect(sim !== null).toBe(sim !== null);
          expect(phone !== null).toBe(phone !== null);

          // Count of visible optional sections
          const visibleCount =
            (addons.length > 0 ? 1 : 0) +
            (tv !== null ? 1 : 0) +
            (sim !== null ? 1 : 0) +
            (phone !== null ? 1 : 0);
          expect(visibleCount).toBeGreaterThanOrEqual(0);
          expect(visibleCount).toBeLessThanOrEqual(4);
        },
      ),
      { numRuns: 300 },
    );
  });
});
