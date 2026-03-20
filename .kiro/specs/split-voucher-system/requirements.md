# Requirements Document

## Introduction

The shopping cart currently supports a single coupon code that applies to the entire cart. This feature introduces a split voucher system where device items (one-time payments) and broadband items (monthly recurring) each have their own independent voucher input. Device vouchers apply a standard percentage or fixed discount to the one-time price. Broadband vouchers include a `valid_till` duration attribute so the discount only applies for a limited number of months before reverting to the full price. The order summary must display split totals: a "Pay Today" amount for devices and a "Pay Monthly" amount for broadband, each reflecting their respective voucher discounts.

## Glossary

- **Cart**: The shopping cart component that holds device items and broadband service items
- **Device_Item**: A cart item with `item_type` other than `broadband_service`, representing a one-time purchase (e.g., a phone)
- **Broadband_Item**: A cart item with `item_type` equal to `broadband_service`, representing a monthly recurring subscription
- **Voucher**: A promotional code stored in the promotions table that grants a discount when applied
- **Device_Voucher**: A Voucher applied to Device_Items, providing a percentage or fixed discount on the one-time price
- **Broadband_Voucher**: A Voucher applied to Broadband_Items, providing a percentage or fixed discount on the monthly price for a limited duration defined by `valid_till`
- **Valid_Till**: An integer attribute on a Broadband_Voucher specifying the number of months the discount applies before the price reverts to the standard rate
- **Split_Voucher_Input**: The UI component pair that provides separate voucher code entry fields for Device_Items and Broadband_Items
- **Order_Summary**: The section of the cart page displaying the calculated totals after voucher discounts
- **Pay_Today_Total**: The one-time amount the customer pays at checkout, calculated from Device_Items after Device_Voucher discounts
- **Pay_Monthly_Total**: The recurring monthly amount the customer pays, calculated from Broadband_Items after Broadband_Voucher discounts
- **Promotion_Service**: The backend service responsible for validating voucher codes and returning discount details
- **Discount_Calculator**: The utility that computes discounted prices given a discount type and value

## Requirements

### Requirement 1: Promotion Model Extension for Broadband Vouchers

**User Story:** As a product manager, I want broadband vouchers to carry a duration limit, so that time-limited promotional pricing can be offered on broadband subscriptions.

#### Acceptance Criteria

1. THE Promotion model SHALL include a `valid_till` attribute of integer type representing the number of discounted months
2. WHEN a Promotion record has a null `valid_till` value, THE Promotion_Service SHALL treat the Promotion as a standard Device_Voucher with no time limit
3. WHEN a Promotion record has a non-null `valid_till` value, THE Promotion_Service SHALL treat the Promotion as a Broadband_Voucher with a time-limited discount
4. THE Promotion model SHALL include an `applicable_item_type` attribute indicating whether the voucher applies to `device`, `broadband`, or `both`

### Requirement 2: Independent Voucher Validation by Item Type

**User Story:** As a customer, I want to apply separate voucher codes for my device purchase and my broadband subscription, so that I can use different promotions for each.

#### Acceptance Criteria

1. WHEN a voucher code is submitted for Device_Items, THE Promotion_Service SHALL validate the code only against promotions where `applicable_item_type` is `device` or `both`
2. WHEN a voucher code is submitted for Broadband_Items, THE Promotion_Service SHALL validate the code only against promotions where `applicable_item_type` is `broadband` or `both`
3. WHEN a valid Device_Voucher is applied, THE Cart SHALL store the Device_Voucher independently from any applied Broadband_Voucher
4. WHEN a valid Broadband_Voucher is applied, THE Cart SHALL store the Broadband_Voucher independently from any applied Device_Voucher
5. IF an invalid voucher code is submitted for either item type, THEN THE Promotion_Service SHALL return a descriptive error message identifying the reason for rejection

### Requirement 3: Split Voucher Input UI

**User Story:** As a customer, I want separate voucher input fields for device and broadband items in my cart, so that I can apply different discount codes to each category.

#### Acceptance Criteria

1. WHEN the Cart contains at least one Device_Item, THE Split_Voucher_Input SHALL display a voucher code input field labelled for device discounts
2. WHEN the Cart contains at least one Broadband_Item, THE Split_Voucher_Input SHALL display a voucher code input field labelled for broadband discounts
3. WHEN the Cart contains only Device_Items, THE Split_Voucher_Input SHALL display only the device voucher input field
4. WHEN the Cart contains only Broadband_Items, THE Split_Voucher_Input SHALL display only the broadband voucher input field
5. WHEN a Device_Voucher is successfully applied, THE Split_Voucher_Input SHALL display the applied promotion name with a remove option in the device voucher section
6. WHEN a Broadband_Voucher is successfully applied, THE Split_Voucher_Input SHALL display the applied promotion name and the `valid_till` duration with a remove option in the broadband voucher section
7. WHEN the customer removes a Device_Voucher, THE Cart SHALL clear only the Device_Voucher and leave the Broadband_Voucher unchanged
8. WHEN the customer removes a Broadband_Voucher, THE Cart SHALL clear only the Broadband_Voucher and leave the Device_Voucher unchanged

### Requirement 4: Device Voucher Discount Calculation

**User Story:** As a customer, I want my device voucher discount applied to the one-time device price, so that I see the correct amount to pay today.

#### Acceptance Criteria

