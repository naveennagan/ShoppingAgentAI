# Checkout About You Cleanup Bugfix Design

## Overview

The checkout page's "About You" step renders an `OrderSummaryBar` component showing device and broadband summary lines above the user details form. This is redundant because the payment step already presents full product details via `DevicePaymentSection` and `BroadbandSection`. The fix removes the `OrderSummaryBar` call from the `step === 'about'` block in `src/app/checkout/page.tsx`, eliminating the visual clutter while preserving all other checkout functionality.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when the checkout step is `'about'`, the `OrderSummaryBar` component is rendered, displaying redundant product summary information
- **Property (P)**: The desired behavior — the About You step should show only the "Your Details" form without any `OrderSummaryBar`
- **Preservation**: The payment step's `DevicePaymentSection`, `BroadbandSection`, compact about-you summary bar, the "Your Details" form fields, and form submission behavior must all remain unchanged
- **OrderSummaryBar**: A local function component in `src/app/checkout/page.tsx` that renders device count/price and broadband monthly cost as summary rows
- **CheckoutPage**: The default export component in `src/app/checkout/page.tsx` that manages the two-step checkout flow (`'about'` → `'payment'`)

## Bug Details

### Bug Condition

The bug manifests when the user is on the "About You" step (step 1) of checkout. The `CheckoutPage` component renders an `OrderSummaryBar` inside the `{step === 'about' && (...)}` block, displaying device and broadband summary lines that duplicate information already shown on the payment step.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { step: 'about' | 'payment', session: CheckoutSession }
  OUTPUT: boolean

  RETURN input.step === 'about'
         AND input.session IS NOT NULL
         AND (input.session.hasDevices OR input.session.hasBroadbandService)
END FUNCTION
```

### Examples

- User has 1 device (£815.00) in cart, navigates to checkout → About You step shows "📦 1 device £815.00 due today" summary bar above the form (redundant)
- User has broadband (£48.99/mo) in cart, navigates to checkout → About You step shows "📡 Broadband £48.99/mo after installation" summary bar above the form (redundant)
- User has both devices and broadband in cart → About You step shows both summary rows above the form (redundant)
- User has empty cart → Checkout redirects to empty cart view (not affected, no OrderSummaryBar rendered)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The payment step (step 2) must continue to display `DevicePaymentSection` with full device details and payment form
- The payment step must continue to display `BroadbandSection` with broadband details and appointment booking
- The "Your Details" form on the About You step must continue to display fields for full name, email, phone, and address, plus the "Continue to Payment" button
- Form submission must continue to save customer details via `apiClient.saveCustomerDetails` and advance to the payment step
- The compact about-you summary bar (name, email, address with Edit button) must continue to appear at the top of the payment step
- The `OrderSummaryBar` function component itself can remain in the file (dead code) or be removed — either is acceptable

**Scope:**
All inputs that do NOT involve the About You step's rendering of `OrderSummaryBar` should be completely unaffected by this fix. This includes:
- Payment step rendering and interactions
- Form field behavior and validation on the About You step
- Cancel modal functionality
- Cart state management
- Navigation between steps

## Hypothesized Root Cause

Based on the bug description, this is a UI design issue rather than a logic error:

1. **Unnecessary Component Rendering**: The `OrderSummaryBar` was included in the About You step's JSX block during initial development, likely as a convenience for users to see what they're checking out. However, since the payment step shows full product details, this summary is redundant and adds clutter.

2. **No Conditional Guard**: There is no condition preventing `OrderSummaryBar` from rendering on the About You step — it always renders when `step === 'about'` and a session exists.

The fix is straightforward: remove the `<OrderSummaryBar ... />` JSX call from the `{step === 'about' && (...)}` block.

## Correctness Properties

Property 1: Bug Condition - OrderSummaryBar Not Rendered on About You Step

_For any_ checkout state where the step is `'about'` and a valid session exists (isBugCondition returns true), the fixed `CheckoutPage` component SHALL NOT render the `OrderSummaryBar` component, showing only the "Your Details" card with form fields.

**Validates: Requirements 2.1, 2.2**

Property 2: Preservation - Payment Step and Form Behavior Unchanged

_For any_ checkout state where the step is `'payment'` or where the user interacts with the About You form fields and submission (isBugCondition returns false for these interactions), the fixed component SHALL produce the same rendered output and behavior as the original component, preserving device payment, broadband booking, form submission, and navigation functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/app/checkout/page.tsx`

**Function**: `CheckoutPage` (default export)

**Specific Changes**:
1. **Remove OrderSummaryBar call**: Delete the `<OrderSummaryBar session={session} onCancelDevices={() => setCancelTarget('devices')} onCancelBroadband={() => setCancelTarget('broadband')} />` line from inside the `{step === 'about' && (...)}` block
2. **Optionally remove OrderSummaryBar function**: The `OrderSummaryBar` function component at the bottom of the file becomes dead code after the removal. It can be removed for cleanliness, but this is optional.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the `OrderSummaryBar` is indeed rendered on the About You step.

**Test Plan**: Write a React component test that renders `CheckoutPage` with a mock session containing devices and/or broadband, asserts that the About You step contains `OrderSummaryBar` content (e.g., text matching "device" or "Broadband" summary patterns). Run on UNFIXED code to confirm the bug.

**Test Cases**:
1. **Devices Summary Test**: Render checkout with devices in session, verify "📦" or device summary text appears on About You step (will pass on unfixed code, confirming bug)
2. **Broadband Summary Test**: Render checkout with broadband in session, verify "📡" or broadband summary text appears on About You step (will pass on unfixed code, confirming bug)
3. **Combined Summary Test**: Render checkout with both devices and broadband, verify both summary rows appear (will pass on unfixed code, confirming bug)

**Expected Counterexamples**:
- The OrderSummaryBar renders device/broadband summary text on the About You step
- Root cause confirmed: the JSX unconditionally includes `<OrderSummaryBar />` in the about step block

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed component does not render OrderSummaryBar content on the About You step.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderCheckoutPage_fixed(input)
  ASSERT NOT result.contains(OrderSummaryBar content)
  ASSERT result.contains("Your Details" form)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed component produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderCheckoutPage_original(input) = renderCheckoutPage_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for payment step rendering and form interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Payment Step Device Rendering**: Verify `DevicePaymentSection` renders correctly on payment step after fix
2. **Payment Step Broadband Rendering**: Verify `BroadbandSection` renders correctly on payment step after fix
3. **About You Form Fields**: Verify all form fields (name, email, phone, address) render and accept input after fix
4. **Form Submission**: Verify form submission saves details and advances to payment step after fix
5. **Compact Summary Bar**: Verify the about-you summary bar with Edit button appears on payment step after fix

### Unit Tests

- Test that About You step does NOT render OrderSummaryBar content (device/broadband summary text)
- Test that About You step still renders the "Your Details" form with all fields
- Test that form validation still works (required fields check)

### Property-Based Tests

- Generate random `CheckoutSession` configurations and verify the About You step never contains OrderSummaryBar content
- Generate random sessions and verify payment step rendering is identical before and after fix

### Integration Tests

- Test full checkout flow: fill About You form → submit → verify payment step renders correctly
- Test Edit button on payment step returns to About You step without OrderSummaryBar
