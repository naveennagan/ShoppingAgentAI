# Implementation Plan: Selective Promotions & Coupon Codes

## Overview

Implement selective promotion visibility and coupon code functionality across the seed script, Spring Boot backend, and Next.js frontend. Tasks are ordered so each builds on the previous, with backend work first, then frontend, then wiring.

## Tasks

- [x] 1. Update seed script for selective promotions
  - [x] 1.1 Modify promotion definitions in `scripts/seed-products.mjs`
    - Change "Summer Sale 15% Off" to be a Coupon_Promotion: set `promo_code: "SUMMER15"`, set `promotional_label: null`
    - Change "New Customer £20 Off" to be a Coupon_Promotion: keep `promo_code: "WELCOME20"`, set `promotional_label: null`
    - Change "Flash Deal 10% Off Samsung" to be a Direct_Promotion: keep `promo_code: null`, keep `promotional_label: "Flash Deal"`
    - Change "Apple Trade-In Bonus £50" to be a Direct_Promotion: set `promo_code: null`, keep `promotional_label: "Trade-In Bonus"`
    - Change "Pixel Launch 5% Off" to be a Coupon_Promotion: keep `promo_code: "PIXEL5"`, set `promotional_label: null`
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 1.2 Update product-promotion linking logic in `scripts/seed-products.mjs`
    - Direct promotions (Samsung Flash Deal, Apple Trade-In) link to ~10 products each (~20 total)
    - Coupon promotions (SUMMER15, WELCOME20, PIXEL5) link to their respective product sets but have no promotional_label
    - _Requirements: 1.1, 1.2_

- [x] 2. Add backend coupon validation endpoint
  - [x] 2.1 Create request/response DTOs in `shopping-agent-backend/src/main/java/com/shoppingagent/model/`
    - Create `CouponValidationRequest.java` with fields: `code` (String), `productIds` (List<String>)
    - Create `CouponValidationResult.java` with fields: `promotionId`, `promotionName`, `discountType`, `discountValue`, `applicableProductIds`
    - _Requirements: 3.1_
  - [x] 2.2 Add `validateCouponCode` method to `PromotionService.java`
    - Query `promotions` table where `promo_code = code`
    - If not found, throw exception (maps to 404)
    - If found but `end_date` is past, throw exception (maps to 400 expired)
    - If found but `is_active` is false, throw exception (maps to 400 inactive)
    - Query `product_promotions` to find intersection of promotion's linked products with submitted `productIds`
    - Return `CouponValidationResult` with promotion details and applicable product IDs
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [x] 2.3 Add `POST /api/promotions/validate-code` endpoint to `PromotionController.java`
    - Accept `CouponValidationRequest` body
    - Call `promotionService.validateCouponCode`
    - Map exceptions to appropriate HTTP status codes (404, 400)
    - Return `CouponValidationResult` on success
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  - [ ]* 2.4 Write property tests for coupon validation (jqwik)
    - **Property 3: Valid coupon returns correct applicable products**
    - **Property 4: Invalid/expired/inactive coupons return appropriate errors**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 3. Checkpoint - Backend validation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Update frontend promotion filtering and API client
  - [x] 4.1 Filter ProductCard to show only direct promotions in `src/components/ProductCard.tsx`
    - Change the `activePromo` line to filter out promotions with non-null `promoCode`: `promotions.find(p => p.active && !p.promoCode)`
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 4.2 Add `validateCouponCode` method to `src/lib/api-client.ts`
    - Add method that POSTs to `/api/promotions/validate-code` with `{ code, productIds }`
    - Parse error responses and throw Error with the error message
    - Add `CouponValidationResult` type to `src/lib/products.ts`
    - _Requirements: 6.1, 6.2, 6.3_
  - [x] 4.3 Write property tests for promotion filtering and API error propagation (fast-check)
    - **Property 1: Promotion filtering excludes coupon-only promotions**
    - **Property 7: API client propagates error messages**
    - **Validates: Requirements 2.1, 6.3**

- [x] 5. Implement cart page coupon input and discount breakdown
  - [x] 5.1 Add coupon input UI to cart page `src/app/cart/page.tsx`
    - Add state variables: `couponCode`, `appliedCoupon`, `couponError`, `isValidating`
    - Add coupon input section in the Order Summary card: text field + Apply button
    - Validate empty/whitespace input client-side before API call
    - On successful validation, store result in `appliedCoupon` state, show success indicator with promotion name, show Remove button
    - On error, display error message from API response
    - On Remove, clear `appliedCoupon` state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 5.2 Add discount breakdown to cart summary in `src/app/cart/page.tsx`
    - Calculate subtotal as sum of (price × quantity) for all items
    - When coupon is applied, calculate discount using `calculateDiscountedPrice` for each applicable product
    - Display subtotal, discount line (promotion name + amount), and final total
    - When no coupon applied, show subtotal = total with no discount line
    - When coupon applied but no eligible items, show £0.00 discount with "No items in your cart are eligible for this promotion" message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 5.3 Write property tests for cart discount calculation (fast-check)
    - **Property 6: Cart discount calculation consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [ ]* 5.4 Write property test for whitespace coupon rejection
    - **Property 5: Whitespace-only coupon codes are rejected client-side**
    - **Validates: Requirements 4.3**
  - [ ]* 5.5 Write property test for direct promotion display
    - **Property 2: Direct promotion displays correct discounted price**
    - **Validates: Requirements 2.3**

- [x] 6. Final checkpoint - Full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- No database schema changes are needed — the existing `promotions` table already supports the distinction via `promo_code` and `promotional_label` columns
- The backend already uses jqwik for property-based testing; the frontend should use fast-check
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
