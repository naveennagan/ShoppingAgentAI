# Bugfix Requirements Document

## Introduction

The checkout page's "About You" step (step 1) renders an `OrderSummaryBar` component that displays summary lines such as "📦 1 device £815.00 due today" and "📡 Broadband £48.99/mo after installation" above the user details form. This information is redundant because the payment step (step 2) already presents full product details — including images, names, and prices — via the `DevicePaymentSection` and `BroadbandSection` components. The `OrderSummaryBar` on the About You step adds visual clutter without providing additional value.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the user is on the "About You" step (step 1) of checkout THEN the system renders an `OrderSummaryBar` component above the "Your Details" form showing device count, device total price, and broadband monthly cost as summary lines

1.2 WHEN the user is on the "About You" step with both devices and broadband in the cart THEN the system displays two summary rows (one for devices, one for broadband) that duplicate information already available on the payment step

### Expected Behavior (Correct)

2.1 WHEN the user is on the "About You" step (step 1) of checkout THEN the system SHALL NOT render the `OrderSummaryBar` component, showing only the "Your Details" form

2.2 WHEN the user is on the "About You" step with both devices and broadband in the cart THEN the system SHALL display only the "Your Details" form without any product summary lines above it

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the user is on the payment step (step 2) with devices in the cart THEN the system SHALL CONTINUE TO display the `DevicePaymentSection` with full device details and payment form

3.2 WHEN the user is on the payment step (step 2) with broadband in the cart THEN the system SHALL CONTINUE TO display the `BroadbandSection` with full broadband details and appointment booking

3.3 WHEN the user is on the "About You" step THEN the system SHALL CONTINUE TO display the "Your Details" form with fields for full name, email, phone, and address, and the "Continue to Payment" button

3.4 WHEN the user submits the "About You" form with valid details THEN the system SHALL CONTINUE TO save customer details and advance to the payment step

3.5 WHEN the user is on the payment step THEN the system SHALL CONTINUE TO display the compact about-you summary bar (showing name, email, address with an Edit button) at the top of the payment view
