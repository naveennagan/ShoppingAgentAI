# Requirements Document

## Introduction

This feature enhances the checkout and billing experience for a telecom shopping application. Currently, the checkout flow jumps directly from an "About You" form to payment, broadband installation auto-completes after a single appointment booking, and the "My Bills" page shows only a minimal card-based view. The enhancements address three areas: (1) ensuring the personal details step is prominent and persisted before payment proceeds, (2) supporting multiple broadband plan bookings rather than a single auto-completing flow, and (3) replacing the simple bills view with a detailed tabular breakdown.

## Glossary

- **Checkout_Page**: The Next.js page at `/checkout` that orchestrates the multi-step checkout flow.
- **About_You_Section**: The form step within the Checkout_Page where the customer provides personal details (full name, email, phone, delivery/installation address).
- **Payment_Section**: The step within the Checkout_Page where the customer completes device payment and/or broadband installation booking.
- **Broadband_Section**: The component within the Payment_Section responsible for scheduling broadband installation appointments.
- **Bills_Page**: The Next.js page at `/bills` that displays the customer's active subscriptions and payment history.
- **Bills_Table**: A tabular UI component on the Bills_Page showing product name, due date, payment amount, breakdown, and status for each subscription.
- **Checkout_Service**: The Spring Boot backend service (`CheckoutService.java`) that manages checkout sessions, payments, appointments, and subscriptions.
- **Customer_Details**: The personal information object containing full name, email address, phone number, and installation/delivery address.
- **Subscription**: A recurring broadband service record with monthly price, status, activation date, and associated order.

## Requirements

### Requirement 1: Personal Details Collection Before Payment

**User Story:** As a customer, I want to fill in my personal details before proceeding to payment, so that my information is captured and associated with my order.

#### Acceptance Criteria

1. WHEN the Checkout_Page loads for a new session, THE About_You_Section SHALL display as the first visible step before the Payment_Section.
2. THE About_You_Section SHALL collect the following fields: full name (required), email address (required), phone number (optional), and installation/delivery address (required).
3. WHEN the customer submits the About_You_Section with any required field empty, THE Checkout_Page SHALL display a validation error message identifying the missing fields and SHALL prevent navigation to the Payment_Section.
4. WHEN the customer submits the About_You_Section with all required fields populated, THE Checkout_Page SHALL transition to the Payment_Section.
5. WHILE the Payment_Section is displayed, THE Checkout_Page SHALL show a compact summary of the submitted Customer_Details with an "Edit" link that returns the customer to the About_You_Section.
6. WHEN the customer submits the About_You_Section, THE Checkout_Service SHALL persist the Customer_Details against the checkout session so that the details are available for order creation and appointment booking.
7. IF the Checkout_Page loads and the checkout session already has persisted Customer_Details, THEN THE Checkout_Page SHALL pre-populate the About_You_Section fields with the saved values.

### Requirement 2: Multiple Broadband Plan Booking Support

**User Story:** As a customer, I want to book installation for each broadband plan in my cart individually, so that I can manage multiple broadband subscriptions in a single checkout.

#### Acceptance Criteria

1. WHEN the checkout session contains multiple broadband service items, THE Broadband_Section SHALL display each broadband plan as a separate bookable item with its own appointment scheduling controls.
2. WHEN the customer books an installation appointment for one broadband plan, THE Broadband_Section SHALL mark that specific plan as "booked" and SHALL keep the remaining unbooked plans available for scheduling.
3. WHILE at least one broadband plan in the checkout session remains unbooked, THE Broadband_Section SHALL display the unbooked plans with active scheduling controls.
4. WHEN all broadband plans in the checkout session have booked appointments, THE Broadband_Section SHALL display a combined confirmation summary showing each plan with its booked date and time slot.
5. THE Checkout_Service SHALL create a separate appointment record and service order for each broadband plan in the checkout session.
6. IF the customer cancels a single broadband plan from the checkout, THEN THE Checkout_Service SHALL remove only that plan and its associated appointment without affecting other broadband plans in the session.

### Requirement 3: Detailed Bills Table

**User Story:** As a customer, I want to see a detailed table of my bills, so that I can understand what I'm paying for, when payments are due, and the status of each subscription.

#### Acceptance Criteria

1. THE Bills_Page SHALL display subscriptions in a table format with the following columns: Product Name, Due Date, Payment Amount, Breakdown, and Status.
2. WHEN the Bills_Page loads, THE Bills_Page SHALL fetch all subscriptions associated with the current session and display each subscription as a row in the Bills_Table.
3. THE Bills_Table SHALL display the payment amount formatted as a currency value in GBP (e.g., "£52.99").
4. THE Bills_Table SHALL display the status of each subscription using a visual badge indicating one of: "Active", "Pending Installation", or "Cancelled".
5. WHEN a subscription has status "active", THE Bills_Table SHALL calculate and display the next due date as one calendar month from the activation date.
6. WHEN a subscription has status "inactive", THE Bills_Table SHALL display "After installation" as the due date.
7. THE Bills_Table SHALL display a breakdown column showing the plan name and monthly price for each line item within the subscription.
8. IF no subscriptions exist for the current session, THEN THE Bills_Page SHALL display an empty state message with a link to browse broadband plans.

### Requirement 4: Backend Support for Customer Details Persistence

**User Story:** As a developer, I want the backend to store and retrieve customer details for a checkout session, so that the personal information is available throughout the checkout flow and for order fulfilment.

#### Acceptance Criteria

1. THE Checkout_Service SHALL expose an endpoint to save Customer_Details (full name, email, phone, address) against a checkout session identifier.
2. THE Checkout_Service SHALL expose an endpoint to retrieve previously saved Customer_Details for a given checkout session identifier.
3. WHEN the customer completes device payment, THE Checkout_Service SHALL associate the saved Customer_Details with the created order record.
4. WHEN the customer books a broadband installation appointment, THE Checkout_Service SHALL use the saved address from Customer_Details as the installation address instead of the placeholder "TBD" value.
5. IF a save request is received with a session identifier that has no existing checkout session, THEN THE Checkout_Service SHALL return an error response indicating the session was not found.

### Requirement 5: Backend Support for Multiple Broadband Appointments

**User Story:** As a developer, I want the backend to handle multiple broadband service items per checkout session, so that each plan gets its own order and appointment.

#### Acceptance Criteria

1. THE Checkout_Service SHALL support creating multiple service orders within a single checkout session, one per broadband service item.
2. WHEN a broadband appointment booking request is received, THE Checkout_Service SHALL accept a broadband item identifier to associate the appointment with the correct service item.
3. THE Checkout_Service SHALL track appointment-booked status per broadband item rather than as a single boolean on the checkout session.
4. WHEN all broadband items in a checkout session have booked appointments, THE Checkout_Service SHALL update the checkout session status to reflect full completion.
5. THE Checkout_Service SHALL expose an endpoint to retrieve all subscriptions for a session, returning a list rather than a single subscription.
6. IF a booking request references a broadband item identifier that does not exist in the checkout session, THEN THE Checkout_Service SHALL return an error response indicating the item was not found.
