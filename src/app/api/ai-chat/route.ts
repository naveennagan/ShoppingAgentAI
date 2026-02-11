import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { products, deals } from '@/lib/products';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    try {
        const { message, cart, history } = await req.json();

        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
            generationConfig: { responseMimeType: "application/json" }
        });

        const systemPrompt = `You are an AI shopping assistant. 
Available products: ${JSON.stringify(products)}
Available deals: ${JSON.stringify(deals)}
Current cart: ${JSON.stringify(cart)}

Return JSON: {"action": "string", "payload": any, "message": "string"}
Actions: navigate, add_to_cart, clear_cart, update_quantity, remove_from_cart, autofill_checkout`;

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                { role: 'model', parts: [{ text: '{"action": "none", "message": "Ready"}' }] },
                ...history
            ]
        });

        const result = await chat.sendMessage(message);
        const response = JSON.parse(result.response.text());
        
        return NextResponse.json(response);
    } catch (error: any) {
        console.error('AI Chat error:', error);
        return NextResponse.json({ 
            action: 'none', 
            message: 'Sorry, I encountered an issue.' 
        }, { status: 500 });
    }
}
