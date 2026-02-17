import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { Product, Promotion, Bundle } from '@/lib/products';
import { createShoppingAssistantPrompt } from '@/lib/prompts';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function fetchBackendData(): Promise<{ products: Product[]; promotions: Promotion[]; bundles: Bundle[] }> {
    try {
        const [productsRes, promotionsRes, bundlesRes] = await Promise.all([
            fetch(`${API_URL}/api/products`),
            fetch(`${API_URL}/api/promotions`),
            fetch(`${API_URL}/api/bundles/active`),
        ]);

        const products: Product[] = productsRes.ok ? await productsRes.json() : [];
        const promotions: Promotion[] = promotionsRes.ok ? await promotionsRes.json() : [];
        const bundles: Bundle[] = bundlesRes.ok ? await bundlesRes.json() : [];

        return { products, promotions, bundles };
    } catch (error) {
        console.error('Failed to fetch backend data:', error);
        return { products: [], promotions: [], bundles: [] };
    }
}

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ action: 'none', message: 'API Key not configured' }, { status: 200 });
        }

        const { products, promotions, bundles } = await fetchBackendData();
        const systemPrompt = createShoppingAssistantPrompt(products, promotions, bundles);

        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: '{"action": "none", "payload": null, "message": "Ready"}' }] },
                ...history
                    .filter((msg: any) => msg.text && msg.text.trim())
                    .map((msg: any) => ({
                        role: msg.role === 'ai' || msg.role === 'model' ? 'model' : 'user',
                        parts: [{ text: msg.text }]
                    }))
            ]
        });

        const result = await chat.sendMessage(message);
        const jsonResponse = JSON.parse(result.response.text());
        
        // Execute API call if requested
        if (jsonResponse.action === 'api_call' && jsonResponse.payload) {
            try {
                const apiRes = await fetch(`${API_URL}${jsonResponse.payload.endpoint}`, {
                    method: jsonResponse.payload.method || 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    body: jsonResponse.payload.body ? JSON.stringify(jsonResponse.payload.body) : undefined
                });
                jsonResponse.apiResult = await apiRes.json();
            } catch (err) {
                jsonResponse.message += ' (API call failed)';
            }
        }
        
        return NextResponse.json(jsonResponse);

    } catch (error: any) {
        console.error('Chat API error:', error);
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json({ action: 'none', message: 'Rate limit exceeded. Please wait.' }, { status: 200 });
        }
        return NextResponse.json({ action: 'none', message: 'Sorry, I encountered an issue.' }, { status: 200 });
    }
}
