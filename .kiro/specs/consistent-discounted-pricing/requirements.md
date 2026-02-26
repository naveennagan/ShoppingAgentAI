# Requirements Document

## Introduction

Currently, discounted prices are only displayed on the ProductCard component. When a product with an active (non-coupon) promotion appears in the cart, order history, or AI chat suggestion cards, only the original price is shown. This feature ensures that discounted pricing information is displayed consistently across all surfaces where a product price appears, so users always see the correct price and know when they are getting a deal.

## Glossary

- **Pricing_Display**: Any UI element that renders a product's price to the user, including cart line items, order items, and suggestion cards.
- **Cart_Page**: The shopping cart page (`src/app/cart/page.tsx`) that lists items the user intends to purchase.
- **Orders_Page**: The order history page (`src/app/orders/page.tsx`) that lists previously placed orders and their items.
- **Suggestion_Card**: The AI chat product suggestion card (`src/components/ui/SuggestionCard.tsx`) that recommends products to the user.
- **Product_Card**: The existing product listing card (`src/components/ProductCard.tsx`) that already displays discounted prices.
- **Discount_Calculator**: The utility (`src/lib/discountCalculator.ts`) that computes a discounted price given an original price, discount type, and discount value.
- **Promotion**: A pricing promotion with a discount type (percentage or fixed_amount), discount value, active flag, optional promo code, and optional promotional label.
- **Active_Automatic_Promotion**: A Promotion where `active` is true and `promoCode` is null, meaning it applies automatically without a coupon code.
- **Cart_Context**: The React context (`src/context/CartContext.tsx`) that manages cart state including items, totals, and coupon logic.
- **Original_Price**: The base price of a product before any promotion is applied.
- **Discounted_Price**: The price of a product after an Active_Automatic_Promotion is applied via the Discount_Calculator.

## Requirements

### Requirement 1: Cart Page Discounted Price Display

**User Story:** As a shopper, I want to see the discounted price of products in my cart, so that I know the actual price I am paying before checkout.

#### Acceptance Criteria

1. WHEN a cart item has an Active_Automatic_Promotion, THE Cart_Page SHALL display the Discounted_Price for that item.
2. WHEN a cart item has an Active_Automatic_Promotion, THE Cart_Page SHALL display the Original_Price with a strikethrough style next to the Discounted_Price.
3. WHEN a cart item has an Active_Automatic_Promotion with a non-null promotional label, THE Cart_Page SHALL display the promotional label next to the item.
4. WHEN a cart item has no Active_Automatic_Promotion, THE Cart_Page SHALL display only the Original_Price without strikethrough or label.
5. THE Cart_Page SHALL compute the cart subtotal using the Discounted_Price for items with Active_Automatic_Promotions and the Original_Price for items without.

### Requirement 2: Orders Page Discounted Price Display

**User Story:** As a shopper, I want to see which items in my past orders were discounted, so that I can verify I received the correct pricing.

#### Acceptance Criteria

1. WHEN an order item was purchased at a Discounted_Price, THE Orders_Page SHALL display the Discounted_Price for that item.
2. WHEN an order item was purchased at a Discounted_Price, THE Orders_Page SHALL display the Original_Price with a strikethrough style next to the Discounted_Price.
3. WHEN an order item has a promotional label, THE Orders_Page SHALL display the promotional label next to the item.
4. WHEN an order item was purchased at the Original_Price, THE Orders_Page SHALL display only the Original_Price without strikethrough or label.

### Requirement 3: AI Suggestion Card Discounted Price Display

**User Story:** As a shopper, I want to see discounted prices on AI-recommended products, so that I can identify deals when browsing suggestions.

#### Acceptance Criteria

1. WHEN a suggested product has an Active_Automatic_Promotion, THE Suggestion_Card SHALL display the Discounted_Price.
2. WHEN a suggested product has an Active_Automatic_Promotion, THE Suggestion_Card SHALL display the Original_Price with a strikethrough style next to the Discounted_Price.
3. WHEN a suggested product has an Active_Automatic_Promotion with a non-null promotional label, THE Suggestion_Card SHALL display the promotional label.
4. WHEN a suggested product has no Active_Automatic_Promotion, THE Suggestion_Card SHALL display only the Original_Price.

### Requirement 4: Cart Context Discount-Aware Totals

**User Story:** As a shopper, I want the cart total to reflect automatic promotions, so that the total I see matches what I will pay at checkout.

#### Acceptance Criteria

1. THE Cart_Context SHALL compute the cart total using the Discounted_Price for items with Active_Automatic_Promotions and the Original_Price for items without.
2. WHEN a coupon is also applied, THE Cart_Context SHALL apply the coupon discount after the automatic promotion discount has been applied.
3. THE Cart_Context SHALL recompute totals whenever the cart items or their associated promotions change.

### Requirement 5: Consistent Discount Visual Treatment

**User Story:** As a shopper, I want discount styling to look the same everywhere, so that I can quickly recognize discounted products regardless of where I see them.

#### Acceptance Criteria

1. THE Pricing_Display SHALL use the same visual pattern for discounted items across Cart_Page, Orders_Page, and Suggestion_Card: Discounted_Price in a highlight color, Original_Price with strikethrough in a muted color.
2. THE Pricing_Display SHALL match the existing discount styling used by the Product_Card component.

### Requirement 6: Backend Discount Data in Orders

**User Story:** As a shopper, I want my order history to record the discounted price at the time of purchase, so that the order reflects the actual amount charged.

#### Acceptance Criteria

1. WHEN an order is placed for a product with an Active_Automatic_Promotion, THE backend SHALL store the Discounted_Price as the item price in the order record.
2. WHEN an order is placed for a product with an Active_Automatic_Promotion, THE backend SHALL store the promotional label in the order item record.
3. WHEN an order is placed for a product without an Active_Automatic_Promotion, THE backend SHALL store the Original_Price as the item price in the order record.
4. THE backend SHALL store the Original_Price alongside the Discounted_Price in the order item record so both values are available for display.
