import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import type { CheckoutSession, CheckoutCartItem } from '@/types/checkout';

/**
 * Checkout About You Cleanup — Bug Condition Exploration Test
 *
 * The bug: the About You step (step 1) rendered an OrderSummaryBar showing
 * device/broadband summary lines ("📦 1 device £815.00 due today",
 * "📡 Broadband £48.99/mo after installation") above the form.
 *
 * The fix removed the OrderSummaryBar from the about step block.
 *
 * These tests verify the fix by:
 * 1. Inspecting the actual source code to confirm OrderSummaryBar is not
 *    rendered in the about step block
 * 2. Verifying the rendering decision logic for any generated session
 */

// --- Source code analysis: read the actual checkout page ---
const checkoutPagePath = path.resolve(__dirname, '../../app/checkout/page.tsx');
const checkoutSource = fs.readFileSync(checkoutPagePath, 'utf-8');

/**
 * Extract the JSX block for step === 'about' from the source code.
 * The about step block starts with `{step === 'about' && (` and ends
 * with the matching closing `)}`.
 */
function extractAboutStepBlock(source: string): string {
  const marker = `step === 'about'`;
  const idx = source.indexOf(marker);
  if (idx === -1) return '';

  // Find the opening paren after the marker
  const afterMarker = source.indexOf('(', idx);
  if (afterMarker === -1) return '';

  // Track parens to find the matching close
  let depth = 1;
  let i = afterMarker + 1;
  while (i < source.length && depth > 0) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') depth--;
    i++;
  }

  return source.slice(afterMarker, i);
}

// --- Bug condition check from the design doc ---
function isBugCondition(input: { step: 'about' | 'payment'; session: CheckoutSession | null }): boolean {
  return (
    input.step === 'about' &&
    input.session !== null &&
    (input.session.hasDevices || input.session.hasBroadbandService)
  );
}

// --- Generators ---
const deviceItemArb: fc.Arbitrary<CheckoutCartItem> = fc.record({
  cartItemId: fc.uuid(),
  itemType: fc.constant('device' as const),
  fulfillmentType: fc.constant('shipping' as const),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(5000), noNaN: true }),
  quantity: fc.integer({ min: 1, max: 10 }),
});

const serviceItemArb: fc.Arbitrary<CheckoutCartItem> = fc.record({
  cartItemId: fc.uuid(),
  itemType: fc.constant('broadband_service' as const),
  fulfillmentType: fc.constant('installation' as const),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  unitPrice: fc.float({ min: Math.fround(0.01), max: Math.fround(200), noNaN: true }),
  quantity: fc.constant(1),
});

