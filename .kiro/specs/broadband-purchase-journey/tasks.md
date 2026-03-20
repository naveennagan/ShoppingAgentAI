# Implementation Plan: Broadband Purchase Journey

## Overview

Transform the broadband purchase flow from a dropdown-based UI into a multi-step, card-based wizard. Implementation proceeds bottom-up: database schema and seed data first, then backend services and endpoints, then frontend types and API client, then the JourneyWizard orchestrator and each step component, and finally wiring everything together with the broadband page route.

## Tasks

- [x] 1. Database schema changes and seed data
  - [x] 1.1 Create migration SQL for new tables and altered table
    - Create `scripts/broadband-journey-migration.sql` containing:
    - `CREATE TABLE tv_packages` with columns: id (UUID PK), name (TEXT UNIQUE), description (TEXT), monthly_price (NUMERIC(10,2)), channel_count (INTEGER), is_active (BOOLEAN DEFAULT true), created_at (TIMESTAMPTZ DEFAULT now())
    - `CREATE TABLE home_phone_services` with columns: id (UUID PK), name (TEXT UNIQUE), description (TEXT), monthly_price (NUMERIC(10,2)), includes_calls_to (TEXT), is_active (BOOLEAN DEFAULT true), created_at (TIMESTAMPTZ DEFAULT now())
    - `CREATE TABLE plan_addon_compatibility` with columns: id (UUID PK), plan_type (TEXT CHECK IN Core/Standard/Premium/Ultimate), addon_id (UUID FK → addons), UNIQUE(plan_type, addon_id), plus indexes on plan_type and addon_id
    - `ALTER TABLE user_selections`: drop selected_tv_package and selected_home_phone columns, add selected_tv_package_id (UUID FK → tv_packages) and selected_home_phone_service_id (UUID FK → home_phone_services)
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

  - [x] 1.2 Create seed data SQL for TV packages, home phone services, and plan-addon compatibility
    - Add to `scripts/broadband-journey-migration.sql` (or a separate seed file):
    - Insert 3 TV packages: Entertainment (£0, 80 channels), Big Entertainment (£12, 150 channels), VIP (£25, 230 channels)
    - Insert 3 home phone services: Pay As You Go (£0), Unlimited UK Calls (£8), Unlimited UK & International (£12)
    - Insert plan_addon_compatibility rows: WiFi Extender, Complete WiFi, Norton Security, International Calls → all 4 plan types; BT Sport, EE TV, Static IP Address → Premium and Ultimate only
    - _Requirements: 14.6, 14.7, 14.8_

- [x] 2. Backend model classes
  - [x] 2.1 Create TvPackage, HomePhoneService, SimPlan, and UserSelectionPayload model classes
    - Create `shopping-agent-backend/src/main/java/com/shoppingagent/model/TvPackage.java` with fields: id, name, description, monthlyPrice, channelCount
    - Create `shopping-agent-backend/src/main/java/com/shoppingagent/model/HomePhoneService.java` with fields: id, name, description, monthlyPrice, includesCallsTo
    - Create `shopping-agent-backend/src/main/java/com/shoppingagent/model/SimPlan.java` with fields: id, name, monthlyPrice, maxSpeed, description, isUnlimited
    - Create `shopping-agent-backend/src/main/java/com/shoppingagent/model/UserSelectionPayload.java` with fields: sessionId, postcodeId, addressId, selectedPlanId, selectedAddonIds (List<String>), selectedTvPackageId, selectedSimPlanId, selectedHomePhoneServiceId, totalMonthlyPrice
    - Use Lombok @Data, @NoArgsConstructor, @AllArgsConstructor annotations consistent with existing models
    - _Requirements: 15.1, 15.2, 15.3, 9.14_

  - [x] 2.2 Extend BroadbandPlan model with new fields
    - Add to `shopping-agent-backend/src/main/java/com/shoppingagent/model/BroadbandPlan.java`: planType (String), includesRouter (boolean), routerName (String), speedGuaranteeMbps (int), activationFee (double), outOfContractPrice (double)
    - _Requirements: 4.1, 9.1, 9.2, 9.3, 9.11_

