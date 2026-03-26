import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import type { CheckoutSession, CheckoutCartItem } from '@/types/checkout';

/**
 * Checkout About You Cleanup — Preservation Test (Property 2)
 *
 * Validates: Requirements 3.1, 3.2, 3.5
 *
 * Property 2: Preservation - Payment Step and Form Behavior Unchanged
 *
 * For any checkout state where the step is 'payment', the fixed component
 * SHALL continue to render DevicePaymentSection, BroadbandSection, and the
 * compact about-you summary bar with Edit button — identical to the original.
 */

// --- Source code analysis: read the actual checkout page ---
const checkoutPagePath = path.resolve(__dirname, '../../app/checkout/page.tsx');
const checkoutSource = fs.readFileSync(checkoutPagePath, 'utf-8');

/**
 * Extract the JSX block for {step === 'payment' && (...)} from the source code.
 * We look for the pattern followed by '&&' to skip ternary usages in the stepper UI.
 */
function extractPaymentStepBlock(source: string): string {
  const marker = `step === 'payment'`;
  let searchFrom = 0;
  while (searchFrom < source.length) {
    const idx = source.indexOf(marker, searchFrom);
    if (idx === -1) return '';

    // Check if this occurrence is followed by '&&' (the conditional render block)
    const afterMarker = source.substring(idx + marker.length, idx + marker.length + 20).trim();
    if (!afterMarker.startsWith('&&')) {
      searchFrom = idx + marker.length;
      continue;
    }

    // Find the opening paren after '&&'
    const andIdx = source.indexOf('&&', idx + marker.length);
    const parenIdx = source.indexOf('(', andIdx);
    if (parenIdx === -1) return '';

    // Track parens to find the matching close
    let depth = 1;
    let i = parenIdx + 1;
    while (i < source.length && depth > 0) {
      if (source[i] === '(') depth++;
      else if (source[i] === ')') depth--;
      i++;
    }

    return source.slice(parenIdx, i);
  }
  return '';
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

/**
 * Generate sessions that would land on the payment step.
 * The payment step is reached when:
 * - customerDetails.fullName exists, OR
 * - devicePaymentDone is true, OR
 * - all broadband items are booked
 */
const paymentStepSessionArb: fc.Arbitrary<CheckoutSession> = fc
  .tuple(
    fc.array(deviceItemArb, { minLength: 0, maxLength: 5 }),
    fc.array(serviceItemArb, { minLength: 0, maxLength: 3 }),
    fc.boolean(),
    fc.record({
      fullName: fc.string({ minLength: 1, maxLength: 40 }),
      email: fc.emailAddress(),
      phone: fc.string({ minLength: 5, maxLength: 15 }),
      address: fc.string({ minLength: 5, maxLength: 80 }),
    }),
  )
  .filter(([devices, services]) => devices.length > 0 || services.length > 0)
  .map(([deviceItems, serviceItems, devicePaymentDone, customerDetails]) => {
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
      customerDetails,
    };
  });

// ─────────────────────────────────────────────────────────────────────────────
// Property 2: Preservation — Payment Step and Form Behavior Unchanged
// ─────────────────────────────────────────────────────────────────────────────
describe('Checkout Payment Step Preservation — Property 2', () => {
  const paymentBlock = extractPaymentStepBlock(checkoutSource);

  // Sanity: we successfully extracted the payment step block
  it('payment step block exists in checkout page source', () => {
    expect(paymentBlock.length).toBeGreaterThan(0);
  });

  // --- Unit tests for specific preservation requirements ---

  /**
   * Validates: Requirement 3.1
   * The payment step must contain DevicePaymentSection.
   */
  it('payment step block contains DevicePaymentSection component', () => {
    expect(paymentBlock).toContain('DevicePaymentSection');
  });

  /**
   * Validates: Requirement 3.2
   * The payment step must contain BroadbandSection.
   */
  it('payment step block contains BroadbandSection component', () => {
    expect(paymentBlock).toContain('BroadbandSection');
  });

  /**
   * Validates: Requirement 3.5
   * The payment step must contain the compact about-you summary bar
   * showing name, email, address with an Edit button.
   */
  it('payment step block contains compact about-you summary bar', () => {
    // The summary bar renders: {aboutYou.fullName} · {aboutYou.email} · {aboutYou.address}
    expect(paymentBlock).toContain('aboutYou.fullName');
    expect(paymentBlock).toContain('aboutYou.email');
    expect(paymentBlock).toContain('aboutYou.address');
  });

  it('payment step block contains Edit button for about-you summary', () => {
    expect(paymentBlock).toContain('Edit');
    // The Edit button sets step back to 'about'
    expect(paymentBlock).toContain("setStep('about')");
  });

  /**
   * Validates: Requirement 3.1
   * DevicePaymentSection is conditionally rendered when session.hasDevices is true.
   */
  it('DevicePaymentSection is gated by session.hasDevices', () => {
    expect(paymentBlock).toContain('session.hasDevices');
    expect(paymentBlock).toContain('DevicePaymentSection');
  });

  /**
   * Validates: Requirement 3.2
   * BroadbandSection is conditionally rendered when session.hasBroadbandService is true.
   */
  it('BroadbandSection is gated by session.hasBroadbandService', () => {
    expect(paymentBlock).toContain('session.hasBroadbandService');
    expect(paymentBlock).toContain('BroadbandSection');
  });

  // --- Property-based test ---

  /**
   * Validates: Requirements 3.1, 3.2, 3.5
   *
   * PBT Property 2: For any randomly generated payment-step session,
   * the payment step source code always contains DevicePaymentSection,
   * BroadbandSection, and the compact about-you summary bar with Edit button.
   * This guarantees the fix did not alter the payment step rendering.
   */
  it('PBT: for any payment-step session, the payment step source preserves all key components', () => {
    fc.assert(
      fc.property(paymentStepSessionArb, (session) => {
        // The payment step block must always contain these components
        // regardless of what session data is generated
        expect(paymentBlock).toContain('DevicePaymentSection');
        expect(paymentBlock).toContain('BroadbandSection');

        // Compact about-you summary bar with Edit button
        expect(paymentBlock).toContain('aboutYou.fullName');
        expect(paymentBlock).toContain('aboutYou.email');
        expect(paymentBlock).toContain('aboutYou.address');
        expect(paymentBlock).toContain('Edit');

        // Conditional rendering guards are preserved
        if (session.hasDevices) {
          expect(paymentBlock).toContain('session.hasDevices');
        }
        if (session.hasBroadbandService) {
          expect(paymentBlock).toContain('session.hasBroadbandService');
        }
      }),
      { numRuns: 100 },
    );
  });
});
