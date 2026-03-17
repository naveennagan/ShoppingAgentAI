import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { Product, Promotion, Bundle } from '@/lib/products';
import { createShoppingAssistantPrompt } from '@/lib/prompts';
import type { BroadbandPlan } from '@/types/broadband';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// ── Simple server-side cache (60 s TTL) ──────────────────────────────────────
let cache: {
    products: Product[];
    promotions: Promotion[];
    bundles: Bundle[];
    couponProductMappings: Record<string, string[]>;
    expiresAt: number;
} | null = null;

async function fetchBackendData() {
    if (cache && Date.now() < cache.expiresAt) return cache;

    const [productsRes, promotionsRes, bundlesRes, couponMappingsRes] = await Promise.all([
        fetch(`${API_URL}/api/products`),
        fetch(`${API_URL}/api/promotions`),
        fetch(`${API_URL}/api/bundles/active`),
        fetch(`${API_URL}/api/promotions/coupon-product-mappings`),
    ]);

    cache = {
        products: productsRes.ok ? await productsRes.json() : [],
        promotions: promotionsRes.ok ? await promotionsRes.json() : [],
        bundles: bundlesRes.ok ? await bundlesRes.json() : [],
        couponProductMappings: couponMappingsRes.ok ? await couponMappingsRes.json() : {},
        expiresAt: Date.now() + 60_000,
    };
    return cache;
}

/** Resolve a short ID (p0, p1…) or passthrough real UUID using the idMap */
function resolveId(val: unknown, idMap: Record<string, string>): string {
    const s = String(val);
    return idMap[s] ?? s;
}

export async function POST(req: Request) {
    try {
        const { message, history, cartItems, appliedCouponCode, broadbandPlans } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ action: 'none', message: 'API Key not configured' });
        }

        const { products, promotions, bundles, couponProductMappings } = await fetchBackendData();
        const { prompt: systemPrompt, idMap } = createShoppingAssistantPrompt(
            products, promotions, bundles, couponProductMappings, cartItems ?? [], appliedCouponCode ?? null,
            (broadbandPlans as BroadbandPlan[]) ?? []
        );

        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: { responseMimeType: 'application/json' }
        });

        // Keep last 6 turns (3 exchanges) — enough context, far fewer tokens
        const trimmedHistory = (history as { role: string; text: string }[])
            .filter(m => m.text?.trim())
            .slice(-6)
            .map(m => ({
                role: m.role === 'ai' || m.role === 'model' ? 'model' : 'user',
                // Strip JSON boilerplate from AI turns — only keep the message field
                parts: [{ text: m.role === 'ai' ? extractMessage(m.text) : m.text }]
            }));

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: '{"action":"none","message":"Ready"}' }] },
                ...trimmedHistory
            ]
        });

        const result = await chat.sendMessage(message);
        const raw = result.response.text();
        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        const jsonResponse = JSON.parse(cleaned);

        // Helper to resolve IDs in a payload
        function resolvePayload(payload: any) {
            if (!payload) return payload;
            if (typeof payload === 'string') return resolveId(payload, idMap);
            if (Array.isArray(payload)) return payload.map((v: unknown) => resolveId(v, idMap));
            if (typeof payload === 'object') {
                if (payload.productId) payload.productId = resolveId(payload.productId, idMap);
                return payload;
            }
            return payload;
        }

        // Resolve short IDs → real UUIDs in actions array
        if (Array.isArray(jsonResponse.actions)) {
            for (const act of jsonResponse.actions) {
                act.payload = resolvePayload(act.payload);
            }
        }
        // Also support legacy single action format
        if (jsonResponse.payload) {
            jsonResponse.payload = resolvePayload(jsonResponse.payload);
        }
        if (Array.isArray(jsonResponse.suggestions)) {
            jsonResponse.suggestions = jsonResponse.suggestions.map((v: unknown) => resolveId(v, idMap));
        }

        return NextResponse.json(jsonResponse);

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : '';
        console.error('Chat API error:', msg, error);
        if (msg.includes('429') || msg.includes('quota')) {
            return NextResponse.json({ action: 'none', message: 'Rate limit reached. Please wait a moment.' });
        }
        return NextResponse.json({ action: 'none', message: 'Sorry, something went wrong.' });
    }
}

/** Pull just the human-readable message out of a JSON AI response string */
function extractMessage(text: string): string {
    try {
        const parsed = JSON.parse(text);
        return parsed.message ?? text;
    } catch {
        return text;
    }
}