1. WHEN a Device_Voucher with `discount_type` of `percentage` is applied, THE Discount_Calculator SHALL reduce each eligible Device_Item price by the specified percentage
2. WHEN a Device_Voucher with `discount_type` of `fixed` is applied, THE Discount_Calculator SHALL reduce each eligible Device_Item price by the specified fixed amount
3. IF the calculated discounted price for a Device_Item is less than zero, THEN THE Discount_Calculator SHALL set the discounted price to zero
4. THE Pay_Today_Total SHALL equal the sum of all Device_Item prices after Device_Voucher discounts are applied

### Requirement 5: Broadband Voucher Discount Calculation with Duration

**User Story:** As a customer, I want my broadband voucher discount applied only for the promotional period, so that I understand my monthly cost during and after the promotion.

#### Acceptance Criteria

1. WHEN a Broadband_Voucher with `discount_type` of `percentage` is applied, THE Discount_Calculator SHALL reduce each eligible Broadband_Item monthly price by the specified percentage for the number of months defined by `valid_till`
2. WHEN a Broadband_Voucher with `discount_type` of `fixed` is applied, THE Discount_Calculator SHALL reduce each eligible Broadband_Item monthly price by the specified fixed amount for the number of months defined by `valid_till`
3. IF the calculated discounted monthly price for a Broadband_Item is less than zero, THEN THE Discount_Calculator SHALL set the discounted monthly price to zero
4. THE Pay_Monthly_Total SHALL display the discounted monthly price alongside a note indicating the duration (e.g., "£63.00/mo for first 3 months, then £70.00/mo")
5. WHEN no Broadband_Voucher is applied, THE Pay_Monthly_Total SHALL display the standard monthly price without any duration note

### Requirement 6: Split Order Summary Display

**User Story:** As a customer, I want the order summary to clearly separate my one-time device costs from my monthly broadband costs, so that I understand exactly what I pay today and what I pay each month.

#### Acceptance Criteria

1. THE Order_Summary SHALL display a "Pay Today" section showing the total one-time cost for all Device_Items after any Device_Voucher discount
2. THE Order_Summary SHALL display a "Pay Monthly" section showing the recurring monthly cost for all Broadband_Items after any Broadband_Voucher discount
3. WHEN a Device_Voucher is applied, THE Order_Summary SHALL display the original device subtotal, the discount amount, and the discounted Pay_Today_Total
4. WHEN a Broadband_Voucher is applied, THE Order_Summary SHALL display the original monthly subtotal, the discounted monthly price, and the promotional duration from `valid_till`
5. WHEN the Cart contains only Device_Items, THE Order_Summary SHALL display only the "Pay Today" section
6. WHEN the Cart contains only Broadband_Items, THE Order_Summary SHALL display only the "Pay Monthly" section
7. WHEN the Cart contains both Device_Items and Broadband_Items, THE Order_Summary SHALL display both the "Pay Today" and "Pay Monthly" sections

### Requirement 7: Database Schema Migration for Split Vouchers

**User Story:** As a developer, I want the promotions table updated to support item type targeting and duration limits, so that the backend can distinguish between device and broadband vouchers.

#### Acceptance Criteria

1. THE database migration SHALL add a `valid_till` column of integer type to the promotions table, defaulting to null
2. THE database migration SHALL add an `applicable_item_type` column of text type to the promotions table, defaulting to `both`
3. THE database migration SHALL preserve all existing promotion records without data loss
4. WHEN the `applicable_item_type` column contains a value other than `device`, `broadband`, or `both`, THE Promotion_Service SHALL reject the promotion as invalid

### Requirement 8: Seed Data for Broadband and Device Vouchers

**User Story:** As a developer, I want sample broadband and device voucher records seeded into the promotions table, so that the split voucher system can be tested end-to-end immediately after deployment.

#### Acceptance Criteria

1. THE seed script SHALL insert at least one Broadband_Voucher with `applicable_item_type` set to `broadband`, a `promo_code` value, a `discount_type` of `percentage`, a `discount_value` of 10, and a `valid_till` of 3 months
2. THE seed script SHALL insert at least one Device_Voucher with `applicable_item_type` set to `device`, a `promo_code` value, a `discount_type` of `percentage`, and a `discount_value` of 10
3. THE seed script SHALL insert at least one voucher with `applicable_item_type` set to `both` to verify backward-compatible behavior
4. ALL seeded voucher records SHALL have `is_active` set to true and valid `start_date` / `end_date` ranges that include the current date
5. THE seed script SHALL be idempotent, using `ON CONFLICT` or equivalent to avoid duplicate inserts on re-run

### Requirement 9: Backward Compatibility with Existing Coupons

**User Story:** As a returning customer, I want my existing coupon codes to continue working, so that previously issued promotions remain valid.

#### Acceptance Criteria

1. WHEN an existing Promotion record has no `valid_till` value and no `applicable_item_type` value, THE Promotion_Service SHALL treat the Promotion as applicable to `both` item types with no time limit
2. THE Promotion_Service SHALL validate existing coupon codes using the same validation endpoint without requiring changes to the coupon code format
3. WHEN a voucher with `applicable_item_type` of `both` is applied in the device voucher input, THE Cart SHALL apply the discount only to Device_Items
4. WHEN a voucher with `applicable_item_type` of `both` is applied in the broadband voucher input, THE Cart SHALL apply the discount only to Broadband_Items
