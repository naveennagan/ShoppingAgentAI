# Requirements Document

## Introduction

The current promotions system applies discounts to all ~100 products and displays them on every product card. This feature introduces selective promotion visibility so that only ~20 products show promotions on their product cards, while other promotions are coupon-code-only (applied at the cart page via a code input). The cart page will gain a coupon code input with an Apply button and a discount breakdown in the order summary.

## Glossary

- **Product_Card**: The UI component (`ProductCard.tsx`) that renders a single product in the product grid, showing name, price, image, and optionally a promotional label and discounted price.
- **Direct_Promotion**: A promotion with no `promo_code` value (null) and a non-null `promotional_label`. Direct promotions are visible on Product_Cards.
- **Coupon_Promotion**: A promotion with a non-null `promo_code` value and a null `promotional_label`. Coupon promotions are applied only at the cart page via code entry.
- **Promotion_Service**: The backend Spring Boot service (`PromotionService.java`) responsible for querying and validating promotions from Supabase.
- **Coupon_Input**: A text input field and Apply button on the cart page that allows users to enter and submit a coupon code.
- **Cart_Summary**: The order summary section on the cart page that displays subtotal, discounts, and total.
- **Seed_Script**: The Node.js script (`scripts/seed-products.mjs`) that populates the database with products, promotions, and product-promotion links.
- **Discount_Calculator**: The utility (`discountCalculator.ts` / `DiscountCalculator.java`) that computes discounted prices given a discount type and value.
- **Validation_Endpoint**: The backend REST endpoint `POST /api/promotions/validate-code` that validates a coupon code against the database.

## Requirements

### Requirement 1: Selective Promotion Seeding

**User Story:** As a store administrator, I want only ~20 products to have direct promotions and the remaining promotions to be coupon-code-only, so that the storefront is not cluttered with discounts on every product.

#### Acceptance Criteria

1. WHEN the Seed_Script executes, THE Seed_Script SHALL create Direct_Promotions (promo_code is null, promotional_label is non-null) linked to approximately 20 products.
2. WHEN the Seed_Script executes, THE Seed_Script SHALL create Coupon_Promotions (promo_code is non-null, promotional_label is null) that are not displayed on Product_Cards.
3. WHEN the Seed_Script creates a Coupon_Promotion, THE Seed_Script SHALL assign a unique promo_code string to that promotion.

### Requirement 2: Product Card Promotion Filtering

**User Story:** As a shopper, I want to see promotional labels and discounted prices only on products with direct promotions, so that the product listing is clean and not misleading.

#### Acceptance Criteria

1. WHEN the Product_Card fetches promotions for a product, THE Product_Card SHALL display only Direct_Promotions (promotions where promo_code is null).
2. WHEN a product has no Direct_Promotion linked to it, THE Product_Card SHALL display the original price without any discount styling or promotional label.
3. WHEN a product has a Direct_Promotion linked to it, THE Product_Card SHALL display the promotional_label badge and the discounted price calculated by the Discount_Calculator.

### Requirement 3: Coupon Code Validation Endpoint

**User Story:** As a shopper, I want to submit a coupon code and have the system validate it, so that I can receive the associated discount on my cart.

#### Acceptance Criteria

1. WHEN a valid and active coupon code is submitted to the Validation_Endpoint with a list of product IDs, THE Validation_Endpoint SHALL return the matching promotion details including discount_type, discount_value, and the list of applicable product IDs from the submitted list.
2. WHEN an invalid or non-existent coupon code is submitted to the Validation_Endpoint, THE Validation_Endpoint SHALL return a 404 status with an error message indicating the code is invalid.
3. WHEN an expired coupon code is submitted to the Validation_Endpoint (current date is past end_date), THE Validation_Endpoint SHALL return a 400 status with an error message indicating the code has expired.
4. WHEN an inactive coupon code is submitted to the Validation_Endpoint (is_active is false), THE Validation_Endpoint SHALL return a 400 status with an error message indicating the code is not currently active.
5. WHEN a valid coupon code is submitted but none of the provided product IDs are linked to that promotion, THE Validation_Endpoint SHALL return a 200 status with an empty list of applicable product IDs.

### Requirement 4: Cart Page Coupon Input

**User Story:** As a shopper, I want a coupon code input field on the cart page, so that I can enter and apply discount codes to my order.

#### Acceptance Criteria

1. THE Cart_Summary SHALL display a Coupon_Input consisting of a text field and an Apply button.
2. WHEN a user clicks the Apply button with a non-empty coupon code, THE Coupon_Input SHALL send the code and the current cart product IDs to the Validation_Endpoint.
3. WHEN a user clicks the Apply button with an empty or whitespace-only coupon code, THE Coupon_Input SHALL display an inline error message without making a network request.
4. WHEN the Validation_Endpoint returns a successful response, THE Coupon_Input SHALL display a success indicator showing the promotion name and clear the input field.
5. IF the Validation_Endpoint returns an error response, THEN THE Coupon_Input SHALL display the error message from the response to the user.
6. WHEN a coupon has been successfully applied, THE Coupon_Input SHALL display a Remove button that allows the user to remove the applied coupon.

### Requirement 5: Cart Summary Discount Breakdown

**User Story:** As a shopper, I want to see a detailed breakdown of discounts in my cart summary after applying a coupon, so that I understand how the final total is calculated.

#### Acceptance Criteria

1. WHEN a coupon has been applied, THE Cart_Summary SHALL display the subtotal (sum of original prices times quantities).
2. WHEN a coupon has been applied, THE Cart_Summary SHALL display a discount line showing the promotion name and the total discount amount calculated by the Discount_Calculator for all applicable products.
3. WHEN a coupon has been applied, THE Cart_Summary SHALL display the final total as subtotal minus the total discount amount.
4. WHEN no coupon has been applied, THE Cart_Summary SHALL display the subtotal and total as the same value with no discount line.
5. WHEN a coupon is applied but no products in the cart are eligible for that promotion, THE Cart_Summary SHALL display a discount amount of £0.00 and show a message indicating no items are eligible.

### Requirement 6: Frontend API Client Extension

**User Story:** As a developer, I want the API client to support coupon code validation, so that the cart page can communicate with the backend.

#### Acceptance Criteria

1. THE apiClient SHALL expose a `validateCouponCode` method that accepts a coupon code string and an array of product ID strings.
2. WHEN `validateCouponCode` is called, THE apiClient SHALL send a POST request to the Validation_Endpoint with the code and product IDs in the request body.
3. WHEN the Validation_Endpoint returns a non-OK response, THE apiClient SHALL throw an error containing the error message from the response body.
