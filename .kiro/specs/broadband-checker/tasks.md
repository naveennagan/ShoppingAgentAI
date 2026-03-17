# Tasks: Broadband Checker

> POC approach: no third-party payment processors or external appointment APIs.
> All payment and appointment flows are built in-house as simple mock services backed by Supabase.

## Task List

- [x] 1. Database migration
  - [x] 1.1 Verify and apply broadband-schema.sql in Supabase SQL Editor (postcodes, addresses, broadband_plans, addons, sim_plans, user_selections)
  - [x] 1.2 Verify and apply broadband-cart-migration.sql in Supabase SQL Editor (cart_items extensions, orders extensions, appointments, subscriptions, checkout_sessions)
  - [x] 1.3 Verify and apply seed-broadband.sql in Supabase SQL Editor (postcodes, addresses, broadband plans, addons, SIM plans)

- [x] 2. Backend — Broadband models
  - [x] 2.1 Implement BroadbandAddress model (uprn, formattedAddress, town, postcode)
  - [x] 2.2 Implement BroadbandPlan model (planId, name, downloadSpeedMbps, uploadSpeedMbps, technologyType, contractLengthMonths, monthlyPrice, promotionalLabel)
  - [x] 2.3 Implement BroadbandRecommendation and AlternativePlan models
  - [x] 2.4 Implement BroadbandApiException and BroadbandAiException

- [x] 3. Backend — Broadband services (Supabase-backed, no EE API calls for POC)
  - [x] 3.1 Implement AddressLookupService — query postcodes + addresses tables in Supabase by postcode, return List<BroadbandAddress>
  - [x] 3.2 Implement EligibilityService — query addresses table by UPRN, return eligible=true if address exists, eligible=false otherwise
  - [x] 3.3 Implement ProductQualificationService — query broadband_plans table from Supabase, return List<BroadbandPlan> (all active plans for POC)
  - [x] 3.4 Implement BroadbandAiAdvisorService — build broadband prompt from plan list + user description, call existing GeminiService, parse BroadbandRecommendation; throw BroadbandAiException on error/timeout

- [x] 4. Backend — BroadbandController
  - [x] 4.1 Implement BroadbandController with GET /api/broadband/addresses?postcode={postcode}, POST /api/broadband/eligibility, POST /api/broadband/products, POST /api/broadband/recommend
  - [x] 4.2 Implement BroadbandExceptionHandler (@ControllerAdvice) mapping BroadbandApiException and BroadbandAiException to correct HTTP status codes

- [x] 5. Backend — Checkout models
  - [x] 5.1 Implement CheckoutSession model (sessionId, hasDevices, hasBroadbandService, devicePaymentDone, appointmentBooked, oneTimeTotal, monthlyTotal, status, deviceItems, serviceItems)
  - [x] 5.2 Implement Appointment model (appointmentId, orderId, preferredDate, preferredTimeSlot, confirmedDate, status)
  - [x] 5.3 Implement Subscription model (subscriptionId, orderId, status, monthlyPrice, startDate)
  - [x] 5.4 Implement AppointmentRequest model (sessionId, preferredDate, preferredTimeSlot)
  - [x] 5.5 Implement MockPaymentRequest model (sessionId, cardholderName, last4Digits) — no real card processing

- [x] 6. Backend — Checkout services (all in-house, no third-party)
  - [x] 6.1 Implement CheckoutService:
    - buildCheckoutSession — reads cart_items from Supabase, splits by item_type, calculates one_time_total and monthly_total, writes checkout_sessions row
    - processMockDevicePayment — marks device_payment_done=true in checkout_sessions, creates device order row in orders table, clears device items from cart
    - bookAppointment — validates service order exists, writes appointment row to appointments table, marks appointment_booked=true in checkout_sessions
    - activateSubscription — called when appointment status set to 'completed', writes subscription row with status='active'
  - [x] 6.2 Implement AppointmentService:
    - getAvailableSlots — returns hardcoded list of available dates (next 14 days, morning/afternoon slots) — no external calendar API
    - bookSlot — inserts appointment row into Supabase appointments table
    - updateStatus — updates appointment status in Supabase

- [x] 7. Backend — CheckoutController
  - [x] 7.1 Implement CheckoutController:
    - POST /api/checkout/session — build and return CheckoutSession
    - POST /api/checkout/device-payment — mock payment (accept any card details, always succeeds for POC)
    - POST /api/checkout/appointments — book installation slot
    - GET /api/checkout/appointments/{id} — get appointment by id
    - GET /api/checkout/subscriptions/{sessionId} — get subscription for session

- [x] 8. Frontend — TypeScript types
  - [x] 8.1 Create src/types/broadband.ts (BroadbandAddress, BroadbandPlan, AlternativePlan, BroadbandRecommendation)
  - [x] 8.2 Create src/types/checkout.ts (CheckoutSession, CheckoutCartItem, AppointmentRequest, Appointment, Subscription, ItemType, FulfillmentType)

- [x] 9. Frontend — apiClient broadband methods
  - [x] 9.1 Add getAddresses(postcode) to src/lib/api-client.ts
  - [x] 9.2 Add getPlansForAddress(uprn) to src/lib/api-client.ts (calls eligibility + products in sequence)
  - [x] 9.3 Add getBroadbandRecommendation(plans, usageDescription) to src/lib/api-client.ts

