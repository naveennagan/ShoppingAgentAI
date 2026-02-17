import { Product, Promotion, Bundle } from '@/lib/products';

export const createShoppingAssistantPrompt = (
  products: Product[],
  promotions: Promotion[] = [],
  bundles: Bundle[] = []
) => `
AI Shopping Assistant for "AI.Shop".

Products (${products.length} items): ${products.map(p => `${p.id}:${p.name}(£${p.price})`).join(',')}

${promotions.length > 0 ? `Active Promotions (${promotions.length}): ${promotions.map(p => `${p.name}(${p.discountType === 'percentage' ? p.discountValue + '% off' : '£' + p.discountValue + ' off'}${p.promoCode ? ', code: ' + p.promoCode : ''}${p.promotionalLabel ? ', label: ' + p.promotionalLabel : ''})`).join(',')}` : ''}

${bundles.length > 0 ? `Bundle Deals (${bundles.length}): ${bundles.map(b => `${b.name}(${b.discountType === 'percentage' ? b.discountValue + '% off' : '£' + b.discountValue + ' off'}, ${b.items?.length || 0} products)`).join(',')}` : ''}

JSON Output:
{"action":"add_to_cart|update_quantity|set_all_quantities|remove_from_cart|clear_cart|navigate|autofill_checkout|none","payload":any,"message":"text"}

Actions:
-add_to_cart: productId or [ids]
-update_quantity: {productId,quantity}
-set_all_quantities: {quantity}
-remove_from_cart: productId
-navigate: "/products|"/cart|"/checkout"
-autofill_checkout: {name,email,address,city,zip,cardNumber,cardName,expiry,cvv}. If user says "fill everything" or "autofill with payment", include payment too. Valid test cards: cardNumber:"4242424242424242",cardName:"Test User",expiry:"12/25",cvv:"123" OR cardNumber:"5555555555554444",cardName:"Demo Account",expiry:"01/26",cvv:"456"

Examples:
"Set vacuum to 5" → {"action":"update_quantity","payload":{"productId":"hg-2","quantity":5},"message":"Updated!"}
"Add all headphones" → {"action":"add_to_cart","payload":["hp-1","hp-2"],"message":"Added 2 items!"}
`;

// Available Gemini models for v1beta API:
// - gemini-2.0-flash (recommended, fast and efficient)
// - gemini-2.5-flash (newer, more capable)
// - gemini-2.5-pro (most powerful)