- [x] 3. Backend services and endpoints
  - [x] 3.1 Create BundledProductService
    - Create `shopping-agent-backend/src/main/java/com/shoppingagent/service/BundledProductService.java`
    - Inject SupabaseClient, implement getTvPackages(), getSimPlans(), getHomePhoneServices()
    - Each method queries the respective Supabase table for active records and maps snake_case to camelCase
    - Follow the same pattern as existing services (e.g., ProductQualificationService)
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 3.2 Update ProductQualificationService.getAddons() for planType filtering
    - Modify `shopping-agent-backend/src/main/java/com/shoppingagent/service/ProductQualificationService.java`
    - Change getAddons() signature to accept an optional planType parameter
    - When planType is provided, query plan_addon_compatibility joined with addons filtered by plan_type
    - When planType is null, query addons table directly (backward compatible)
    - _Requirements: 15.4, 15.5, 15.6_

  - [x] 3.3 Update ProductQualificationService.getPlans() to select new columns and filter by address technology
    - Update the Supabase query in getPlans() to include plan_type, includes_router, router_name, speed_guarantee_mbps, activation_fee, out_of_contract_price
    - Map the new snake_case columns to camelCase in the response
    - Add technology-based filtering logic:
      - Look up the address by UPRN from the `addresses` table to get technology_copper, technology_fttp, technology_sogea flags
      - Build a list of compatible technology types: if technology_copper=true OR technology_sogea=true → include SOGEA and FTTC; if technology_fttp=true → include FTTP
      - Filter the broadband_plans query with `technology_type=in.(compatible_types)`
      - Return an empty list if the address is not found or no technology flags are set
    - _Requirements: 4.1, 4.8, 4.9, 9.1_

  - [x] 3.4 Add new endpoints to BroadbandController
    - Add GET /api/broadband/tv-packages → delegates to bundledProductService.getTvPackages()
    - Add GET /api/broadband/sim-plans → delegates to bundledProductService.getSimPlans()
    - Add GET /api/broadband/home-phone-services → delegates to bundledProductService.getHomePhoneServices()
    - Update GET /api/broadband/addons to accept optional planType query param with validation (400 for invalid values)
    - Inject BundledProductService into BroadbandController
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.7_

  - [x] 3.5 Write property tests for addon compatibility filtering and technology-based plan filtering (backend, jqwik)
    - Create `shopping-agent-backend/src/test/java/com/shoppingagent/properties/BroadbandPurchaseJourneyProperties.java`
    - **Property 7: Addon Compatibility Filtering** — For any valid plan type, getAddons(planType) returns only addons with a matching plan_addon_compatibility entry
    - **Validates: Requirements 5.2, 15.5**
    - **Property 8: Invalid Plan Type Rejection** — For any string not in {Core, Standard, Premium, Ultimate}, the addons endpoint returns 400
    - **Validates: Requirements 15.7**
    - **Property 20: Technology-Based Plan Filtering** — For any combination of technology flags (copper, fttp, sogea), getPlans(uprn) returns only plans whose technology_type is compatible: SOGEA/FTTC when copper=true OR sogea=true; FTTP when fttp=true
    - **Validates: Requirements 4.8, 4.9**

  - [ ]* 3.6 Write unit tests for BundledProductService and updated BroadbandController
    - Create `shopping-agent-backend/src/test/java/com/shoppingagent/service/BundledProductServiceTest.java`
    - Test getTvPackages(), getSimPlans(), getHomePhoneServices() return correct data and handle empty results
    - Add tests to `shopping-agent-backend/src/test/java/com/shoppingagent/controller/BroadbandControllerTest.java` for new endpoints and planType validation
    - Test getAddons(null) returns all addons, getAddons("Premium") returns filtered addons
    - Test getPlans() technology filtering: verify Swansea UPRN (copper only) returns SOGEA/FTTC plans but not FTTP; London UPRN (FTTP+SOGEA) returns all plan types; use seed data addresses with varied technology flags for coverage
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 4.8, 4.9_

