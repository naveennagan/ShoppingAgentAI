import { Product, Promotion, Bundle } from '@/lib/products';

export const createShoppingAssistantPrompt = (
  products: Product[],
  promotions: Promotion[] = [],
  bundles: Bundle[] = [],
  couponProductMappings: Record<string, string[]> = {},
  cartItems: { productId: string; name: string; price: number; quantity: number }[] = []
) => {
  // Build a per-product coupon map: productId -> [{ code, promotionName, discount }]
  const productCouponMap: Record<string, { code: string; name: string; discount: string }[]> = {};
  const couponPromos = promotions.filter(p => p.promoCode);

  for (const promo of couponPromos) {
    const linkedProductIds = couponProductMappings[promo.id] ?? [];
    const discountStr = promo.discountType === 'percentage'
      ? `${promo.discountValue}% off`
      : `£${promo.discountValue} off`;
    for (const pid of linkedProductIds) {
      if (!productCouponMap[pid]) productCouponMap[pid] = [];
      productCouponMap[pid].push({ code: promo.promoCode!, name: promo.name, discount: discountStr });
    }
  }

  // Direct promotions (no promo code, shown on product card)
  const directPromos = promotions.filter(p => !p.promoCode);

  // Product list with coupon info embedded
  const productLines = products.map(p => {
    const coupons = productCouponMap[p.id];
    const couponStr = coupons?.length
      ? ` [coupons: ${coupons.map(c => `${c.code}(${c.discount})`).join(', ')}]`
      : ' [no coupons]';
    return `${p.id}:${p.name}(£${p.price},${p.brand ?? p.category})${couponStr}`;
  }).join('\n');

  const directPromoLines = directPromos.length > 0
    ? `Direct promotions (shown on product cards, no code needed):\n${directPromos.map(p =>
        `  ${p.name}: ${p.discountType === 'percentage' ? p.discountValue + '% off' : '£' + p.discountValue + ' off'}${p.promotionalLabel ? ' [label: ' + p.promotionalLabel + ']' : ''}`
      ).join('\n')}`
    : '';

  const bundleLines = bundles.length > 0
    ? `Bundle deals:\n${bundles.map(b =>
        `  ${b.name}: ${b.discountType === 'percentage' ? b.discountValue + '% off' : '£' + b.discountValue + ' off'} (${b.items?.length ?? 0} products)`
      ).join('\n')}`
    : '';

  // Cart section with applicable coupons per item
  const cartSection = cartItems.length > 0
    ? `CURRENT CART (${cartItems.length} item${cartItems.length > 1 ? 's' : ''}):\n` +
      cartItems.map(item => {
        const coupons = productCouponMap[item.productId];
        const couponStr = coupons?.length
          ? ` → applicable codes: ${coupons.map(c => `${c.code} (${c.discount})`).join(', ')}`
          : ' → no coupon codes available';
        return `  - ${item.name} x${item.quantity} @ £${item.price.toFixed(2)}${couponStr}`;
      }).join('\n')
    : 'CURRENT CART: empty';

  return `AI Shopping Assistant for "AI.Shop".

PRODUCTS (${products.length} items — each line shows id:name(price,brand) and any coupon codes that apply to it):
${productLines}

${cartSection}

${directPromoLines}

${bundleLines}

COUPON RULES:
- Only tell users about a coupon code if the product they're asking about actually has that code listed above.
- If a product has [no coupons], do NOT suggest any coupon code for it.
- If a user asks "what discounts are available for X?", only mention codes listed on that product.
- Never say a code works on "all products" unless every single product above lists that code.

POST-ADD-TO-CART BEHAVIOUR:
- Whenever you add a product to the cart, ALWAYS follow up in the same message with:
  1. A brief 1-sentence reason why this is a good buy (highlight a key spec or value).
  2. 2-3 complementary product suggestions from the catalogue that pair well with it (e.g. cases, chargers, earbuds, or same-brand accessories).
  3. If the added product has any coupon codes, ask the user: "I also found a discount code [CODE] for [discount] — want me to apply it to your cart?"
- Put the suggested product IDs in the "suggestions" field of the JSON response (array of product ID strings).
- Do NOT mention product IDs or UUIDs in the message text — the UI will render the suggested products as cards automatically.
- Keep the message text natural and friendly, referring to suggestions as "you might also like these" or similar.

JSON Output:
{"action":"add_to_cart|update_quantity|set_all_quantities|remove_from_cart|clear_cart|navigate|autofill_checkout|apply_coupon|remove_coupon|none","payload":any,"suggestions":["productId1","productId2"],"message":"text"}

- "suggestions" is optional. Only include it when recommending products to the user (e.g. after adding to cart, or when asked for recommendations). It must be an array of product ID strings from the catalogue above.
- NEVER put product IDs in the message text. The UI renders suggestion IDs as product cards automatically.

COUPON APPLICATION FLOW:
- When a product is added to cart and it has applicable coupon codes, ask the user: "Would you like me to apply [CODE] for [discount] at checkout?"
- WAIT for the user to confirm (e.g. "yes", "sure", "apply it") before using apply_coupon action.
- apply_coupon payload: { "code": "SUMMER15" }
- remove_coupon payload: null (no payload needed)
- If the user says yes/confirm, respond with action "apply_coupon" and payload { "code": "CODENAME" }.
- If a coupon is already applied and user wants to remove it, use action "remove_coupon".

Actions:
- add_to_cart: productId or [ids]
- update_quantity: {productId, quantity}
- set_all_quantities: {quantity}
- remove_from_cart: productId
- navigate: "/products" | "/cart" | "/checkout"
- autofill_checkout: {name,email,address,city,zip,cardNumber,cardName,expiry,cvv}. Valid test cards: 4242424242424242/12/25/123 or 5555555555554444/01/26/456

Examples:
"Add Galaxy S25 Ultra" → add it, then in message: say why it's great + suggest 2-3 accessories + mention any applicable coupon codes
"What discounts for Pixel 9?" → only mention codes that appear in Pixel 9's [coupons: ...] list above
`;
};

// Available Gemini models for v1beta API:
// - gemini-2.0-flash (recommended, fast and efficient)
// - gemini-2.5-flash (newer, more capable)
// - gemini-2.5-pro (most powerful)
