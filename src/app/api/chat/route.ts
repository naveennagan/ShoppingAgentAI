import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { products, deals } from '@/lib/products';
import { createShoppingAssistantPrompt } from '@/lib/prompts';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const SYSTEM_PROMPT = createShoppingAssistantPrompt(products, deals);

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ action: 'none', message: 'API Key not configured' }, { status: 200 });
        }

        const model = genAI.getGenerativeModel({
            model: MODEL,
            generationConfig: { responseMimeType: "application/json" }
        });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: '{"action": "none", "payload": null, "message": "Ready"}' }] },
                ...history.map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }))
            ]
        });

        const result = await chat.sendMessage(message);
        const jsonResponse = JSON.parse(result.response.text());
        
        // Execute API call if requested
        if (jsonResponse.action === 'api_call' && jsonResponse.payload) {
            try {
                const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${jsonResponse.payload.endpoint}`, {
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
        if (error.message?.includes('429') || error.message?.includes('quota')) {
            return NextResponse.json({ action: 'none', message: 'Rate limit exceeded. Please wait.' }, { status: 200 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