- [x] 4. Checkpoint — Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Frontend types and API client
  - [x] 5.1 Extend frontend TypeScript interfaces
    - Update `src/types/broadband.ts`:
    - Add TvPackage interface (id, name, description, monthlyPrice, channelCount)
    - Add SimPlan interface (id, name, monthlyPrice, maxSpeed, description, isUnlimited)
    - Add HomePhoneService interface (id, name, description, monthlyPrice, includesCallsTo)
    - Extend existing BroadbandPlan interface with: planType, includesRouter, routerName, speedGuaranteeMbps, activationFee, outOfContractPrice
    - Add UserSelectionPayload interface for order submission
    - Add JourneyState interface and action types for useReducer
    - _Requirements: 4.1, 6.1, 7.1, 8.1, 9.14_

  - [x] 5.2 Add API client methods
    - Update `src/lib/api-client.ts`:
    - Add getTvPackages(): fetches GET /api/broadband/tv-packages
    - Add getSimPlans(): fetches GET /api/broadband/sim-plans
    - Add getHomePhoneServices(): fetches GET /api/broadband/home-phone-services
    - Update getAddons() to accept optional planType param, appending ?planType= when provided
    - Add submitUserSelection(payload): POST /api/broadband/user-selections
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 9.14_

- [x] 6. Frontend core components — JourneyWizard, StepProgressBar, StepCard
  - [x] 6.1 Create JourneyWizard component with useReducer and session storage
    - Create `src/components/broadband/JourneyWizard.tsx`
    - Implement useReducer with JourneyState and all action types (SET_POSTCODE, SET_ADDRESSES, SELECT_ADDRESS, SET_PLANS, SELECT_PLAN, SET_ADDONS_LIST, TOGGLE_ADDON, SET_TV_PACKAGES, SELECT_TV_PACKAGE, SET_SIM_PLANS, SELECT_SIM_PLAN, SET_HOME_PHONE_SERVICES, SELECT_HOME_PHONE_SERVICE, GO_TO_STEP, RESET_FROM_STEP, SET_LOADING, SET_ERROR, RESTORE_STATE)
    - RESET_FROM_STEP clears all selections from step N+1 onward
    - Persist state to sessionStorage under key `broadband-journey-state` after each step completion
    - On mount, restore state from sessionStorage via RESTORE_STATE action
    - On order confirmation, clear sessionStorage
    - Render one active StepCard at a time, completed steps shown collapsed above
    - Auto-advance to next step within 300ms of selection
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 11.1, 11.2, 11.3_

  - [x] 6.2 Create StepProgressBar component
    - Create `src/components/broadband/StepProgressBar.tsx`
    - Display current step number, step name, and total steps (8)
    - Use inline styles consistent with existing codebase
    - _Requirements: 10.3_

  - [x] 6.3 Create StepCard wrapper component
    - Create `src/components/broadband/StepCard.tsx`
    - Two modes: active (shows full content) and collapsed (shows summary + Edit affordance)
    - Collapsed mode shows a summary of the selection made (e.g., "Fibre 100 Standard — £34.99/mo")
    - Clicking a collapsed card triggers GO_TO_STEP to navigate back
    - Consistent card styling: border radius, padding, hover effects
    - _Requirements: 10.1, 10.2, 10.4, 1.4_

  - [x] 6.4 Write property tests for journey state management (frontend, fast-check)
    - Create `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 1: Single Active Step Invariant** — For any currentStep N, exactly one step is active, steps < N are completed, steps > N are upcoming
    - **Validates: Requirements 1.1**
    - **Property 2: Reset From Step Clears Subsequent Selections** — For any state where user navigates back to step N, all selections for steps N+1..7 are reset to null/empty
    - **Validates: Requirements 1.4, 1.5, 5.9**
    - **Property 17: Session Storage Round Trip** — For any valid journey state, serialize then deserialize produces equal state
    - **Validates: Requirements 11.1, 11.2**
    - **Property 18: Step Progress Indicator Accuracy** — For any currentStep N, indicator shows step N+1, correct name, total 8
    - **Validates: Requirements 10.3**

- [x] 7. Frontend step components — Postcode and Address
  - [x] 7.1 Create PostcodeInput step component
    - Create `src/components/broadband/PostcodeInput.tsx`
    - Text input + "Find Address" button
    - Validate postcode is 5–8 characters before submission
    - Show inline error for invalid postcode
    - Call GET /api/broadband/addresses on submit
    - Show loading indicator and disable button during API call
    - Show "No addresses found" when API returns empty
    - Show "Address lookup failed" + "Try Again" on API error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 12.1_

  - [x] 7.2 Create AddressSelector step component
    - Create `src/components/broadband/AddressSelector.tsx`
    - Render each address as a selectable card (not dropdown)
    - Highlight selected card with distinct border/background
    - Show "Get My Deals" button after selection
    - On "Get My Deals": call POST /api/broadband/eligibility and POST /api/broadband/products
    - Show loading indicator and disable button during API calls
    - Show scrollable list with max height when > 10 addresses
    - Show ineligible error message when eligibility check fails
    - Store UPRN and advance to DealBrowser on success
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 12.2_

  - [x] 7.3 Write property test for postcode validation (frontend, fast-check)
    - Add to `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 3: Postcode Validation** — For any string, validation returns true iff trimmed length is 5–8 characters
    - **Validates: Requirements 2.2**

