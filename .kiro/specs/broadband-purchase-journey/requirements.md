# Requirements Document

## Introduction

Redesign the broadband purchase journey from a dropdown-based flow into a step-by-step, card-based UI. The user progresses through a linear sequence of steps — entering a postcode, selecting an address, viewing available deals, choosing a broadband plan, selecting add-ons, picking a TV package, choosing a SIM plan, selecting home phone services, and reviewing a full pricing summary. Each step is presented as a distinct card. Completing a selection in one step automatically advances the user to the next step.

## Glossary

- **Journey_Wizard**: The top-level React component that orchestrates the multi-step broadband purchase flow, rendering one step card at a time and managing progression between steps.
- **Step_Card**: A self-contained UI card representing a single step in the purchase journey (e.g., postcode entry, deal selection, add-on picker).
- **Postcode_Input**: The Step_Card where the user enters a UK postcode to check broadband availability.
- **Address_Selector**: The Step_Card that displays addresses matching the entered postcode as selectable cards (not a dropdown).
- **Deal_Browser**: The Step_Card that displays available broadband plans as filterable cards after the user clicks "Get My Deals".
- **Filter_Bar**: A UI component within the Deal_Browser that allows filtering plans by speed tier, contract length, and plan type.
- **Addon_Picker**: The Step_Card that displays available add-ons as selectable cards.
- **TV_Picker**: The Step_Card that displays available TV packages as selectable cards.
- **SIM_Picker**: The Step_Card that displays available SIM plans as selectable cards.
- **Phone_Service_Picker**: The Step_Card that displays home phone/landline service options as selectable cards.
- **Pricing_Summary**: The final Step_Card that shows a full breakdown of all selected items and the total monthly price.
- **Broadband_Plan**: A broadband internet plan with attributes including name, download speed, upload speed, technology type, contract length, monthly price, and plan type (Core, Standard, Premium, Ultimate).
- **Addon**: An optional extra service that can be added to a broadband plan (e.g., WiFi Extender, BT Sport).
- **SIM_Plan**: A mobile SIM plan that can be bundled with broadband.
- **TV_Package**: A television bundle that can be added to the broadband order.
- **Home_Phone_Service**: A landline/home phone option that can be included in the broadband order.
- **User_Selection**: The accumulated state of all choices the user has made across all steps.
- **Database**: The Supabase PostgreSQL database that stores all broadband-related tables and seed data.
- **Backend**: The Java Spring Boot backend service that exposes REST API endpoints for the broadband purchase journey.
- **Plan_Addon_Compatibility**: A junction table that defines which add-ons are available for which broadband plan types (Core, Standard, Premium, Ultimate).

## Requirements

### Requirement 1: Step-by-Step Journey Structure

**User Story:** As a customer, I want to complete my broadband purchase through a clear step-by-step flow, so that I am not overwhelmed by too many choices at once.

#### Acceptance Criteria

1. THE Journey_Wizard SHALL render exactly one active Step_Card at a time while keeping completed steps visible above in a collapsed/summary state.
2. THE Journey_Wizard SHALL present steps in the following fixed order: Postcode_Input, Address_Selector, Deal_Browser, Addon_Picker, TV_Picker, SIM_Picker, Phone_Service_Picker, Pricing_Summary.
3. WHEN the user completes a selection in the current Step_Card, THE Journey_Wizard SHALL automatically advance to the next Step_Card within 300ms.
4. THE Journey_Wizard SHALL allow the user to click on any completed step to go back and change a previous selection.
5. WHEN the user changes a selection in a previous step, THE Journey_Wizard SHALL reset all subsequent steps to their unselected state.

### Requirement 2: Postcode Entry

**User Story:** As a customer, I want to enter my postcode to check broadband availability, so that I only see plans available at my address.

#### Acceptance Criteria

1. THE Postcode_Input SHALL display a text input field with a "Find Address" submit button.
2. THE Postcode_Input SHALL validate that the entered postcode is between 5 and 8 characters before submission.
3. IF the postcode is invalid, THEN THE Postcode_Input SHALL display an inline error message describing the validation failure.
4. WHEN the user submits a valid postcode, THE Postcode_Input SHALL call the GET /api/broadband/addresses endpoint with the postcode as a query parameter.
5. WHILE the address lookup is in progress, THE Postcode_Input SHALL display a loading indicator and disable the submit button.
6. IF the address lookup returns zero results, THEN THE Postcode_Input SHALL display a message stating no addresses were found for the entered postcode.

### Requirement 3: Address Selection

**User Story:** As a customer, I want to select my address from a list of cards, so that I can confirm my exact location for broadband availability.

#### Acceptance Criteria

