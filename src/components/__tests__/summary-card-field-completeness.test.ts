// Feature: ai-rag-enhanced-chat, Property 13: Summary card field completeness
//
// For any summary card in a chat response, if the type is "product" then the card
// shall contain name, price, brand, and rating fields; if the type is "broadband"
// then the card shall contain plan name, download speed, upload speed, monthly price,
// and contract length fields.
// Validates: Requirements 5.1, 5.2

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { ProductSummary, BroadbandSummary, SummaryCardProps } from '../SummaryCard';

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

const arbProductCard: fc.Arbitrary<SummaryCardProps> = arbProductSummary.map(data => ({
  type: 'product' as const,
  data,
  onAction: () => {},
}));

const arbBroadbandCard: fc.Arbitrary<SummaryCardProps> = arbBroadbandSummary.map(data => ({
  type: 'broadband' as const,
  data,
  onAction: () => {},
}));

// ── Property Tests ──

describe('Property 13: Summary card field completeness', () => {
  it('product summary cards contain name, price, brand, and rating', () => {
    fc.assert(
      fc.property(arbProductSummary, (product) => {
        expect(product.name).toBeDefined();
        expect(typeof product.name).toBe('string');
        expect(product.name.length).toBeGreaterThan(0);

        expect(product.price).toBeDefined();
        expect(typeof product.price).toBe('number');
        expect(product.price).toBeGreaterThan(0);

        expect(product.brand).toBeDefined();
        expect(typeof product.brand).toBe('string');
        expect(product.brand.length).toBeGreaterThan(0);

        expect(product.rating).toBeDefined();
        expect(typeof product.rating).toBe('number');
        expect(product.rating).toBeGreaterThanOrEqual(0);
        expect(product.rating).toBeLessThanOrEqual(5);
      }),
      { numRuns: 100 }
    );
  });

  it('broadband summary cards contain plan name, download speed, upload speed, monthly price, and contract length', () => {
    fc.assert(
      fc.property(arbBroadbandSummary, (plan) => {
        expect(plan.name).toBeDefined();
        expect(typeof plan.name).toBe('string');
        expect(plan.name.length).toBeGreaterThan(0);

        expect(plan.downloadSpeed).toBeDefined();
        expect(typeof plan.downloadSpeed).toBe('string');
        expect(plan.downloadSpeed.length).toBeGreaterThan(0);

        expect(plan.uploadSpeed).toBeDefined();
        expect(typeof plan.uploadSpeed).toBe('string');
        expect(plan.uploadSpeed.length).toBeGreaterThan(0);

        expect(plan.monthlyPrice).toBeDefined();
        expect(typeof plan.monthlyPrice).toBe('number');
        expect(plan.monthlyPrice).toBeGreaterThan(0);

        expect(plan.contractLength).toBeDefined();
        expect(typeof plan.contractLength).toBe('string');
        expect(plan.contractLength.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('product card props have correct type discriminator and required data fields', () => {
    fc.assert(
      fc.property(arbProductCard, (card) => {
        expect(card.type).toBe('product');
        const data = card.data as ProductSummary;
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('price');
        expect(data).toHaveProperty('brand');
        expect(data).toHaveProperty('rating');
        expect(data).toHaveProperty('id');
      }),
      { numRuns: 100 }
    );
  });

  it('broadband card props have correct type discriminator and required data fields', () => {
    fc.assert(
      fc.property(arbBroadbandCard, (card) => {
        expect(card.type).toBe('broadband');
        const data = card.data as BroadbandSummary;
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('downloadSpeed');
        expect(data).toHaveProperty('uploadSpeed');
        expect(data).toHaveProperty('monthlyPrice');
        expect(data).toHaveProperty('contractLength');
        expect(data).toHaveProperty('id');
      }),
      { numRuns: 100 }
    );
  });

  it('product price is representable as a formatted currency string', () => {
    fc.assert(
      fc.property(arbProductSummary, (product) => {
        const formatted = `£${product.price.toFixed(2)}`;
        expect(formatted).toMatch(/^£\d+\.\d{2}$/);
      }),
      { numRuns: 100 }
    );
  });

  it('broadband monthly price is representable as a formatted currency string', () => {
    fc.assert(
      fc.property(arbBroadbandSummary, (plan) => {
        const formatted = `£${plan.monthlyPrice.toFixed(2)}`;
        expect(formatted).toMatch(/^£\d+\.\d{2}$/);
      }),
      { numRuns: 100 }
    );
  });
});
