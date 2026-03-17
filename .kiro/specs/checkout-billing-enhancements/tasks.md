# Implementation Plan: Checkout & Billing Enhancements

## Overview

This plan implements three enhancements across the Next.js frontend and Spring Boot backend: (1) persisting customer details before payment, (2) supporting per-item broadband appointment booking, and (3) replacing the bills card view with a detailed table. Tasks are ordered so backend changes land first, followed by frontend integration, then the bills page overhaul.

## Tasks

- [x] 1. Database schema migration and backend models
  - [x] 1.1 Create SQL migration script for schema changes
    - Add `customer_name`, `customer_email`, `customer_phone`, `customer_address` columns (nullable text) to `checkout_sessions` table
    - Add `cart_item_id` column (nullable text) to `appointments` table
    - Add `plan_name` column (nullable text, default 'Broadband Plan') to `subscriptions` table
    - _Requirements: 4.1, 5.2, 3.7_

  - [x] 1.2 Create `CustomerDetails` Java model
    - Create `CustomerDetails.java` POJO with fields: `fullName`, `email`, `phone`, `address`
    - Use Lombok `@Data`, `@NoArgsConstructor`, `@AllArgsConstructor`
    - _Requirements: 4.1, 4.2_

  - [x] 1.3 Update `CheckoutSession` Java model
    - Add `CustomerDetails customerDetails` field
    - Replace `boolean appointmentBooked` with `Map<String, String> broadbandBookingStatus` (cartItemId → "unbooked" | appointmentId)
    - Update constructor and Lombok annotations accordingly
    - _Requirements: 2.1, 5.3_

  - [x] 1.4 Update `AppointmentRequest` Java model
    - Add optional `String broadbandItemId` field
    - _Requirements: 5.2_

  - [x] 1.5 Update `Subscription` Java model
    - Add `String planName` field
    - _Requirements: 3.7_


- [x] 2. Backend customer details endpoints
  - [x] 2.1 Implement `saveCustomerDetails` in `CheckoutService`
    - Add method that accepts `sessionId` and `CustomerDetails`
    - Patch `checkout_sessions` row with `customer_name`, `customer_email`, `customer_phone`, `customer_address`
    - Return 404 if session not found
    - _Requirements: 4.1, 4.5_

  - [x] 2.2 Implement `getCustomerDetails` in `CheckoutService`
    - Add method that fetches customer detail columns from `checkout_sessions` by `sessionId`
    - Return null/empty `CustomerDetails` if no details saved yet (not an error)
    - _Requirements: 4.2_

  - [x] 2.3 Add customer details endpoints to `CheckoutController`
    - `PUT /api/checkout/session/{sessionId}/customer-details` → calls `saveCustomerDetails`
    - `GET /api/checkout/session/{sessionId}/customer-details` → calls `getCustomerDetails`
    - Return 404 with `{ "message": "Checkout session not found" }` when session missing
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 2.4 Write property test for customer details round-trip persistence (backend)
    - **Property 2: Customer details round-trip persistence**
    - Use jqwik to generate random `CustomerDetails` objects (non-blank fullName, email, address; arbitrary phone)
    - Save then retrieve; assert field equality
    - **Validates: Requirements 1.6, 4.1, 4.2**

  - [x] 2.5 Update `buildCheckoutSession` to include customer details
    - Fetch `customer_name`, `customer_email`, `customer_phone`, `customer_address` from `checkout_sessions`
    - Populate `customerDetails` field on the returned `CheckoutSession` object
    - _Requirements: 1.7, 4.2_

  - [x] 2.6 Update `processMockDevicePayment` to use saved customer address
    - When creating the device order, read saved `customer_address` from the session
    - Set it as the shipping address on the order record instead of omitting it
    - _Requirements: 4.3_

  - [ ]* 2.7 Write property test for device payment associating customer details (backend)
    - **Property 12: Device payment associates customer details**
    - Generate random customer details, save them, process payment, assert order has correct address
    - **Validates: Requirements 4.3**