1. THE Address_Selector SHALL display each address returned by the address lookup as a selectable card (not a dropdown).
2. WHEN the user selects an address card, THE Address_Selector SHALL visually highlight the selected card with a distinct border or background colour.
3. WHEN the user selects an address card, THE Address_Selector SHALL display a "Get My Deals" button.
4. WHEN the user clicks "Get My Deals", THE Address_Selector SHALL trigger an eligibility check by calling POST /api/broadband/eligibility with the selected UPRN.
5. WHEN the user clicks "Get My Deals", THE Address_Selector SHALL fetch available plans by calling POST /api/broadband/products with the selected UPRN, which uses the address technology flags (technology_copper, technology_fttp, technology_sogea) to filter plans by compatible technology.
6. WHILE the deals are loading, THE Address_Selector SHALL display a loading indicator and disable the "Get My Deals" button.
7. WHEN the deals have loaded successfully, THE Journey_Wizard SHALL store the selected UPRN and advance to the Deal_Browser step.
8. IF the address lookup returns more than 10 addresses, THEN THE Address_Selector SHALL display a scrollable list with a maximum visible height.

### Requirement 4: Broadband Deal Selection

**User Story:** As a customer, I want to browse and filter available broadband deals displayed as cards, so that I can choose the plan that suits my needs.

#### Acceptance Criteria

1. THE Deal_Browser SHALL display each available Broadband_Plan as a card showing the plan name, download speed, upload speed, technology type, contract length, monthly price, and promotional label (when present).
2. THE Deal_Browser SHALL sort plans by monthly price in ascending order by default.
3. THE Filter_Bar SHALL allow filtering plans by speed tier (Fibre, Superfast, Ultrafast), contract length (12 months, 24 months), and plan type (Core, Standard, Premium, Ultimate).
4. WHEN the user applies a filter, THE Deal_Browser SHALL update the displayed plans within 200ms to show only matching plans.
5. WHEN no plans match the applied filters, THE Deal_Browser SHALL display a message stating no plans match the selected filters and suggest clearing filters.
6. WHEN the user selects a Broadband_Plan card, THE Deal_Browser SHALL visually highlight the selected card and advance to the Addon_Picker step.
7. THE Deal_Browser SHALL display the total number of available plans matching the current filters.
8. THE Deal_Browser SHALL only display Broadband_Plans whose technology_type is compatible with the technologies available at the selected address.
9. THE Backend SHALL determine technology compatibility using the following mapping: SOGEA plans require technology_sogea=true OR technology_copper=true; FTTC plans require technology_sogea=true OR technology_copper=true; FTTP plans require technology_fttp=true.

### Requirement 5: Add-on Selection

**User Story:** As a customer, I want to select optional add-ons that are relevant to my chosen broadband plan, so that I can enhance my package with compatible extras.

#### Acceptance Criteria

1. THE Addon_Picker SHALL fetch available add-ons by calling GET /api/broadband/addons with the selected Broadband_Plan plan type as a query parameter (e.g., GET /api/broadband/addons?planType=Premium).
2. THE Addon_Picker SHALL display only add-ons that are compatible with the selected Broadband_Plan plan type.
3. THE Addon_Picker SHALL display each compatible Addon as a selectable card showing the add-on name, description, and monthly price.
4. THE Addon_Picker SHALL allow the user to select zero or more add-ons simultaneously.
5. WHEN the user selects or deselects an Addon card, THE Addon_Picker SHALL visually toggle the selected state of that card.
6. THE Addon_Picker SHALL display a running subtotal of selected add-on costs.
7. THE Addon_Picker SHALL provide a "Continue" button to advance to the TV_Picker step.
8. THE Addon_Picker SHALL allow the user to skip add-on selection by clicking a "Skip" or "Continue without add-ons" option.
9. WHEN the user goes back and changes the selected Broadband_Plan, THE Addon_Picker SHALL clear previously selected add-ons and re-fetch the compatible add-ons for the new plan type.

### Requirement 6: TV Package Selection

**User Story:** As a customer, I want to choose a TV package displayed as a card, so that I can bundle television with my broadband.

#### Acceptance Criteria

1. THE TV_Picker SHALL display available TV packages as selectable cards showing the package name, description, and monthly price.
2. THE TV_Picker SHALL allow the user to select at most one TV_Package.
3. WHEN the user selects a TV_Package card, THE TV_Picker SHALL visually highlight the selected card.
4. THE TV_Picker SHALL provide a "Continue" button to advance to the SIM_Picker step.
5. THE TV_Picker SHALL allow the user to skip TV package selection by clicking a "Skip" or "No TV package" option.

### Requirement 7: SIM Plan Selection

**User Story:** As a customer, I want to choose a SIM plan displayed as a card, so that I can bundle mobile with my broadband.

#### Acceptance Criteria