- [x] 10. Frontend — apiClient checkout methods
  - [x] 10.1 Add createCheckoutSession(sessionId) to src/lib/api-client.ts
  - [x] 10.2 Add processDevicePayment(sessionId, paymentDetails) to src/lib/api-client.ts
  - [x] 10.3 Add getAvailableSlots() to src/lib/api-client.ts
  - [x] 10.4 Add bookAppointment(request) to src/lib/api-client.ts
  - [x] 10.5 Add getAppointment(appointmentId) and getSubscription(sessionId) to src/lib/api-client.ts

- [x] 11. Frontend — CartContext updates
  - [x] 11.1 Extend CartItem type to include item_type, fulfillment_type, broadband_ref, display_name, display_summary, unit_price
  - [x] 11.2 Add addBroadbandServiceToCart(plan, userSelectionId) action to CartContext

- [x] 12. Frontend — Broadband page and components
  - [x] 12.1 Create src/components/broadband/PostcodeForm.tsx (postcode input, Find Address button, inline validation error)
  - [x] 12.2 Create src/components/broadband/AddressDropdown.tsx (dropdown of addresses returned from lookup)
  - [x] 12.3 Create src/components/broadband/PlanCard.tsx (plan name, speeds, tech type, contract length, monthly price, promo label, Add to Cart button)
  - [x] 12.4 Create src/components/broadband/PlanList.tsx (sorted by monthlyPrice ascending, count header)
  - [x] 12.5 Create src/components/broadband/BroadbandAdvisor.tsx (usage description textarea, submit button, top recommendation + 2 alternatives display)
  - [x] 12.6 Create src/app/broadband/page.tsx (orchestrates full flow: postcode → address → plans → AI advisor)

- [x] 13. Frontend — Checkout page and components
  - [x] 13.1 Create src/components/checkout/CartSummary.tsx (two sections: "Devices — pay today" and "Broadband — pay after installation", with totals)
  - [x] 13.2 Create src/components/checkout/DevicePaymentForm.tsx (cardholder name + last 4 digits mock form, shows one_time_total, always succeeds)
  - [x] 13.3 Create src/components/checkout/AppointmentPicker.tsx (date list for next 14 days + morning/afternoon toggle, no external calendar library needed)
  - [x] 13.4 Create src/components/checkout/OrderConfirmation.tsx ("iPhone ordered! Arrives in 2-3 days" + "Now schedule your broadband" CTA)
  - [x] 13.5 Create src/components/checkout/BroadbandConfirmation.tsx ("Installation booked for {date}. First payment of £{price}/month due after successful setup")
  - [x] 13.6 Create src/app/checkout/page.tsx (state machine: summary → device payment → order confirmation → appointment picker → broadband confirmation)

- [x] 14. Frontend — Navbar broadband link
  - [x] 14.1 Add "Broadband" link to existing Navbar component pointing to /broadband

- [x] 15. Property-based tests (jqwik)
  - [x] 15.1 Property 1: Postcode validation — any string length < 5 or > 8 is rejected without DB query
  - [x] 15.2 Property 2: Plan card renders all required fields — for any BroadbandPlan, rendered output contains name, speeds, tech type, contract, price
  - [x] 15.3 Property 3: Plan list sorted ascending — for any list of BroadbandPlan, sort produces non-decreasing monthlyPrice sequence
  - [x] 15.4 Property 4: Promotional label shown when present — for any BroadbandPlan with non-null promotionalLabel, rendered card contains it
  - [x] 15.5 Property 5: Plan count equals list size — for any list of BroadbandPlan, displayed count equals list.size()
  - [x] 15.6 Property 6: BroadbandAddress round-trip serialisation — serialize→deserialize produces equal object
  - [x] 15.7 Property 7: BroadbandPlan round-trip serialisation — serialize→deserialize produces equal object across all fields
  - [x] 15.8 Property 8: Cart split correctness — for any mixed cart, buildCheckoutSession partitions all items with no duplicates or drops
  - [x] 15.9 Property 9: One-time total — for any device cart items, one_time_total = sum(unit_price × quantity)
  - [x] 15.10 Property 10: Monthly total — for any broadband_service cart items, monthly_total = sum(monthly_price)
  - [x] 15.11 Property 11: Appointment requires service order — bookAppointment rejected when no service order exists
  - [x] 15.12 Property 12: Subscription only activates after completed appointment — activateSubscription on non-completed appointment never produces active subscription

- [x] 16. Unit tests
  - [x] 16.1 BroadbandControllerTest — MockMvc: happy path per endpoint, 400 on bad postcode, 404 on unknown postcode
  - [x] 16.2 AddressLookupServiceTest — known postcode returns addresses; unknown postcode returns empty list
  - [x] 16.3 ProductQualificationServiceTest — returns all active plans from Supabase mock
  - [x] 16.4 BroadbandAiAdvisorServiceTest — Gemini error returns fallback; timeout returns 504
  - [x] 16.5 CheckoutServiceTest — device-only cart, service-only cart, mixed cart; mock payment always succeeds; bookAppointment rejected without service order
  - [x] 16.6 AppointmentServiceTest — getAvailableSlots returns 14 days of slots; bookSlot creates appointment row; updateStatus transitions correctly
  - [x] 16.7 Frontend unit tests — PostcodeForm renders and validates; PlanCard renders all fields; CartSummary separates device and service sections
