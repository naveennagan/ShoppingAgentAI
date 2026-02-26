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
  cartItems: { productId: string; name: string; price: number; quantity: number }[] = [],
  appliedCouponCode: string | null = null
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

  // Build active auto-promo map: productId → "label(discount)" for non-coupon promos
  const productAutoPromos: Record<string, string> = {};
  for (const promo of promotions.filter(p => p.active && !p.promoCode)) {
    // Map promo to products via couponProductMappings (also used for non-coupon promos)
    for (const pid of couponProductMappings[promo.id] ?? []) {
      const disc = promo.discountType === 'percentage' ? `${promo.discountValue}%` : `£${promo.discountValue}`;
      productAutoPromos[pid] = `${promo.promotionalLabel ?? promo.name}(${disc})`;
    }
  }

  // Compact product lines — include coupon and auto-promo info when they exist
  const productLines = products.map((p, i) => {
    const sid = `p${i}`;
    const coupons = productCoupons[p.id];
    const autoPromo = productAutoPromos[p.id];
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
    let base = `${sid}:${p.name}|£${p.price}|${extras}`;
    if (autoPromo) base += `|deal:${autoPromo}`;
    if (coupons?.length) base += `|coupons:${coupons.join(',')}`;
    return base;
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
ACTIVE_COUPON: ${appliedCouponCode ?? 'none'}

RULES:
- Use short IDs (p0,p1…) in payload/suggestions, never UUIDs or names
- Only mention a coupon if that product's line includes it
- suggestions=[]: ONLY show product cards when user asks about SPECIFIC products by name/brand/model, comparisons, deals/discounts, or right after add_to_cart. For vague/generic asks like "suggest one", "what should I buy", "recommend something", respond with text only (name the product in your message) and set suggestions to empty array []. Never show a product list for open-ended questions.
- When user asks about deals, discounts, or discounted products: include product IDs with a "deal:" tag in suggestions so they see the cards with prices. Products with "deal:" in their line have an active automatic discount already applied.
- After add_to_cart: 1-sentence reason + 2-3 suggestions + ask to apply coupon if available
- When user asks about their orders or order history, use navigate("/orders") to take them to the orders page.
- Coupon flow: if user explicitly says "apply <CODE>", use apply_coupon immediately. Only ask for confirmation when suggesting a coupon proactively.
- ONLY ONE coupon can be active at a time. If a coupon is already applied and user wants a different one, you MUST remove_coupon first then apply_coupon. Never tell the user multiple coupons are applied — that is impossible.
- ACTIVE_COUPON shows the currently applied coupon. If it says "none", no coupon is applied — do NOT claim one is already applied. Automatic deals (deal: tag on products) are NOT coupons — they apply automatically and don't count as an applied coupon.

OUTPUT: {"actions":[{"action":"...","payload":any}],"suggestions":["p0","p1"],"message":"string","comparison":{"products":["Name A","Name B"],"rows":[{"field":"Price","values":["£x","£y"]},{"field":"Brand","values":["A","B"]}]}}
actions is an ARRAY — use multiple entries when needed (e.g. remove_coupon then apply_coupon). Use [{"action":"none"}] when no action needed.
Action types: add_to_cart(id|[ids]), update_quantity({productId,quantity}), set_all_quantities({quantity}), remove_from_cart(id), clear_cart, navigate("/products"|"/cart"|"/checkout"), autofill_checkout, apply_coupon({code}), remove_coupon
- When switching coupons, ALWAYS emit both: [{"action":"remove_coupon"},{"action":"apply_coupon","payload":{"code":"..."}}]
- When user asks to compare 2-3 products, populate the comparison field with a table. Include rows for: Price, Brand, Category, Rating, and all available spec fields (e.g. Storage, RAM, Display, Battery, Camera, OS, etc). Keep message brief.
Test cards: 4242424242424242/TestUser/12/25/123`;

  return { prompt, idMap };
}