1. THE SIM_Picker SHALL display available SIM plans as selectable cards showing the plan name, data allowance or unlimited status, maximum speed, description, and monthly price.
2. THE SIM_Picker SHALL allow the user to select at most one SIM_Plan.
3. WHEN the user selects a SIM_Plan card, THE SIM_Picker SHALL visually highlight the selected card.
4. THE SIM_Picker SHALL provide a "Continue" button to advance to the Phone_Service_Picker step.
5. THE SIM_Picker SHALL allow the user to skip SIM plan selection by clicking a "Skip" or "No SIM plan" option.

### Requirement 8: Home Phone Service Selection

**User Story:** As a customer, I want to choose home phone services displayed as cards, so that I can add a landline to my broadband package.

#### Acceptance Criteria

1. THE Phone_Service_Picker SHALL display available home phone service options as selectable cards showing the service name, description, and monthly price.
2. THE Phone_Service_Picker SHALL allow the user to select at most one Home_Phone_Service.
3. WHEN the user selects a Home_Phone_Service card, THE Phone_Service_Picker SHALL visually highlight the selected card.
4. THE Phone_Service_Picker SHALL provide a "Continue" button to advance to the Pricing_Summary step.
5. THE Phone_Service_Picker SHALL allow the user to skip home phone selection by clicking a "Skip" or "No home phone" option.

### Requirement 9: Pricing Summary and Price Distribution

**User Story:** As a customer, I want to see a detailed price distribution of all my selections grouped by category, so that I understand exactly what I am paying for before confirming my order.

#### Acceptance Criteria

1. THE Pricing_Summary SHALL display a "Broadband" section showing the selected Broadband_Plan name, contract length, and monthly price.
2. THE Pricing_Summary SHALL display the Broadband_Plan activation fee as a separate one-time fee line item within the Broadband section when the activation fee is greater than zero.
3. THE Pricing_Summary SHALL display the router name and indicate whether the router is included at no extra cost or has an additional charge.
4. WHEN add-ons have been selected, THE Pricing_Summary SHALL display an "Add-ons" section listing each selected Addon name and monthly price, followed by an add-ons subtotal.
5. WHEN a TV_Package has been selected, THE Pricing_Summary SHALL display a "TV" section showing the TV_Package name and monthly price.
6. WHEN a SIM_Plan has been selected, THE Pricing_Summary SHALL display a "Mobile" section showing the SIM_Plan name, data allowance, and monthly price.
7. WHEN a Home_Phone_Service has been selected, THE Pricing_Summary SHALL display a "Home Phone" section showing the Home_Phone_Service name and monthly price.
8. THE Pricing_Summary SHALL display a "One-Time Fees" section listing all non-recurring charges (activation fee, router fee if applicable) with a one-time total.
9. THE Pricing_Summary SHALL display a "Monthly Total" line showing the sum of the Broadband_Plan monthly price, all selected Addon monthly prices, the TV_Package monthly price, the SIM_Plan monthly price, and the Home_Phone_Service monthly price.
10. THE Pricing_Summary SHALL display the contract length (e.g., "24-month contract") alongside the monthly total.
11. WHEN the selected Broadband_Plan has an out-of-contract price, THE Pricing_Summary SHALL display a notice stating the monthly price after the contract ends (e.g., "Price rises to £42.99/mo after 24 months").
12. THE Pricing_Summary SHALL visually separate each category section with clear headings and dividers so the user can distinguish individual costs.
13. THE Pricing_Summary SHALL provide a "Confirm Order" button to submit the complete selection.
14. WHEN the user clicks "Confirm Order", THE Pricing_Summary SHALL persist the User_Selection to the backend and navigate to the checkout or confirmation flow.

### Requirement 10: Card-Based UI Consistency

**User Story:** As a customer, I want a consistent card-based visual design across all steps, so that the journey feels cohesive and easy to follow.

#### Acceptance Criteria

1. THE Journey_Wizard SHALL render all selectable options (addresses, plans, add-ons, TV packages, SIM plans, phone services) as cards with consistent styling including border radius, padding, and hover effects.
2. WHEN the user hovers over a selectable card, THE Step_Card SHALL display a visual hover state (e.g., elevated shadow or border colour change).
3. THE Journey_Wizard SHALL display a step progress indicator showing the current step number, step name, and total number of steps (8).
4. THE Journey_Wizard SHALL render completed steps with a summary of the selection made (e.g., "Fibre 100 Standard — £34.99/mo") and an "Edit" affordance.

### Requirement 11: State Persistence

**User Story:** As a customer, I want my selections to be preserved if I navigate away and return, so that I do not lose my progress.

#### Acceptance Criteria

1. THE Journey_Wizard SHALL persist the current User_Selection state to browser session storage after each step completion.
2. WHEN the user returns to the journey page within the same browser session, THE Journey_Wizard SHALL restore the User_Selection from session storage and resume at the last completed step.
3. WHEN the user completes the order or explicitly starts a new journey, THE Journey_Wizard SHALL clear the persisted User_Selection from session storage.

