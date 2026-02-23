import { Product, Promotion, Bundle } from '@/lib/products';

/**
 * Builds a compact system prompt.
 * Products are referenced by short numeric index (p0, p1…) instead of full UUIDs
 * to cut token usage significantly. The index→UUID map is returned alongside the
 * prompt so the route can resolve IDs back before executing actions.
 */
export function createShoppingAssistantPrompt(
  products: Product[],
  promotions: Promotion[] = [],
  bundles: Bundle[] = [],
  couponProductMappings: Record<string, string[]> = {},
  cartItems: { productId: string; name: string; price: number; quantity: number }[] = []
): { prompt: string; idMap: Record<string, string> } {

  // Short index → real UUID (e.g. "p0" → "uuid-...")
  const idMap: Record<string, string> = {};
  // Real UUID → short index
  const shortId: Record<string, string> = {};
  products.forEach((p, i) => {
    const sid = `p${i}`;
    idMap[sid] = p.id;
    shortId[p.id] = sid;
  });

  // Build coupon map: productId → "CODE(discount)" strings
  const productCoupons: Record<string, string[]> = {};
  for (const promo of promotions.filter(p => p.promoCode)) {
    const disc = promo.discountType === 'percentage'
      ? `${promo.discountValue}%` : `£${promo.discountValue}`;
    for (const pid of couponProductMappings[promo.id] ?? []) {
      (productCoupons[pid] ??= []).push(`${promo.promoCode}(${disc})`);
    }
  }

  // Compact product lines — only include coupon info when it exists
  const productLines = products.map((p, i) => {
    const sid = `p${i}`;
    const coupons = productCoupons[p.id];
    const specsStr = p.specs && Object.keys(p.specs).length
      ? Object.entries(p.specs).map(([k, v]) => `${k}:${v}`).join(';')
      : '';
    const extras = [
      p.brand ? `brand:${p.brand}` : '',
      `cat:${p.category}`,
      p.rating != null ? `rating:${p.rating}` : '',
      p.stock != null ? `stock:${p.stock}` : '',
      specsStr,
    ].filter(Boolean).join('|');
    const base = `${sid}:${p.name}|£${p.price}|${extras}`;
    return coupons?.length ? `${base}|coupons:${coupons.join(',')}` : base;
  }).join('\n');

  // Direct promos (label-based, no code)
  const directPromos = promotions.filter(p => !p.promoCode);
  const directPromoLines = directPromos.map(p => {
    const disc = p.discountType === 'percentage' ? `${p.discountValue}%` : `£${p.discountValue}`;
    return `${p.promotionalLabel ?? p.name}:${disc}`;
  }).join(', ');

  // Bundles
  const bundleLines = bundles.map(b => {
    const disc = b.discountType === 'percentage' ? `${b.discountValue}%` : `£${b.discountValue}`;
    return `${b.name}:${disc}`;
  }).join(', ');

  // Cart — use short IDs
  const cartLines = cartItems.length === 0 ? 'empty' : cartItems.map(item => {
    const sid = shortId[item.productId] ?? item.productId;
    const coupons = productCoupons[item.productId];
    const couponStr = coupons?.length ? `|codes:${coupons.join(',')}` : '';
    return `${sid}:${item.name}×${item.quantity}@£${item.price}${couponStr}`;
  }).join('; ');

  const prompt = `Shopping assistant for AI.Shop. Respond ONLY in JSON.

PRODUCTS (id:name|price|brand[|coupons]):
${productLines}
${directPromoLines ? `\nDIRECT_PROMOS: ${directPromoLines}` : ''}
${bundleLines ? `BUNDLES: ${bundleLines}` : ''}
CART: ${cartLines}

RULES:
- Use short IDs (p0,p1…) in payload/suggestions, never UUIDs or names
- Only mention a coupon if that product's line includes it
- suggestions=[]: ONLY show product cards when user asks about SPECIFIC products by name/brand/model, comparisons, or right after add_to_cart. For vague/generic asks like "suggest one", "what should I buy", "recommend something", respond with text only (name the product in your message) and set suggestions to empty array []. Never show a product list for open-ended questions.
- After add_to_cart: 1-sentence reason + 2-3 suggestions + ask to apply coupon if available
- Coupon confirm flow: ask first, apply_coupon only after user says yes

OUTPUT: {"action":"add_to_cart|update_quantity|set_all_quantities|remove_from_cart|clear_cart|navigate|autofill_checkout|apply_coupon|remove_coupon|none","payload":any,"suggestions":["p0","p1"],"message":"string","comparison":{"products":["Name A","Name B"],"rows":[{"field":"Price","values":["£x","£y"]},{"field":"Brand","values":["A","B"]}]}}
Actions: add_to_cart(id|[ids]), update_quantity({productId,quantity}), remove_from_cart(id), navigate("/products"|"/cart"|"/checkout"), apply_coupon({code}), remove_coupon
- When user asks to compare 2-3 products, populate the comparison field with a table. Include rows for: Price, Brand, Category, Rating, and all available spec fields (e.g. Storage, RAM, Display, Battery, Camera, OS, etc). Keep message brief.
Test cards: 4242424242424242/TestUser/12/25/123`;

  return { prompt, idMap };
}
