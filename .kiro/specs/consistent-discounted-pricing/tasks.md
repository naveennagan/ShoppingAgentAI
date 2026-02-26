# Implementation Plan: Consistent Discounted Pricing

## Overview

Extend discounted price display from ProductCard to all pricing surfaces: Cart page, Orders page, and AI Suggestion cards. Update CartContext to compute discount-aware totals, and update the backend to store discounted pricing data in order records. The frontend is TypeScript/React (Next.js) and the backend is Java (Spring Boot).

## Tasks

- [x] 1. Update CartContext to be discount-aware
  - [x] 1.1 Fetch promotions for each cart item and compute discounted prices in `src/context/CartContext.tsx`
    - Add promotion state per cart item by fetching promotions via `apiClient.getPromotionsForProduct`
    - Filter for Active_Automatic_Promotions (active === true && promoCode === null)
    - Use `calculateDiscountedPrice` from `src/lib/discountCalculator.ts` to compute item-level discounted prices
    - Update the `total` computation to use discounted prices for items with active automatic promotions and original prices for items without
    - Expose promotion data (discounted price, promotional label, original price) per cart item through the context
    - _Requirements: 4.1, 4.3_

  - [x] 1.2 Update coupon discount to apply after automatic promotion discounts in `src/context/CartContext.tsx`
    - Modify the coupon discount calculation so it applies on top of the already-discounted price (not the original price)
    - Ensure `finalTotal` reflects: automatic promotions first, then coupon discount
    - _Requirements: 4.2_

  - [ ]* 1.3 Write property tests for discount-aware cart totals
    - **Property 1: Cart total with automatic promotions equals sum of discounted prices times quantities**
    - **Validates: Requirements 4.1**
    - Create test in `src/lib/__tests__/discountedPricingProperties.test.ts` using fast-check
    - Generate arbitrary cart items with and without active automatic promotions
    - Assert total equals sum of (discountedPrice * quantity) for promoted items + (originalPrice * quantity) for non-promoted items

  - [ ]* 1.4 Write property test for coupon-after-promotion ordering
    - **Property 2: Coupon discount is applied after automatic promotion discount**
    - **Validates: Requirements 4.2**
    - Assert that when both an automatic promotion and a coupon apply to the same item, the coupon discount is computed on the already-discounted price, not the original price

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Display discounted prices on the Cart page
  - [x] 3.1 Update cart item rendering in `src/app/cart/page.tsx` to show discounted prices
    - For items with an Active_Automatic_Promotion: display the discounted price in highlight color (`#ef4444`), and the original price with strikethrough in muted color (`#9ca3af`), matching the ProductCard pattern
    - For items with an Active_Automatic_Promotion with a non-null promotional label: display the label badge next to the item
    - For items without an Active_Automatic_Promotion: display only the original price without strikethrough or label
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 3.2 Update cart subtotal computation in `src/app/cart/page.tsx` to use discounted prices
    - Compute subtotal using discounted prices for promoted items and original prices for non-promoted items
    - Ensure the Order Summary section reflects the discount-aware subtotal
    - _Requirements: 1.5_

  - [ ]* 3.3 Write unit tests for cart page discount display logic
    - Test that promoted items show both discounted and original prices
    - Test that non-promoted items show only original price
    - Test that subtotal reflects discounted prices
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 4. Display discounted prices on the AI Suggestion Card
  - [x] 4.1 Update `src/components/ui/SuggestionCard.tsx` to fetch and display discounted prices
    - Fetch promotions for the suggested product using `apiClient.getPromotionsForProduct`
    - Filter for Active_Automatic_Promotions
    - When an active automatic promotion exists: display discounted price in highlight color (`#ef4444`) and original price with strikethrough in muted color (`#9ca3af`)
    - When an active automatic promotion has a non-null promotional label: display the label
    - When no active automatic promotion exists: display only the original price
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 4.2 Write unit tests for SuggestionCard discount display
    - Test promoted product shows discounted price and strikethrough original
    - Test non-promoted product shows only original price
    - _Requirements: 3.1, 3.4_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update backend to store discount data in order records
  - [x] 6.1 Add `original_price` and `promotional_label` columns to the `order_items` table schema
    - Update `scripts/schema.sql` to add `original_price NUMERIC(10, 2)` and `promotional_label TEXT` columns to the `order_items` table
    - _Requirements: 6.4, 6.2_

  - [x] 6.2 Update `Order.OrderItem` model in `shopping-agent-backend/src/main/java/com/shoppingagent/model/Order.java`
    - Add `originalPrice` (double) and `promotionalLabel` (String) fields to the `OrderItem` inner class
    - _Requirements: 6.4, 6.2_

  - [x] 6.3 Update `OrderService.createOrder` in `shopping-agent-backend/src/main/java/com/shoppingagent/service/OrderService.java` to apply automatic promotions at order time
    - For each cart item, fetch active automatic promotions via `PromotionService`
    - If an active automatic promotion exists: compute the discounted price, store it as `price`, store the original price as `original_price`, and store the `promotional_label`
    - If no active automatic promotion exists: store the original price as `price`, store the same value as `original_price`, and set `promotional_label` to null
    - Update `totalAmount` to use discounted prices
    - Persist `original_price` and `promotional_label` in the `order_items` insert
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.4 Update `OrderService.toOrder` mapping and `OrderItemRow` to include the new fields
    - Add `original_price` and `promotional_label` to `OrderItemRow`
    - Map them through to `Order.OrderItem` in the `toOrder` method
    - _Requirements: 6.4, 6.2_

  - [ ]* 6.5 Write unit tests for order creation with discounted pricing
    - Test that order items with active automatic promotions store the discounted price and original price
    - Test that order items without promotions store the original price in both fields
    - Test that promotional labels are stored correctly
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Display discounted prices on the Orders page
  - [x] 7.1 Update the `OrderItem` TypeScript interface and Orders page rendering in `src/app/orders/page.tsx`
    - Add `originalPrice` and `promotionalLabel` fields to the `OrderItem` interface
    - For items where `price !== originalPrice` (purchased at discounted price): display the discounted price in highlight color and original price with strikethrough in muted color
    - For items with a non-null `promotionalLabel`: display the label badge
    - For items purchased at original price: display only the price without strikethrough or label
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ]* 7.2 Write unit tests for orders page discount display
    - Test that discounted order items show both prices with correct styling
    - Test that non-discounted order items show only the original price
    - _Requirements: 2.1, 2.4_

- [x] 8. Ensure consistent visual treatment across all surfaces
  - [x] 8.1 Extract a shared `PriceDisplay` component to `src/components/ui/PriceDisplay.tsx`
    - Create a reusable component that accepts `originalPrice`, `discountedPrice` (optional), and `promotionalLabel` (optional)
    - Use the same visual pattern as ProductCard: discounted price in `#ef4444`, original price with `line-through` in `#9ca3af`
    - Display promotional label badge when provided
    - _Requirements: 5.1, 5.2_

  - [x] 8.2 Integrate `PriceDisplay` into Cart page, Orders page, and SuggestionCard
    - Replace inline price rendering in `src/app/cart/page.tsx`, `src/app/orders/page.tsx`, and `src/components/ui/SuggestionCard.tsx` with the shared `PriceDisplay` component
    - Verify visual consistency matches `src/components/ProductCard.tsx` discount styling
    - _Requirements: 5.1, 5.2_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The frontend uses TypeScript/React (Next.js) and the backend uses Java (Spring Boot)
- Property tests use fast-check (already installed) and vitest (already configured)
- The existing ProductCard discount pattern (highlight color + strikethrough) is the reference for consistent styling