### Requirement 12: Error Handling

**User Story:** As a customer, I want clear error messages when something goes wrong, so that I know what happened and what to do next.

#### Acceptance Criteria

1. IF the address lookup API call fails, THEN THE Postcode_Input SHALL display an error message stating the address lookup failed and offer a "Try Again" button.
2. IF the eligibility check returns ineligible, THEN THE Address_Selector SHALL display a message stating broadband is not available at the selected address.
3. IF the products API call fails, THEN THE Deal_Browser SHALL display an error message stating deals could not be loaded and offer a "Retry" button.
4. IF the add-ons API call fails, THEN THE Addon_Picker SHALL display an error message and allow the user to skip or retry.
5. IF the order submission fails, THEN THE Pricing_Summary SHALL display an error message and keep the "Confirm Order" button enabled for retry.

### Requirement 13: Responsive Layout

**User Story:** As a customer, I want the purchase journey to work well on mobile and desktop, so that I can complete my order on any device.

#### Acceptance Criteria

1. THE Journey_Wizard SHALL render Step_Cards in a single-column layout on viewports narrower than 768px.
2. THE Journey_Wizard SHALL render selectable option cards in a responsive grid that adjusts from 1 column on mobile to 2-3 columns on desktop viewports.
3. THE Filter_Bar SHALL collapse into a toggleable filter panel on viewports narrower than 768px.


### Requirement 14: Database Schema and Seed Data

**User Story:** As a developer, I want the database schema to support TV packages, home phone services, and plan-type-dependent add-ons with proper relational integrity, so that the purchase journey can query accurate, structured data.

#### Acceptance Criteria

1. THE Database SHALL contain a tv_packages table with columns: id (UUID, primary key), name (TEXT, unique), description (TEXT), monthly_price (NUMERIC), channel_count (INTEGER), is_active (BOOLEAN), and created_at (TIMESTAMPTZ).
2. THE Database SHALL contain a home_phone_services table with columns: id (UUID, primary key), name (TEXT, unique), description (TEXT), monthly_price (NUMERIC), includes_calls_to (TEXT), is_active (BOOLEAN), and created_at (TIMESTAMPTZ).
3. THE Database SHALL contain a plan_addon_compatibility junction table with columns: id (UUID, primary key), plan_type (TEXT, constrained to Core/Standard/Premium/Ultimate), addon_id (UUID, foreign key referencing addons), and a unique constraint on the combination of plan_type and addon_id.
4. THE Database SHALL alter the user_selections table to replace the selected_tv_package TEXT column with a selected_tv_package_id UUID column that references tv_packages(id).
5. THE Database SHALL alter the user_selections table to replace the selected_home_phone BOOLEAN column with a selected_home_phone_service_id UUID column that references home_phone_services(id).
6. THE Database SHALL contain seed data for tv_packages including at least three packages (e.g., Entertainment, Big Entertainment, VIP) with distinct channel counts and monthly prices.
7. THE Database SHALL contain seed data for home_phone_services including at least three options (e.g., Pay As You Go, Unlimited UK Calls, Unlimited UK & International Calls) with distinct monthly prices and includes_calls_to descriptions.
8. THE Database SHALL contain seed data in plan_addon_compatibility that maps each existing add-on to its compatible plan types, where WiFi-related add-ons are available across all plan types and premium add-ons (e.g., BT Sport, Static IP) are restricted to Premium and Ultimate plan types.

### Requirement 15: API Endpoints for Bundled Services

**User Story:** As a frontend developer, I want API endpoints for TV packages, SIM plans, home phone services, and plan-filtered add-ons, so that the purchase journey can fetch structured data for each step.

#### Acceptance Criteria

1. THE Backend SHALL expose a GET /api/broadband/tv-packages endpoint that returns all active TV packages with id, name, description, monthly_price, and channel_count.
2. THE Backend SHALL expose a GET /api/broadband/sim-plans endpoint that returns all active SIM plans with id, name, monthly_price, max_speed, description, and is_unlimited.
3. THE Backend SHALL expose a GET /api/broadband/home-phone-services endpoint that returns all active home phone services with id, name, description, monthly_price, and includes_calls_to.
4. THE Backend SHALL update the existing GET /api/broadband/addons endpoint to accept an optional planType query parameter.
5. WHEN the planType query parameter is provided, THE GET /api/broadband/addons endpoint SHALL return only add-ons that have a matching entry in the plan_addon_compatibility table for the specified plan type.
6. WHEN the planType query parameter is omitted, THE GET /api/broadband/addons endpoint SHALL return all active add-ons (preserving backward compatibility).
7. IF the planType query parameter contains an invalid value (not Core, Standard, Premium, or Ultimate), THEN THE GET /api/broadband/addons endpoint SHALL return a 400 Bad Request response with a descriptive error message.
