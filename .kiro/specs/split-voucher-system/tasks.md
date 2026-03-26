# Implementation Plan: Split Voucher System

## Overview

Replace the cart's single coupon input with two independent voucher inputs for device items (one-time) and broadband items (monthly). Implementation proceeds bottom-up: database migration and seed data first, then backend model and service changes, then frontend types and API client updates, then new UI components (SplitVoucherInput, SplitOrderSummary), CartContext refactoring, and finally wiring everything together on the cart page.

## Tasks

- [x] 1. Database schema migration and seed data
  - [x] 1.1 Create migration SQL for split voucher columns
    - Create `scripts/split-voucher-migration.sql` containing:
    - `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS valid_till INTEGER DEFAULT NULL;`
    - `ALTER TABLE promotions ADD COLUMN IF NOT EXISTS applicable_item_type TEXT DEFAULT 'both';`
    - Both columns must preserve existing promotion records without data loss
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 1.2 Create seed data SQL for broadband, device, and universal vouchers
    - Create `scripts/seed-split-vouchers.sql` containing:
    - Insert a broadband voucher: `applicable_item_type='broadband'`, `discount_type='percentage'`, `discount_value=10`, `valid_till=3`, `promo_code` set, `is_active=true`, valid date range
    - Insert a device voucher: `applicable_item_type='device'`, `discount_type='percentage'`, `discount_value=10`, `promo_code` set, `is_active=true`, valid date range
    - Insert a universal voucher: `applicable_item_type='both'`, `discount_type='percentage'`, `discount_value=5`, `promo_code` set, `is_active=true`, valid date range
    - Use `ON CONFLICT (promo_code) DO NOTHING` for idempotency
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Backend model and service changes
  - [x] 2.1 Extend Promotion model with new fields
    - Add `validTill` (`Integer`, nullable) with `@SerializedName("valid_till")` to `Promotion.java`
    - Add `applicableItemType` (`String`, nullable) with `@SerializedName("applicable_item_type")` to `Promotion.java`
    - _Requirements: 1.1, 1.4_

  - [x] 2.2 Extend CouponValidationRequest with itemType field
    - Add `itemType` (`String`, nullable) to `CouponValidationRequest.java`
    - _Requirements: 2.1, 2.2_

  - [x] 2.3 Extend CouponValidationResult with validTill and applicableItemType fields
    - Add `validTill` (`Integer`, nullable) to `CouponValidationResult.java`
    - Add `applicableItemType` (`String`) to `CouponValidationResult.java`
    - Update the constructor accordingly
    - _Requirements: 1.1, 1.4_

  - [x] 2.4 Update PromotionService.validateCouponCode for item type filtering
    - When `itemType` is provided in the request, check that the promotion's `applicable_item_type` matches `itemType` or is `"both"`; reject with descriptive error if mismatched
    - Validate `applicable_item_type` is one of `"device"`, `"broadband"`, `"both"` (or null treated as `"both"`); reject if invalid
    - When `itemType` is null/absent, behave identically to the original implementation (backward compatible)
    - When `valid_till` is null, treat as standard voucher with no time limit
    - When `valid_till` is non-null, treat as broadband voucher with time-limited discount
    - Return `validTill` and `applicableItemType` in the result
    - Update the `validateCouponCode` method signature to accept `itemType` from the request
    - Update the controller endpoint to pass `itemType` from `CouponValidationRequest` to the service
    - _Requirements: 1.2, 1.3, 2.1, 2.2, 2.5, 7.4, 9.1, 9.2_

  - [x] 2.5 Write property tests for Promotion model round-trip (jqwik)
    - **Property 1: Promotion field round-trip**
    - Generate random Promotion objects with valid `validTill` (null or positive integer) and `applicableItemType` (`device`, `broadband`, `both`, or null), serialize to JSON and deserialize back, verify equality
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

  - [x] 2.6 Write property tests for item type filtering logic (jqwik)
    - **Property 2: Item type filtering**
    - Generate random promotions with various `applicable_item_type` values and random `itemType` requests, verify validation succeeds iff `applicable_item_type` matches `itemType` or is `"both"`
    - **Validates: Requirements 2.1, 2.2**

  - [ ]* 2.7 Write property test for invalid applicable_item_type rejection (jqwik)
    - **Property 10: Invalid applicable_item_type rejection**
    - Generate random strings not in `{"device", "broadband", "both"}`, verify the service rejects the promotion as invalid
    - **Validates: Requirements 7.4**

  - [ ]* 2.8 Write property test for backward compatibility without itemType (jqwik)
    - **Property 11: Backward compatibility without itemType**
    - Generate validation requests without `itemType`, verify the endpoint matches promotions regardless of `applicable_item_type`
    - **Validates: Requirements 9.1, 9.2**

  - [ ]* 2.9 Write property test for invalid voucher code error messages (jqwik)
    - **Property 13: Invalid voucher code error messages**
    - Generate various invalid scenarios (non-existent, expired, inactive, wrong item type), verify descriptive error messages are returned
    - **Validates: Requirements 2.5**

- [x] 3. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Frontend types and API client updates
  - [x] 4.1 Extend CouponValidationResult type in products.ts
    - Add `validTill: number | null` to the `CouponValidationResult` interface
    - Add `applicableItemType: string` to the `CouponValidationResult` interface
    - _Requirements: 1.1, 1.4_

  - [x] 4.2 Update validateCouponCode in api-client.ts
    - Add optional `itemType?: string` parameter to `validateCouponCode`
    - Include `itemType` in the request body when provided
    - _Requirements: 2.1, 2.2_