- [x] 3. Checkpoint - Ensure customer details backend compiles and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Backend multiple broadband appointment support
  - [x] 4.1 Refactor `buildCheckoutSession` for per-item booking status
    - Replace `appointmentBooked` boolean logic with `broadbandBookingStatus` map
    - For each broadband service item, query `appointments` table by `cart_item_id` to determine if booked
    - Populate `broadbandBookingStatus` as `Record<cartItemId, "unbooked" | appointmentId>`
    - _Requirements: 5.3, 2.1_

  - [x] 4.2 Refactor `bookAppointment` for per-item booking
    - Accept `broadbandItemId` from `AppointmentRequest`
    - Validate that `broadbandItemId` exists as a broadband cart item in the session; return 404 if not found
    - Return 409 if appointment already booked for that item
    - Create a separate service order per broadband item
    - Set `cart_item_id` on the appointment row
    - Use saved `customer_address` as `install_address` instead of "TBD"
    - _Requirements: 5.1, 5.2, 5.6, 4.4_

  - [ ]* 4.3 Write property test for per-item broadband booking isolation (backend)
    - **Property 3: Per-item broadband booking isolation**
    - Generate N broadband items, book one, assert only that one is marked booked
    - **Validates: Requirements 2.1, 2.2, 2.3**

  - [ ]* 4.4 Write property test for one order and appointment per item (backend)
    - **Property 5: One service order and appointment per broadband item**
    - Generate N broadband items, book all, assert exactly N orders and N appointments
    - **Validates: Requirements 2.5, 5.1, 5.2, 5.3**

  - [x] 4.5 Update session completion logic
    - When all broadband items have booked appointments, update session status to reflect full completion
    - _Requirements: 5.4_

  - [ ]* 4.6 Write property test for all-booked completion (backend)
    - **Property 4: All-booked completion summary**
    - Generate N items, book all, assert broadbandBookingStatus has N non-"unbooked" entries and session status reflects completion
    - **Validates: Requirements 2.4, 5.4**

  - [x] 4.7 Implement `getSubscriptionsBySession` returning list
    - Add new method in `CheckoutService` that queries all subscriptions for a session
    - Include `plan_name` in the select and map to `Subscription.planName`
    - Return empty list if none found
    - _Requirements: 5.5, 3.2_

  - [x] 4.8 Add list subscriptions endpoint to `CheckoutController`
    - `GET /api/checkout/subscriptions/{sessionId}/all` → returns `List<Subscription>`
    - Returns empty list `[]` when no subscriptions exist
    - _Requirements: 5.5_

  - [ ]* 4.9 Write property test for appointment using saved address (backend)
    - **Property 13: Appointment uses saved address**
    - Generate random customer details with address, book appointment, assert appointment address matches saved address
    - **Validates: Requirements 4.4**

  - [ ]* 4.10 Write property test for cancellation isolation (backend)
    - **Property 6: Cancellation removes only the target item**
    - Generate N items, book some, cancel one, assert only the cancelled item is removed
    - **Validates: Requirements 2.6**

- [x] 5. Checkpoint - Ensure all backend changes compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 6. Frontend type updates and API client methods
  - [x] 6.1 Update frontend TypeScript types in `src/types/checkout.ts`
    - Add `CustomerDetails` interface (`fullName`, `email`, `phone`, `address`)
    - Update `CheckoutSession` interface: add `customerDetails?: CustomerDetails`, replace `appointmentBooked: boolean` with `broadbandBookingStatus: Record<string, string>`
    - Update `AppointmentRequest` interface: add optional `broadbandItemId?: string`
    - Update `Subscription` interface: add `planName?: string`
    - _Requirements: 1.2, 2.1, 5.2, 3.7_

  - [x] 6.2 Add new API client methods in `src/lib/api-client.ts`
    - `saveCustomerDetails(sessionId, details)` → PUT to `/api/checkout/session/{sessionId}/customer-details`
    - `getCustomerDetails(sessionId)` → GET from `/api/checkout/session/{sessionId}/customer-details`
    - `getSubscriptions(sessionId)` → GET from `/api/checkout/subscriptions/{sessionId}/all` returning `Subscription[]`
    - Update `bookAppointment` to pass optional `broadbandItemId` in the request body
    - _Requirements: 1.6, 4.1, 4.2, 5.2, 5.5_

- [x] 7. Frontend checkout page - About You persistence
  - [x] 7.1 Persist customer details on About You form submission
    - On `handleAboutSubmit`, call `apiClient.saveCustomerDetails` with the form data before transitioning to payment step
    - Show inline error if save fails; do not transition to payment
    - _Requirements: 1.6, 1.3, 1.4_

  - [x] 7.2 Pre-populate About You form from saved details on page load
    - In the `useEffect` init, after building the checkout session, check `session.customerDetails`
    - If present, populate `aboutYou` state and skip to payment step
    - If `getCustomerDetails` fails, proceed with empty form (log warning)
    - _Requirements: 1.7, 1.1_

  - [ ]* 7.3 Write property test for customer details validation controls step transition (frontend)
    - **Property 1: Customer details validation controls step transition**
    - Use fast-check to generate random strings for fullName, email, address (including empty/whitespace-only)
    - Assert form transitions iff all required fields are non-blank after trimming
    - **Validates: Requirements 1.3, 1.4**

  - [x] 7.4 Ensure payment step shows customer details summary with Edit link
    - Verify the compact summary bar displays `fullName`, `email`, `address` from saved details
    - Edit link returns to About You step (existing behavior, ensure it works with persisted data)
    - _Requirements: 1.5_

