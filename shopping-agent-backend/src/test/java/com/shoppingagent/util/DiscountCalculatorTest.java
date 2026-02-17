package com.shoppingagent.util;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DiscountCalculatorTest {

    @Test
    void percentageDiscount() {
        // 15% off £100 = £85
        assertEquals(85.0, DiscountCalculator.calculateDiscountedPrice(100.0, "percentage", 15.0), 0.001);
    }

    @Test
    void fixedAmountDiscount() {
        // £20 off £100 = £80
        assertEquals(80.0, DiscountCalculator.calculateDiscountedPrice(100.0, "fixed_amount", 20.0), 0.001);
    }

    @Test
    void resultNeverNegative_percentage() {
        // 150% off should floor at 0
        assertEquals(0.0, DiscountCalculator.calculateDiscountedPrice(50.0, "percentage", 150.0), 0.001);
    }

    @Test
    void resultNeverNegative_fixedAmount() {
        // £200 off a £50 item should floor at 0
        assertEquals(0.0, DiscountCalculator.calculateDiscountedPrice(50.0, "fixed_amount", 200.0), 0.001);
    }

    @Test
    void zeroDiscount() {
        assertEquals(100.0, DiscountCalculator.calculateDiscountedPrice(100.0, "percentage", 0.0), 0.001);
        assertEquals(100.0, DiscountCalculator.calculateDiscountedPrice(100.0, "fixed_amount", 0.0), 0.001);
    }

    @Test
    void unknownDiscountTypeThrows() {
        assertThrows(IllegalArgumentException.class,
                () -> DiscountCalculator.calculateDiscountedPrice(100.0, "bogus", 10.0));
    }
}
