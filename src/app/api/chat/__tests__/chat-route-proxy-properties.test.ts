import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { POST } from '../route';

// Feature: broadband-chat-ux-improvements, Property 7: Chat route proxies backend response unchanged

// ── Arbitraries ──

const arbSummaryCard = fc.record({
  type: fc.constantFrom('product', 'broadband', 'bundle'),
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 40 }),
  price: fc.option(fc.double({ min: 0, max: 999, noNaN: true }), { nil: undefined }),
  brand: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  rating: fc.option(fc.double({ min: 0, max: 5, noNaN: true }), { nil: undefined }),
  downloadSpeed: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  uploadSpeed: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  monthlyPrice: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), { nil: undefined }),
  contractLength: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
  promotionalLabel: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
});

const arbChatResponse = fc.record({
  action: fc.constantFrom('none', 'addToCart', 'removeFromCart', 'showProducts', 'showBroadband', 'bookAppointment'),
  payload: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: undefined }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  summaryCards: fc.option(fc.array(arbSummaryCard, { minLength: 0, maxLength: 5 }), { nil: undefined }),
  suggestedActions: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 0, maxLength: 5 }), { nil: undefined }),
});

// ── Helpers ──

function makeRequest(body: Record<string, unknown> = { message: 'hello' }): Request {
  return new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── Tests ──

describe('Feature: broadband-chat-ux-improvements, Property 7: Chat route proxies backend response unchanged', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should return the backend ChatResponse JSON identically for any valid response shape', async () => {
    await fc.assert(
      fc.asyncProperty(arbChatResponse, async (chatResponse) => {
        // Mock fetch to return the generated ChatResponse
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => chatResponse,
        });

        const response = await POST(makeRequest());
        const result = await response.json();

        // Strip undefined fields for comparison (JSON serialization drops them)
        const expected = JSON.parse(JSON.stringify(chatResponse));
        expect(result).toEqual(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('should not add, remove, or modify any fields from the backend response', async () => {
    await fc.assert(
      fc.asyncProperty(arbChatResponse, async (chatResponse) => {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => chatResponse,
        });

        const response = await POST(makeRequest());
        const result = await response.json();
        const expected = JSON.parse(JSON.stringify(chatResponse));

        // Verify exact key sets match (no added/removed fields)
        expect(Object.keys(result).sort()).toEqual(Object.keys(expected).sort());

        // Verify each field value is identical
        for (const key of Object.keys(expected)) {
          expect(result[key]).toEqual(expected[key]);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should preserve nested summaryCards array structure unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbSummaryCard, { minLength: 1, maxLength: 5 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        async (cards, message) => {
          const chatResponse = {
            action: 'showProducts',
            message,
            summaryCards: cards,
          };

          globalThis.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => chatResponse,
          });

          const response = await POST(makeRequest());
          const result = await response.json();
          const expected = JSON.parse(JSON.stringify(chatResponse));

          expect(result.summaryCards).toEqual(expected.summaryCards);
          expect(result.summaryCards.length).toBe(cards.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
