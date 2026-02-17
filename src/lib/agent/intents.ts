import { Product } from '@/lib/products';

export type AgentActionType = 'NAVIGATE' | 'ADD_TO_CART' | 'RESPONSE';

export interface AgentAction {
    type: AgentActionType;
    payload?: any;
    message: string;
}

export function processUserMessage(input: string, products: Product[] = []): AgentAction {
    const lower = input.toLowerCase();

    // Navigation Intents
    if (lower.includes('checkout') || lower.includes('pay')) {
        return { type: 'NAVIGATE', payload: '/checkout', message: "Taking you to checkout." };
    }
    if (lower.includes('cart') || lower.includes('basket')) {
        return { type: 'NAVIGATE', payload: '/cart', message: "Here is your shopping cart." };
    }
    if (lower.includes('home') || lower.includes('main')) {
        return { type: 'NAVIGATE', payload: '/', message: "Going back to home." };
    }
    if (lower.includes('products') || lower.includes('shop') || lower.includes('browse')) {
        return { type: 'NAVIGATE', payload: '/products', message: "Showing all products." };
    }

    // Add to Cart Logic (Exact 'add' + product match)
    if (lower.includes('add')) {
        const product = products.find(p => lower.includes(p.name.toLowerCase()) || lower.includes(p.category.toLowerCase()));
        if (product) {
            return { type: 'ADD_TO_CART', payload: product, message: `Added ${product.name} to your cart.` };
        }
    }

    // Search/Find Product Logic
    if (lower.includes('show') || lower.includes('find') || lower.includes('buy') || lower.includes('looking for')) {
        const product = products.find(p => lower.includes(p.name.toLowerCase()));
        if (product) {
            return { type: 'NAVIGATE', payload: `/products/${product.id}`, message: `Found ${product.name}.` };
        }

        const category = products.find(p => lower.includes(p.category.toLowerCase()));
        if (category) {
            return { type: 'NAVIGATE', payload: '/products', message: `Here are some ${category.category} items.` };
        }
    }

    // Specific Product Direct Match
    const exactMatch = products.find(p => lower.includes(p.name.toLowerCase()));
    if (exactMatch) {
        return { type: 'NAVIGATE', payload: `/products/${exactMatch.id}`, message: `Checking out ${exactMatch.name}.` };
    }

    // Default fallback
    return { type: 'RESPONSE', message: "I'm not sure how to help with that. Try 'Show me headphones', 'Go to cart', or 'Checkout'." };
}
