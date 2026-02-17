package com.shoppingagent.util;

/**
 * Utility for calculating discounted prices based on promotion/bundle discount types.
 */
public final class DiscountCalculator {

    private DiscountCalculator() {
        // utility class
    }

    /**
     * Calculates the discounted price.
     *
     * @param price         the original price
     * @param discountType  "percentage" or "fixed_amount"
     * @param discountValue the discount value (percentage points or fixed amount)
     * @return the discounted price, floored at 0
     * @throws IllegalArgumentException if discountType is not recognized
     */
    public static double calculateDiscountedPrice(double price, String discountType, double discountValue) {
        double result;
        switch (discountType) {
            case "percentage":
                result = price * (1 - discountValue / 100.0);
                break;
            case "fixed_amount":
                result = price - discountValue;
                break;
            default:
                throw new IllegalArgumentException("Unknown discount type: " + discountType);
        }
        return Math.max(0, result);
    }
}
