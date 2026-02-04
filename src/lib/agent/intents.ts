import { products } from '@/lib/products';

export type AgentActionType = 'NAVIGATE' | 'ADD_TO_CART' | 'RESPONSE';

export interface AgentAction {
    type: AgentActionType;
    payload?: any;
    message: string;
}

export function processUserMessage(input: string): AgentAction {
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
        // Try to find product in string
        const product = products.find(p => lower.includes(p.name.toLowerCase()) || lower.includes(p.category.toLowerCase()));

        // If specific product found
        if (product) {
            // If user said "add headphones" and multiple match, might pick first.
            // Better: if on a product page, "add this" logic (requires context, but let's stick to global text match for now).
            return { type: 'ADD_TO_CART', payload: product, message: `Added ${product.name} to your cart.` };
        }
    }

    // Search/Find Product Logic
    if (lower.includes('show') || lower.includes('find') || lower.includes('buy') || lower.includes('looking for')) {
        // Check for specific product
        const product = products.find(p => lower.includes(p.name.toLowerCase()));
        if (product) {
            return { type: 'NAVIGATE', payload: `/products/${product.id}`, message: `Found ${product.name}.` };
        }

        // Check for category
        const category = products.find(p => lower.includes(p.category.toLowerCase()));
        if (category) {
            // Ideally filter, but for now just go to products or first item
            return { type: 'NAVIGATE', payload: '/products', message: `Here are some ${category.category} items.` };
        }
    }

    // Specific Product Direct Match (just typing generic name)
    const exactColorsOrTypes = products.find(p => lower.includes(p.name.toLowerCase()));
    if (exactColorsOrTypes) {
        return { type: 'NAVIGATE', payload: `/products/${exactColorsOrTypes.id}`, message: `Checking out ${exactColorsOrTypes.name}.` };
    }

    // Default fallback
    return { type: 'RESPONSE', message: "I'm not sure how to help with that. Try 'Show me headphones', 'Go to cart', or 'Checkout'." };
}