const bugConditionSessionArb: fc.Arbitrary<CheckoutSession> = fc
  .tuple(
    fc.array(deviceItemArb, { minLength: 0, maxLength: 5 }),
    fc.array(serviceItemArb, { minLength: 0, maxLength: 3 }),
    fc.boolean(),
  )
  .filter(([devices, services]) => devices.length > 0 || services.length > 0)
  .map(([deviceItems, serviceItems, devicePaymentDone]) => {
    const hasDevices = deviceItems.length > 0;
    const hasBroadbandService = serviceItems.length > 0;
    const oneTimeTotal = deviceItems.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
    const monthlyTotal = serviceItems.reduce((sum, s) => sum + s.unitPrice, 0);
    const broadbandBookingStatus: Record<string, string> = {};
    for (const si of serviceItems) {
      broadbandBookingStatus[si.cartItemId] = 'unbooked';
    }
    return {
      sessionId: 'test-session',
      hasDevices,
      hasBroadbandService,
      devicePaymentDone,
      broadbandBookingStatus,
      oneTimeTotal,
      monthlyTotal,
      status: 'open' as const,
      deviceItems,
      serviceItems,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Property 1: Bug Condition — OrderSummaryBar Not Rendered on About You Step
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkout About You Cleanup — OrderSummaryBar removal', () => {
  const aboutBlock = extractAboutStepBlock(checkoutSource);

  // Verify we successfully extracted the about step block
  it('about step block exists in checkout page source', () => {
    expect(aboutBlock.length).toBeGreaterThan(0);
    expect(aboutBlock).toContain('Your Details');
  });

  /**
   * Validates: Requirements 2.1, 2.2
   *
   * Core assertion: the about step block in the actual source code does NOT
   * contain any OrderSummaryBar component reference or summary content patterns.
   */
  it('about step block does not contain OrderSummaryBar component', () => {
    expect(aboutBlock).not.toContain('OrderSummaryBar');
  });

  it('about step block does not contain device summary emoji (📦)', () => {
    expect(aboutBlock).not.toContain('📦');
  });

  it('about step block does not contain broadband summary emoji (📡)', () => {
    expect(aboutBlock).not.toContain('📡');
  });

  it('about step block does not contain "due today" text', () => {
    expect(aboutBlock.toLowerCase()).not.toContain('due today');
  });

  it('about step block does not contain "after installation" text', () => {
    expect(aboutBlock.toLowerCase()).not.toContain('after installation');
  });

  it('about step block still contains the Your Details form', () => {
    expect(aboutBlock).toContain('Your Details');
    expect(aboutBlock).toContain('Full name');
    expect(aboutBlock).toContain('Email address');
    expect(aboutBlock).toContain('Phone number');
    expect(aboutBlock).toContain('address');
    expect(aboutBlock).toContain('Continue to Payment');
  });

  /**
   * Validates: Requirements 2.1, 2.2
   *
   * PBT Property 1: For any checkout session where the bug condition holds
   * (step is 'about', session has devices and/or broadband), the About You
   * step source code does not contain OrderSummaryBar — meaning no matter
   * what session data is generated, the component will never render summary
   * content on the about step.
   */
  it('PBT: for any session with devices/broadband, the about step source has no OrderSummaryBar', () => {
    fc.assert(
      fc.property(bugConditionSessionArb, (session) => {
        // Confirm bug condition holds for this generated session
        expect(isBugCondition({ step: 'about', session })).toBe(true);

        // The about step block in the actual source code has no OrderSummaryBar.
        // This means regardless of session content (devices, broadband, prices),
        // the component will never render summary bar content on the about step.
        expect(aboutBlock).not.toContain('OrderSummaryBar');
        expect(aboutBlock).not.toContain('📦');
        expect(aboutBlock).not.toContain('📡');

        // The form is still present
        expect(aboutBlock).toContain('Your Details');
      }),
      { numRuns: 100 }
    );
  });

  // Unit test: specific example from the bug report
  it('session with 1 device at £815.00 and broadband at £48.99/mo — no summary bar on About You', () => {
    const session: CheckoutSession = {
      sessionId: 'test-session',
      hasDevices: true,
      hasBroadbandService: true,
      devicePaymentDone: false,
      broadbandBookingStatus: { 'bb-item-1': 'unbooked' },
      oneTimeTotal: 815.0,
      monthlyTotal: 48.99,
      status: 'open',
      deviceItems: [
        {
          cartItemId: 'dev-1',
          itemType: 'device',
          fulfillmentType: 'shipping',
          displayName: 'iPhone 16 Pro',
          unitPrice: 815.0,
          quantity: 1,
        },
      ],
      serviceItems: [
        {
          cartItemId: 'bb-item-1',
          itemType: 'broadband_service',
          fulfillmentType: 'installation',
          displayName: 'Superfast 100',
          unitPrice: 48.99,
          quantity: 1,
        },
      ],
    };

    // Bug condition holds
    expect(isBugCondition({ step: 'about', session })).toBe(true);

    // The source code confirms no OrderSummaryBar in the about step
    expect(aboutBlock).not.toContain('OrderSummaryBar');

    // Verify the about block doesn't have any summary text patterns
    // that would have been generated by OrderSummaryBar for this session:
    // "📦 1 device £815.00 due today"
    // "📡 Broadband £48.99/mo after installation"
    expect(aboutBlock).not.toContain('📦');
    expect(aboutBlock).not.toContain('📡');
    expect(aboutBlock).not.toMatch(/\bdevice\b/i);
    expect(aboutBlock).not.toMatch(/\bBroadband\b/);
  });
});