- [x] 8. Frontend step components — DealBrowser and FilterBar
  - [x] 8.1 Create FilterBar component
    - Create `src/components/broadband/FilterBar.tsx`
    - Filter controls for speed tier (Fibre, Superfast, Ultrafast), contract length (12, 24 months), plan type (Core, Standard, Premium, Ultimate)
    - Collapse into toggleable panel on viewports < 768px
    - Emit filter changes to parent
    - _Requirements: 4.3, 13.3_

  - [x] 8.2 Create DealBrowser step component
    - Create `src/components/broadband/DealBrowser.tsx`
    - Display plans as cards showing: name, download speed, upload speed, technology type, contract length, monthly price, promotional label
    - Default sort by monthly price ascending
    - Integrate FilterBar; filter plans client-side within 200ms
    - Show total count of matching plans
    - Show "No plans match" message with clear-filters suggestion when filtered to zero
    - On plan card selection: highlight card and advance to AddonPicker
    - Responsive grid: 1 column mobile, 2–3 columns desktop
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.3, 13.2_

  - [x] 8.3 Write property tests for plan sorting and filtering (frontend, fast-check)
    - Add to `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 4: Plan Sort Order** — For any plan list, default sort produces ascending monthlyPrice
    - **Validates: Requirements 4.2**
    - **Property 5: Plan Filter Correctness** — For any plans + filters, every result matches all criteria and no excluded plan matches all criteria
    - **Validates: Requirements 4.3, 4.7**
    - **Property 6: Plan Card Contains Required Fields** — For any plan, rendered card contains all required fields
    - **Validates: Requirements 4.1**

- [x] 9. Checkpoint — Core journey steps complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Frontend step components — AddonPicker
  - [x] 10.1 Create AddonPicker step component
    - Create `src/components/broadband/AddonPicker.tsx`
    - Fetch addons via GET /api/broadband/addons?planType={selectedPlan.planType}
    - Display each addon as a selectable card: name, description, monthly price
    - Allow multi-select (zero or more); toggle selected state on click
    - Show running subtotal of selected addon costs
    - "Continue" button to advance to TvPicker; "Skip" option to continue without addons
    - Clear selected addons and re-fetch when plan changes (RESET_FROM_STEP handles this)
    - Show error + Skip/Retry on API failure
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 12.4_

  - [ ]* 10.2 Write property tests for addon selection (frontend, fast-check)
    - Add to `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 9: Addon Multi-Select Toggle** — For any toggle sequence, selected set equals symmetric difference (toggling twice restores original)
    - **Validates: Requirements 5.4**
    - **Property 10: Addon Subtotal Accuracy** — For any set of selected addons, subtotal equals sum of monthlyPrice to 2 decimal places
    - **Validates: Requirements 5.6**