- [x] 8. Frontend checkout page - Multiple broadband booking UI
  - [x] 8.1 Update `BroadbandSection` for per-item booking
    - Render each broadband service item from `session.serviceItems` as a separate bookable card
    - Use `session.broadbandBookingStatus` to determine which items are booked vs unbooked
    - Each unbooked item shows its own appointment scheduling controls
    - Each booked item shows a confirmation with the booked date/time
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 8.2 Wire per-item appointment booking calls
    - Update `handleBookAppointment` to accept a `broadbandItemId` parameter
    - Pass `broadbandItemId` in the `bookAppointment` API call
    - On success, update `broadbandBookingStatus` in local state for that specific item
    - _Requirements: 2.2, 5.2_

  - [x] 8.3 Implement combined confirmation summary when all items booked
    - When all entries in `broadbandBookingStatus` are non-"unbooked", display a combined summary
    - Show each plan with its booked date and time slot
    - _Requirements: 2.4_

  - [x] 8.4 Support per-item cancellation in checkout
    - Allow cancelling a single broadband plan without affecting others
    - Call remove from cart for the specific item and update local state
    - _Requirements: 2.6_

  - [ ]* 8.5 Write unit tests for multiple broadband booking UI
    - Test that each broadband item renders its own booking card
    - Test that booking one item does not affect others
    - Test combined confirmation summary when all booked
    - _Requirements: 2.1, 2.2, 2.4_

- [x] 9. Checkpoint - Ensure checkout page changes work end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend bills page - Detailed table view
  - [x] 10.1 Update bills page to fetch all subscriptions
    - Replace `apiClient.getSubscription` call with `apiClient.getSubscriptions` (list endpoint)
    - Handle error with retry banner; do not show empty state on error
    - _Requirements: 3.2, 5.5_

  - [x] 10.2 Implement bills table component
    - Replace the card-based layout with an HTML table
    - Columns: Product Name, Due Date, Payment Amount, Breakdown, Status
    - Format payment amount as GBP currency (`£X.XX`)
    - Display status as a visual badge: "Active", "Pending Installation", or "Cancelled"
    - Calculate due date: one month from `activatedAt` for active; "After installation" for inactive
    - Breakdown column shows plan name and monthly price
    - _Requirements: 3.1, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [x] 10.3 Implement empty state for bills table
    - When no subscriptions returned, show empty state message with link to browse broadband plans
    - _Requirements: 3.8_

  - [x] 10.4 Write property test for GBP currency formatting (frontend)
    - **Property 8: GBP currency formatting**
    - Use fast-check to generate random non-negative floats
    - Assert formatted string matches `£X.XX` pattern with exactly two decimal places
    - **Validates: Requirements 3.3**

  - [x] 10.5 Write property test for due date computation (frontend)
    - **Property 9: Due date computation**
    - Generate random dates and statuses
    - Assert active subscriptions show date one month from activation; inactive shows "After installation"
    - **Validates: Requirements 3.5, 3.6**

  - [ ]* 10.6 Write property test for status badge mapping (frontend)
    - **Property 10: Status badge mapping**
    - Generate random status values from {"active", "inactive", "cancelled"}
    - Assert badge label is "Active", "Pending Installation", or "Cancelled" respectively
    - **Validates: Requirements 3.4**

  - [ ]* 10.7 Write property test for breakdown content (frontend)
    - **Property 11: Bills breakdown contains plan name and price**
    - Generate random plan names and prices
    - Assert breakdown string contains both the plan name and formatted price
    - **Validates: Requirements 3.7**

  - [ ]* 10.8 Write property test for subscription count matches table rows (frontend)
    - **Property 7: Subscription count matches table rows**
    - Generate random subscription lists
    - Assert the table renders exactly that many rows
    - **Validates: Requirements 3.2, 5.5**

- [ ] 11. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Backend tasks (1–5) should be completed before frontend integration tasks (6–9)
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- The existing `GET /api/checkout/subscriptions/{sessionId}` endpoint is kept for backward compatibility
