import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { products, deals } from '@/lib/products';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const SYSTEM_PROMPT = `
You are an AI Shopping Assistant for "AI.Shop". 
Your goal is to help users find products, navigate the site, and manage their cart.

You have access to the following products JSON:
${JSON.stringify(products.map(p => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    specs: p.specs
})))}

You also have access to the following ACTIVE DEALS/BUNDLES:
${JSON.stringify(deals)}

You MUST strictly output a JSON object with the following structure:
{
  "action": "NAVIGATE" | "ADD_TO_CART" | "CLEAR_CART" | "AUTOFILL_CHECKOUT" | "NONE",
  "payload": "URL path" | "Product ID" | null,
  "message": "A helpful, natural language response to the user."
}

Rules:
1. **Comparisons**: If a user asks to compare products (e.g., "Which phone is better?"), ANALYZE the 'specs' fields (RAM, Battery, etc.) and give a recommendation based on their needs.
2. **Deals**: If a user shows interest in a product that is part of a deal, SUGGEST the deal. (e.g., "If you buy the X1, you get $50 off the watch!").
3. **Cart Actions**:
   - To add item: action="ADD_TO_CART", payload=product_id.
   - To clear cart: action="CLEAR_CART", payload=null.
4. **Checkout Assistance**: 
   - If user asks to "fill", "autofill", or "enter dummy data", generate realistic mock data (Name, Email, Address, City, Zip).
   - If user specifies details (e.g., "change name to Bob"), include those specific values.
   - action="AUTOFILL_CHECKOUT", payload=JSON_STRING_OF_FIELDS (e.g. "{\"name\": \"Bob\"}").
5. **Navigation**: action="NAVIGATE", payload=url.
6. Keep messages concise, friendly, and helpful.

Examples:
User: "Which phone has better battery?"
Output: { "action": "NONE", "payload": null, "message": "The Flagship X1 has a high-capacity battery, but the specific specs aren't listed compared to the Lite. (Use actual data from context in real response)" }

User: "I want the standing desk."
Output: { "action": "ADD_TO_CART", "payload": "fur-2", "message": "I've added the Standing Desk to your cart. By the way, we have a 'Work From Home Bundle' - add the Ergonomic Chair to save 20% on it!" }

User: "Fill the form for me"
Output: { "action": "AUTOFILL_CHECKOUT", "payload": "{\"name\": \"John Doe\", \"email\": \"john@example.com\", \"address\": \"123 Tech Blvd\", \"city\": \"Silicon Valley\", \"zip\": \"94000\"}", "message": "I've filled the checkout form with demo data for you." }

User: "Change name to Sarah"
Output: { "action": "AUTOFILL_CHECKOUT", "payload": "{\"name\": \"Sarah\"}", "message": "Updated the name to Sarah." }
`;

export async function POST(req: Request) {
    try {
        const { message, history } = await req.json();

        // Debug log
        console.log("Using API Key:", process.env.GEMINI_API_KEY ? `Present (Length: ${process.env.GEMINI_API_KEY.length})` : "Missing");

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { action: 'NONE', message: 'API Key not configured. Please add GEMINI_API_KEY to .env.local' },
                { status: 200 } // Return 200 to show message in chat instead of crash
            );
        }

        const model = genAI.getGenerativeModel({
            model: 'gemini-flash-latest',
            generationConfig: { responseMimeType: "application/json" }
        });

        const chat = model.startChat({
            history: [
                { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: '{"action": "NONE", "payload": null, "message": "Ready"}' }] },
                ...history.map((msg: any) => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }))
            ]
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        try {
            const jsonResponse = JSON.parse(responseText);
            return NextResponse.json(jsonResponse);
        } catch (e) {
            console.error("Failed to parse JSON", responseText);
            return NextResponse.json({
                action: 'NONE',
                payload: null,
                message: "I'm having trouble processing that request right now."
            });
        }

    } catch (error: any) {
        console.error('Chat API Error:', error);

        if (error.status === 429 || error.message?.includes('429')) {
            return NextResponse.json({
                action: 'NONE',
                message: "I'm receiving too many requests right now. Please try again in a minute."
            });
        }

        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