- [x] 11. Frontend step components — TvPicker, SimPicker, PhoneServicePicker
  - [x] 11.1 Create TvPicker step component
    - Create `src/components/broadband/TvPicker.tsx`
    - Fetch TV packages via GET /api/broadband/tv-packages
    - Display as selectable cards: name, description, monthly price, channel count
    - Single-select (at most one); highlight selected card
    - "Continue" button + "Skip" / "No TV package" option
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 11.2 Create SimPicker step component
    - Create `src/components/broadband/SimPicker.tsx`
    - Fetch SIM plans via GET /api/broadband/sim-plans
    - Display as selectable cards: name, data allowance/unlimited, max speed, description, monthly price
    - Single-select; highlight selected card
    - "Continue" button + "Skip" / "No SIM plan" option
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 11.3 Create PhoneServicePicker step component
    - Create `src/components/broadband/PhoneServicePicker.tsx`
    - Fetch home phone services via GET /api/broadband/home-phone-services
    - Display as selectable cards: name, description, monthly price
    - Single-select; highlight selected card
    - "Continue" button + "Skip" / "No home phone" option
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 11.4 Write property tests for optional service selection (frontend, fast-check)
    - Add to `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 11: Single-Select Invariant for Optional Services** — For any selection sequence on TV/SIM/phone, state never has more than one selected per category
    - **Validates: Requirements 6.2, 7.2, 8.2**
    - **Property 12: Optional Service Card Contains Required Fields** — For any TV/SIM/phone item, rendered card contains all required fields per spec
    - **Validates: Requirements 6.1, 7.1, 8.1**

- [x] 12. Frontend step component — PricingSummary
  - [x] 12.1 Create PricingSummary step component
    - Create `src/components/broadband/PricingSummary.tsx`
    - Broadband section: plan name, contract length, monthly price, router name, router inclusion status
    - Activation fee as separate one-time line item when > 0
    - Add-ons section (if any selected): each addon name + price, subtotal
    - TV section (if selected): package name + price
    - Mobile section (if selected): SIM plan name, data allowance, price
    - Home Phone section (if selected): service name + price
    - One-Time Fees section: activation fee, router fee if not included, one-time total
    - Monthly Total: sum of all monthly prices with contract length label
    - Out-of-contract price notice when applicable
    - Visual separation between sections with headings and dividers
    - "Confirm Order" button → calls submitUserSelection API, navigates to checkout/confirmation
    - Show error + keep button enabled on submission failure
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 9.10, 9.11, 9.12, 9.13, 9.14, 12.5_

  - [x] 12.2 Write property tests for pricing calculations (frontend, fast-check)
    - Add to `src/components/__tests__/broadband-journey-properties.test.ts`
    - **Property 13: Monthly Total Calculation** — For any selection combo, monthlyTotal = plan + addons + tv + sim + phone
    - **Validates: Requirements 9.9**
    - **Property 14: One-Time Fees Calculation** — For any plan, oneTimeTotal = sum of non-zero one-time charges
    - **Validates: Requirements 9.2, 9.8**
    - **Property 15: Pricing Summary Broadband Section Completeness** — For any plan, summary contains plan name, contract length, price, router info, out-of-contract notice when applicable
    - **Validates: Requirements 9.1, 9.3, 9.11**
    - **Property 16: Pricing Summary Optional Sections** — Sections appear iff corresponding items are selected, with correct details
    - **Validates: Requirements 9.4, 9.5, 9.6, 9.7**

- [x] 13. Wire up broadband page route and responsive layout
  - [x] 13.1 Update broadband page to use JourneyWizard
    - Update `src/app/broadband/page.tsx` to render the JourneyWizard component
    - Single-column layout on viewports < 768px, wider layout on desktop
    - _Requirements: 1.1, 1.2, 13.1, 13.2_

- [x] 14. Final checkpoint — All components integrated
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests use fast-check (frontend) and jqwik (backend)
- Unit tests complement property tests for edge cases and integration points
- All frontend components use inline styles consistent with the existing codebase
