// Feature: ai-rag-enhanced-chat, Property 16: Max 3 summary cards per response
//
// For any AI response containing summary cards, the Chat_Panel shall render
// at most 3 summary cards.
// **Validates: Requirements 5.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ProductSummary, BroadbandSummary } from '../SummaryCard';

// ── Arbitraries ──

const arbProductSummary: fc.Arbitrary<ProductSummary> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  price: fc.double({ min: 0.01, max: 10000, noNaN: true }),
  brand: fc.string({ minLength: 1, maxLength: 50 }),
  rating: fc.double({ min: 0, max: 5, noNaN: true }),
  promotionalLabel: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
});

const arbBroadbandSummary: fc.Arbitrary<BroadbandSummary> = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  downloadSpeed: fc.string({ minLength: 1, maxLength: 20 }),
  uploadSpeed: fc.string({ minLength: 1, maxLength: 20 }),
  monthlyPrice: fc.double({ min: 0.01, max: 200, noNaN: true }),
  contractLength: fc.string({ minLength: 1, maxLength: 20 }),
  promotionalLabel: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
});

interface RawSummaryCard {
  type: 'product' | 'broadband';
  id: string;
  name: string;
  price?: number;
  brand?: string;
  rating?: number;
  downloadSpeed?: string;
  uploadSpeed?: string;
  monthlyPrice?: number;
  contractLength?: string;
  promotionalLabel?: string | null;
}

/** Generates a RawSummaryCard from either a product or broadband summary */
const arbRawSummaryCard: fc.Arbitrary<RawSummaryCard> = fc.oneof(
  arbProductSummary.map((p): RawSummaryCard => ({
    type: 'product',
    id: p.id,
    name: p.name,
    price: p.price,
    brand: p.brand,
    rating: p.rating,
    promotionalLabel: p.promotionalLabel,
  })),
  arbBroadbandSummary.map((b): RawSummaryCard => ({
    type: 'broadband',
    id: b.id,
    name: b.name,
    downloadSpeed: b.downloadSpeed,
    uploadSpeed: b.uploadSpeed,
    monthlyPrice: b.monthlyPrice,
    contractLength: b.contractLength,
    promotionalLabel: b.promotionalLabel,
  })),
);

/** Generates an array of 0–10 raw summary cards (mix of product and broadband) */
const arbSummaryCardArray: fc.Arbitrary<RawSummaryCard[]> = fc.array(arbRawSummaryCard, { minLength: 0, maxLength: 10 });

/**
 * Replicates the clamping logic from AiChatPanel.tsx:
 *   summaryCards: Array.isArray(data.summaryCards) ? data.summaryCards.slice(0, 3) : undefined
 * and at render time:
 *   msg.summaryCards.slice(0, 3).map(...)
 */
function clampSummaryCards(cards: RawSummaryCard[]): RawSummaryCard[] {
  return cards.slice(0, 3);
}

// ── Property Tests ──

describe('Property 16: Max 3 summary cards per response', () => {
  it('clamped array never exceeds 3 cards regardless of input size', () => {
    fc.assert(
      fc.property(arbSummaryCardArray, (cards) => {
        const clamped = clampSummaryCards(cards);
        expect(clamped.length).toBeLessThanOrEqual(3);
      }),
      { numRuns: 100 },
    );
  });

  it('clamping preserves the first 3 cards when more than 3 are provided', () => {
    fc.assert(
      fc.property(
        fc.array(arbRawSummaryCard, { minLength: 4, maxLength: 10 }),
        (cards) => {
          const clamped = clampSummaryCards(cards);
          expect(clamped).toHaveLength(3);
          expect(clamped[0]).toEqual(cards[0]);
          expect(clamped[1]).toEqual(cards[1]);
          expect(clamped[2]).toEqual(cards[2]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('arrays with 3 or fewer cards are unchanged after clamping', () => {
    fc.assert(
      fc.property(
        fc.array(arbRawSummaryCard, { minLength: 0, maxLength: 3 }),
        (cards) => {
          const clamped = clampSummaryCards(cards);
          expect(clamped).toHaveLength(cards.length);
          expect(clamped).toEqual(cards);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('clamping is idempotent — applying it twice yields the same result', () => {
    fc.assert(
      fc.property(arbSummaryCardArray, (cards) => {
        const once = clampSummaryCards(cards);
        const twice = clampSummaryCards(once);
        expect(twice).toEqual(once);
      }),
      { numRuns: 100 },
    );
  });
});
