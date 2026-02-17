/**
 * Calculates the discounted price.
 *
 * @param price - the original price
 * @param discountType - "percentage" or "fixed_amount"
 * @param discountValue - the discount value (percentage points or fixed amount)
 * @returns the discounted price, floored at 0
 */
export function calculateDiscountedPrice(
  price: number,
  discountType: "percentage" | "fixed_amount",
  discountValue: number
): number {
  let result: number;
  if (discountType === "percentage") {
    result = price * (1 - discountValue / 100);
  } else {
    result = price - discountValue;
  }
  return Math.max(0, result);
}