- [ ] 5. CartContext refactoring for split vouchers
  - [x] 5.1 Replace single appliedCoupon state with split voucher state
    - Replace `appliedCoupon` with `appliedDeviceVoucher: CouponValidationResult | null` and `appliedBroadbandVoucher: CouponValidationResult | null`
    - Implement `applyDeviceVoucher(code: string)` — calls `validateCouponCode` with `itemType: "device"`
    - Implement `applyBroadbandVoucher(code: string)` — calls `validateCouponCode` with `itemType: "broadband"`
    - Implement `removeDeviceVoucher()` and `removeBroadbandVoucher()` — each clears only its own voucher state
    - Add computed values: `payTodayTotal` (sum of discounted device item prices), `payMonthlyTotal` (sum of discounted broadband item prices), `deviceDiscount`, `broadbandDiscount`
    - Use `calculateDiscountedPrice` for discount computation (reuse existing function)
    - Update `CartContextType` interface with the new methods and state
    - Maintain backward compatibility: keep `couponDiscount` and `finalTotal` working for any existing consumers
    - _Requirements: 2.3, 2.4, 3.7, 3.8, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 9.3, 9.4_

  - [x] 5.2 Write property tests for voucher independence (fast-check)
    - **Property 3: Voucher independence**
    - Generate random cart states with both vouchers applied, apply/remove one, verify the other is unchanged
    - **Validates: Requirements 2.3, 2.4, 3.7, 3.8**

  - [ ]* 5.3 Write property tests for discount calculation correctness (fast-check)
    - **Property 4: Discount calculation correctness**
    - Generate random non-negative prices and valid discount values, verify `calculateDiscountedPrice` matches `max(0, price * (1 - value/100))` for percentage and `max(0, price - value)` for fixed
    - **Validates: Requirements 4.1, 4.2, 5.1, 5.2**

  - [ ]* 5.4 Write property test for Pay Today total (fast-check)
    - **Property 5: Pay Today total is sum of discounted device prices**
    - Generate random device item lists with optional device voucher, verify total equals sum of discounted prices
    - **Validates: Requirements 4.4**

  - [ ]* 5.5 Write property test for voucher scope enforcement (fast-check)
    - **Property 12: Voucher scope enforcement**
    - Generate carts with both item types and a `"both"` voucher, verify discount applies only to the targeted item type based on which input it was applied through
    - **Validates: Requirements 9.3, 9.4**

- [ ] 6. SplitVoucherInput component
  - [x] 6.1 Create SplitVoucherInput component
    - Create `src/components/cart/SplitVoucherInput.tsx`
    - Show device voucher input field only when cart contains at least one device item (item_type !== 'broadband_service')
    - Show broadband voucher input field only when cart contains at least one broadband item (item_type === 'broadband_service')
    - Each field has its own text input, apply button, error display, and loading state
    - When a device voucher is applied, show the promotion name with a remove button
    - When a broadband voucher is applied, show the promotion name, `valid_till` duration, and a remove button
    - Wire apply/remove actions to `CartContext` methods (`applyDeviceVoucher`, `applyBroadbandVoucher`, `removeDeviceVoucher`, `removeBroadbandVoucher`)
    - Display inline error messages below the relevant input field on validation failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [ ]* 6.2 Write property test for voucher input visibility (fast-check)
    - **Property 6: Voucher input visibility matches cart contents**
    - Generate random cart compositions, verify device input visible iff cart has device items, broadband input visible iff cart has broadband items
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ] 7. SplitOrderSummary component
  - [x] 7.1 Create SplitOrderSummary component
    - Create `src/components/cart/SplitOrderSummary.tsx`
    - Show "Pay Today" section only when cart contains device items: original subtotal, discount amount (if device voucher applied), discounted total
    - Show "Pay Monthly" section only when cart contains broadband items: original monthly subtotal, discounted monthly price (if broadband voucher applied), promotional duration note (e.g., "£63.00/mo for first 3 months, then £70.00/mo") when `valid_till` is set
    - When no broadband voucher is applied, show standard monthly price without duration note
    - Read all values from `CartContext` (`payTodayTotal`, `payMonthlyTotal`, `deviceDiscount`, `broadbandDiscount`, voucher states)
    - _Requirements: 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [ ]* 7.2 Write property test for order summary section visibility (fast-check)
    - **Property 7: Order summary section visibility matches cart contents**
    - Generate random cart compositions, verify "Pay Today" visible iff device items present, "Pay Monthly" visible iff broadband items present
    - **Validates: Requirements 6.1, 6.2, 6.5, 6.6, 6.7**

  - [ ]* 7.3 Write property test for broadband duration note formatting (fast-check)
    - **Property 9: Broadband duration note formatting**
    - Generate random prices, discounts, and `valid_till` values, verify formatted string contains discounted price, duration, and original price
    - **Validates: Requirements 5.4**

- [ ] 8. Wire components into cart page
  - [x] 8.1 Update cart page to use SplitVoucherInput and SplitOrderSummary
    - Replace the existing inline coupon input section in `src/app/cart/page.tsx` with `<SplitVoucherInput />`
    - Replace the existing order summary section with `<SplitOrderSummary />`
    - Ensure the page still renders correctly for device-only, broadband-only, and mixed carts
    - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.7_

- [x] 9. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The existing `calculateDiscountedPrice` function is reused as-is for both device and broadband discount computation
- Backend property tests use jqwik; frontend property tests use fast-check
