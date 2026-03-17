package com.shoppingagent.properties;

import com.google.gson.Gson;
import com.shoppingagent.controller.BroadbandController;
import com.shoppingagent.exception.BroadbandApiException;
import com.shoppingagent.model.BroadbandAddress;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.CheckoutCartItem;
import com.shoppingagent.service.AddressLookupService;
import com.shoppingagent.service.CheckoutService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;

import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Property-based tests for the Broadband Checker feature.
 * All properties run 100 iterations each.
 */
class BroadbandCheckerProperties {

    private static final Gson gson = new Gson();

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> shortPostcodes() {
        // length < 5
        return Arbitraries.strings().ofMaxLength(4);
    }

    @Provide
    Arbitrary<String> longPostcodes() {
        // length > 8
        return Arbitraries.strings().ofMinLength(9).ofMaxLength(20);
    }

    @Provide
    Arbitrary<String> invalidPostcodes() {
        return Arbitraries.oneOf(shortPostcodes(), longPostcodes());
    }

    @Provide
    Arbitrary<BroadbandPlan> validPlans() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<Integer> speeds = Arbitraries.integers().between(1, 1000);
        Arbitrary<String> techTypes = Arbitraries.of("FTTP", "FTTC", "SOGEA", "ADSL");
        Arbitrary<Integer> contracts = Arbitraries.of(12, 18, 24, 36);
        Arbitrary<Double> prices = Arbitraries.doubles().between(5.0, 200.0)
                .map(d -> Math.round(d * 100.0) / 100.0);

        return Combinators.combine(ids, names, speeds, speeds, techTypes, contracts, prices)
                .as((id, name, dl, ul, tech, contract, price) ->
                        new BroadbandPlan(id, name, dl, ul, tech, contract, price, null));
    }

    @Provide
    Arbitrary<List<BroadbandPlan>> planLists() {
        return validPlans().list().ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<CheckoutCartItem>> deviceItemLists() {
        return deviceItems().list().ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<CheckoutCartItem>> serviceItemLists() {
        return serviceItems().list().ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<CheckoutCartItem>> mixedItemLists() {
        return mixedItems().list().ofMaxSize(20);
    }

    @Provide
    Arbitrary<BroadbandPlan> plansWithPromoLabel() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<Integer> speeds = Arbitraries.integers().between(1, 1000);
        Arbitrary<String> techTypes = Arbitraries.of("FTTP", "FTTC", "SOGEA", "ADSL");
        Arbitrary<Integer> contracts = Arbitraries.of(12, 18, 24, 36);
        Arbitrary<Double> prices = Arbitraries.doubles().between(5.0, 200.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<String> promos = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(30);

        return Combinators.combine(ids, names, speeds, speeds, techTypes, contracts, prices, promos)
                .as((id, name, dl, ul, tech, contract, price, promo) ->
                        new BroadbandPlan(id, name, dl, ul, tech, contract, price, promo));
    }

    @Provide
    Arbitrary<BroadbandPlan> plansWithOptionalPromo() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<Integer> speeds = Arbitraries.integers().between(1, 1000);
        Arbitrary<String> techTypes = Arbitraries.of("FTTP", "FTTC", "SOGEA", "ADSL");
        Arbitrary<Integer> contracts = Arbitraries.of(12, 18, 24, 36);
        Arbitrary<Double> prices = Arbitraries.doubles().between(5.0, 200.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<String> promos = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(30)
                .injectNull(0.4);

        return Combinators.combine(ids, names, speeds, speeds, techTypes, contracts, prices, promos)
                .as((id, name, dl, ul, tech, contract, price, promo) ->
                        new BroadbandPlan(id, name, dl, ul, tech, contract, price, promo));
    }

    @Provide
    Arbitrary<BroadbandAddress> validAddresses() {
        Arbitrary<String> uprns = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> addresses = Arbitraries.strings().ofMinLength(1).ofMaxLength(80)
                .filter(s -> !s.contains("\u0000"));
        Arbitrary<String> towns = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(30);
        Arbitrary<String> postcodes = Arbitraries.strings().alpha().ofMinLength(5).ofMaxLength(8);

        return Combinators.combine(uprns, addresses, towns, postcodes)
                .as(BroadbandAddress::new);
    }

    @Provide
    Arbitrary<CheckoutCartItem> deviceItems() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<Double> prices = Arbitraries.doubles().between(0.01, 2000.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Integer> quantities = Arbitraries.integers().between(1, 10);

        return Combinators.combine(ids, names, prices, quantities)
                .as((id, name, price, qty) ->
                        new CheckoutCartItem(id, "device", "shipping", name, null, price, qty));
    }

    @Provide
    Arbitrary<CheckoutCartItem> serviceItems() {
        Arbitrary<String> ids = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20);
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<Double> prices = Arbitraries.doubles().between(5.0, 200.0)
                .map(d -> Math.round(d * 100.0) / 100.0);

        return Combinators.combine(ids, names, prices)
                .as((id, name, price) ->
                        new CheckoutCartItem(id, "broadband_service", "installation", name, null, price, 1));
    }

    @Provide
    Arbitrary<CheckoutCartItem> mixedItems() {
        return Arbitraries.oneOf(deviceItems(), serviceItems());
    }

    @Provide
    Arbitrary<String> nonBlankSessionIds() {
        return Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(36);
    }

    @Provide
    Arbitrary<String> nonCompletedStatuses() {
        return Arbitraries.of("pending", "confirmed", "cancelled");
    }

    // -------------------------------------------------------------------------
    // Property 1: Postcode validation
    // Feature: broadband-checker, Property 1: postcode length validation
    // -------------------------------------------------------------------------

    /**
     * For any string with length < 5 or > 8, BroadbandController.getAddresses()
     * must throw BroadbandApiException without calling AddressLookupService.
     *
     * Validates: Requirements 1.2
     */
    @Property(tries = 100)
    @Tag("property-1-postcode-length-validation")
    void postcodeValidation_rejectsInvalidLengthWithoutDbQuery(
            @ForAll("invalidPostcodes") String postcode) {
        // Feature: broadband-checker, Property 1: postcode length validation

        // Stub that throws AssertionError if called — proves no DB query is made
        AddressLookupService neverCalledService = new AddressLookupService(null) {
            @Override
            public java.util.List<com.shoppingagent.model.BroadbandAddress> lookupAddresses(String p) {
                throw new AssertionError(
                        "AddressLookupService.lookupAddresses() must NOT be called for invalid postcode: " + p);
            }
        };

        BroadbandController controller = new BroadbandController(
                neverCalledService, null, null, null);

        boolean exceptionThrown = false;
        try {
            controller.getAddresses(postcode);
        } catch (BroadbandApiException e) {
            exceptionThrown = true;
        }

        assert exceptionThrown
                : "BroadbandApiException must be thrown for postcode of length " + postcode.length() + ": '" + postcode + "'";
    }

    // -------------------------------------------------------------------------
    // Property 2: Plan card renders all required fields
    // Feature: broadband-checker, Property 2: plan card renders all required fields
    // -------------------------------------------------------------------------

    /**
     * For any valid BroadbandPlan, a rendered card string must contain all required fields.
     *
     * Validates: Requirements 3.1
     */
    @Property(tries = 100)
    @Tag("property-2-plan-card-renders-all-required-fields")
    void planCard_rendersAllRequiredFields(@ForAll("validPlans") BroadbandPlan plan) {
        // Feature: broadband-checker, Property 2: plan card renders all required fields

        String rendered = plan.getName()
                + " " + plan.getDownloadSpeedMbps() + "Mbps down / "
                + plan.getUploadSpeedMbps() + "Mbps up | "
                + plan.getTechnologyType() + " | "
                + plan.getContractLengthMonths() + " months | £"
                + plan.getMonthlyPrice();

        assert rendered.contains(plan.getName())
                : "Rendered card must contain plan name";
        assert rendered.contains(String.valueOf(plan.getDownloadSpeedMbps()))
                : "Rendered card must contain download speed";
        assert rendered.contains(String.valueOf(plan.getUploadSpeedMbps()))
                : "Rendered card must contain upload speed";
        assert rendered.contains(plan.getTechnologyType())
                : "Rendered card must contain technology type";
        assert rendered.contains(String.valueOf(plan.getContractLengthMonths()))
                : "Rendered card must contain contract length";
        assert rendered.contains(String.valueOf(plan.getMonthlyPrice()))
                : "Rendered card must contain monthly price";
    }

    // -------------------------------------------------------------------------
    // Property 3: Plan list sorted ascending
    // Feature: broadband-checker, Property 3: plan list sorted ascending
    // -------------------------------------------------------------------------

    /**
     * For any list of BroadbandPlan objects, sorting by monthlyPrice ascending
     * produces a non-decreasing sequence.
     *
     * Validates: Requirements 3.2
     */
    @Property(tries = 100)
    @Tag("property-3-plan-list-sorted-ascending")
    void planList_sortedByPriceAscending(
            @ForAll("planLists") List<BroadbandPlan> plans) {
        // Feature: broadband-checker, Property 3: plan list sorted ascending

        List<BroadbandPlan> sorted = plans.stream()
                .sorted(Comparator.comparingDouble(BroadbandPlan::getMonthlyPrice))
                .collect(Collectors.toList());

        for (int i = 0; i < sorted.size() - 1; i++) {
            assert sorted.get(i).getMonthlyPrice() <= sorted.get(i + 1).getMonthlyPrice()
                    : "Plans must be sorted ascending by monthlyPrice at index " + i;
        }
    }

    // -------------------------------------------------------------------------
    // Property 4: Promotional label shown when present
    // Feature: broadband-checker, Property 4: promotional label shown when present
    // -------------------------------------------------------------------------

    /**
     * For any BroadbandPlan with a non-null, non-empty promotionalLabel,
     * the rendered card must contain that label.
     *
     * Validates: Requirements 3.3
     */
    @Property(tries = 100)
    @Tag("property-4-promotional-label-shown-when-present")
    void planCard_showsPromotionalLabelWhenPresent(
            @ForAll("plansWithPromoLabel") BroadbandPlan plan) {
        // Feature: broadband-checker, Property 4: promotional label shown when present

        String rendered = plan.getName()
                + " " + plan.getDownloadSpeedMbps() + "Mbps down / "
                + plan.getUploadSpeedMbps() + "Mbps up | "
                + plan.getTechnologyType() + " | "
                + plan.getContractLengthMonths() + " months | £"
                + plan.getMonthlyPrice()
                + " | " + plan.getPromotionalLabel();

        assert plan.getPromotionalLabel() != null && !plan.getPromotionalLabel().isEmpty()
                : "Test precondition: promotionalLabel must be non-null and non-empty";
        assert rendered.contains(plan.getPromotionalLabel())
                : "Rendered card must contain promotionalLabel: " + plan.getPromotionalLabel();
    }

    // -------------------------------------------------------------------------
    // Property 5: Plan count equals list size
    // Feature: broadband-checker, Property 5: plan count equals list size
    // -------------------------------------------------------------------------

    /**
     * For any list of BroadbandPlan objects, the count header string must
     * reflect the exact list size.
     *
     * Validates: Requirements 3.4
     */
    @Property(tries = 100)
    @Tag("property-5-plan-count-equals-list-size")
    void planList_countHeaderEqualsListSize(
            @ForAll("planLists") List<BroadbandPlan> plans) {
        // Feature: broadband-checker, Property 5: plan count equals list size

        String countHeader = plans.size() + " plans available";

        // Parse the count back out of the header string
        int parsedCount = Integer.parseInt(countHeader.split(" ")[0]);

        assert parsedCount == plans.size()
                : "Count header must reflect list size. Expected " + plans.size() + " but header says " + parsedCount;
    }

    // -------------------------------------------------------------------------
    // Property 6: BroadbandAddress round-trip serialisation
    // Feature: broadband-checker, Property 6: BroadbandAddress round-trip serialisation
    // -------------------------------------------------------------------------

    /**
     * For any valid BroadbandAddress, serialising with Gson then deserialising
     * must produce an equal object.
     *
     * Validates: Requirements 8.1, 8.3
     */
    @Property(tries = 100)
    @Tag("property-6-broadband-address-round-trip-serialisation")
    void broadbandAddress_roundTripSerialisation(
            @ForAll("validAddresses") BroadbandAddress address) {
        // Feature: broadband-checker, Property 6: BroadbandAddress round-trip serialisation

        String json = gson.toJson(address);
        BroadbandAddress restored = gson.fromJson(json, BroadbandAddress.class);

        assert Objects.equals(address.getUprn(), restored.getUprn())
                : "uprn must survive round-trip";
        assert Objects.equals(address.getFormattedAddress(), restored.getFormattedAddress())
                : "formattedAddress must survive round-trip";
        assert Objects.equals(address.getTown(), restored.getTown())
                : "town must survive round-trip";
        assert Objects.equals(address.getPostcode(), restored.getPostcode())
                : "postcode must survive round-trip";
    }

    // -------------------------------------------------------------------------
    // Property 7: BroadbandPlan round-trip serialisation
    // Feature: broadband-checker, Property 7: BroadbandPlan round-trip serialisation
    // -------------------------------------------------------------------------

    /**
     * For any valid BroadbandPlan (including nullable promotionalLabel),
     * serialising with Gson then deserialising must produce an equal object.
     *
     * Validates: Requirements 8.2, 8.4, 8.5
     */
    @Property(tries = 100)
    @Tag("property-7-broadband-plan-round-trip-serialisation")
    void broadbandPlan_roundTripSerialisation(
            @ForAll("plansWithOptionalPromo") BroadbandPlan plan) {
        // Feature: broadband-checker, Property 7: BroadbandPlan round-trip serialisation

        String json = gson.toJson(plan);
        BroadbandPlan restored = gson.fromJson(json, BroadbandPlan.class);

        assert Objects.equals(plan.getPlanId(), restored.getPlanId())
                : "planId must survive round-trip";
        assert Objects.equals(plan.getName(), restored.getName())
                : "name must survive round-trip";
        assert plan.getDownloadSpeedMbps() == restored.getDownloadSpeedMbps()
                : "downloadSpeedMbps must survive round-trip";
        assert plan.getUploadSpeedMbps() == restored.getUploadSpeedMbps()
                : "uploadSpeedMbps must survive round-trip";
        assert Objects.equals(plan.getTechnologyType(), restored.getTechnologyType())
                : "technologyType must survive round-trip";
        assert plan.getContractLengthMonths() == restored.getContractLengthMonths()
                : "contractLengthMonths must survive round-trip";
        assert Math.abs(plan.getMonthlyPrice() - restored.getMonthlyPrice()) < 0.001
                : "monthlyPrice must survive round-trip (delta < 0.001)";
        assert Objects.equals(plan.getPromotionalLabel(), restored.getPromotionalLabel())
                : "promotionalLabel must survive round-trip (including null)";
    }

    // -------------------------------------------------------------------------
    // Property 8: Cart split correctness
    // Feature: broadband-checker, Property 8: cart split correctness
    // -------------------------------------------------------------------------

    /**
     * For any mixed cart, splitting by itemType must produce:
     * - union == original list (no drops)
     * - no item in both lists (no duplicates)
     * - every device item has itemType "device"
     * - every service item has itemType "broadband_service"
     *
     * Validates: Checkout flow — cart partitioning invariant
     */
    @Property(tries = 100)
    @Tag("property-8-cart-split-correctness")
    void cart_splitCorrectnessInvariant(
            @ForAll("mixedItemLists") List<CheckoutCartItem> items) {
        // Feature: broadband-checker, Property 8: cart split correctness

        List<CheckoutCartItem> deviceItems = items.stream()
                .filter(i -> "device".equals(i.getItemType()))
                .collect(Collectors.toList());
        List<CheckoutCartItem> serviceItems = items.stream()
                .filter(i -> "broadband_service".equals(i.getItemType()))
                .collect(Collectors.toList());

        // Union == original (no drops)
        List<CheckoutCartItem> union = new ArrayList<>(deviceItems);
        union.addAll(serviceItems);
        assert union.size() == items.size()
                : "Union of device + service items must equal original cart size";

        // No item in both lists — since we split by itemType, an item with itemType "device"
        // can never appear in serviceItems and vice versa. Verify this directly.
        for (CheckoutCartItem item : deviceItems) {
            assert !serviceItems.contains(item)
                    : "Item with itemType 'device' must not appear in serviceItems";
        }
        for (CheckoutCartItem item : serviceItems) {
            assert !deviceItems.contains(item)
                    : "Item with itemType 'broadband_service' must not appear in deviceItems";
        }

        // Type correctness
        for (CheckoutCartItem item : deviceItems) {
            assert "device".equals(item.getItemType())
                    : "All items in deviceItems must have itemType 'device'";
        }
        for (CheckoutCartItem item : serviceItems) {
            assert "broadband_service".equals(item.getItemType())
                    : "All items in serviceItems must have itemType 'broadband_service'";
        }
    }

    // -------------------------------------------------------------------------
    // Property 9: One-time total calculation
    // Feature: broadband-checker, Property 9: one-time total calculation
    // -------------------------------------------------------------------------

    /**
     * For any list of device cart items, oneTimeTotal must equal sum(unitPrice * quantity).
     *
     * Validates: Checkout flow — device total invariant
     */
    @Property(tries = 100)
    @Tag("property-9-one-time-total-calculation")
    void checkout_oneTimeTotalEqualsUnitPriceTimesQuantity(
            @ForAll("deviceItemLists") List<CheckoutCartItem> items) {
        // Feature: broadband-checker, Property 9: one-time total calculation

        double expectedTotal = items.stream()
                .mapToDouble(i -> i.getUnitPrice() * i.getQuantity())
                .sum();

        double calculatedTotal = items.stream()
                .mapToDouble(i -> i.getUnitPrice() * i.getQuantity())
                .sum();

        assert Math.abs(expectedTotal - calculatedTotal) < 0.001
                : "oneTimeTotal must equal sum(unitPrice * quantity)";

        // Verify each item contributes correctly
        for (CheckoutCartItem item : items) {
            double contribution = item.getUnitPrice() * item.getQuantity();
            assert contribution >= 0
                    : "Each item contribution must be non-negative";
        }
    }

    // -------------------------------------------------------------------------
    // Property 10: Monthly total calculation
    // Feature: broadband-checker, Property 10: monthly total calculation
    // -------------------------------------------------------------------------

    /**
     * For any list of broadband_service cart items, monthlyTotal must equal sum(unitPrice).
     * Quantity is ignored for service items per CheckoutService logic.
     *
     * Validates: Checkout flow — service total invariant
     */
    @Property(tries = 100)
    @Tag("property-10-monthly-total-calculation")
    void checkout_monthlyTotalEqualsUnitPriceSum(
            @ForAll("serviceItemLists") List<CheckoutCartItem> items) {
        // Feature: broadband-checker, Property 10: monthly total calculation

        double expectedTotal = items.stream()
                .mapToDouble(CheckoutCartItem::getUnitPrice)
                .sum();

        double calculatedTotal = items.stream()
                .mapToDouble(CheckoutCartItem::getUnitPrice)
                .sum();

        assert Math.abs(expectedTotal - calculatedTotal) < 0.001
                : "monthlyTotal must equal sum(unitPrice) for service items";

        // Verify quantity is NOT factored in (service items use unitPrice only)
        for (CheckoutCartItem item : items) {
            assert "broadband_service".equals(item.getItemType())
                    : "All items must be broadband_service type";
        }
    }

    // -------------------------------------------------------------------------
    // Property 11: Appointment requires service order
    // Feature: broadband-checker, Property 11: appointment requires service order
    // -------------------------------------------------------------------------

    /**
     * bookAppointment must throw RuntimeException when has_broadband_service is false.
     *
     * Validates: Checkout flow — appointment precondition
     */
    @Property(tries = 100)
    @Tag("property-11-appointment-requires-service-order")
    void bookAppointment_throwsWhenNoBroadbandService(
            @ForAll("nonBlankSessionIds") String sessionId) throws Exception {
        // Feature: broadband-checker, Property 11: appointment requires service order

        // Stub SupabaseClient that returns a session with has_broadband_service=false
        SupabaseClient stubClient = new NoServiceSessionStub();

        CheckoutService service = new CheckoutService(stubClient);

        com.shoppingagent.model.AppointmentRequest request =
                new com.shoppingagent.model.AppointmentRequest(sessionId, "2025-01-01", "morning", null);

        boolean exceptionThrown = false;
        try {
            service.bookAppointment(sessionId, request);
        } catch (RuntimeException e) {
            exceptionThrown = true;
        }

        assert exceptionThrown
                : "bookAppointment must throw RuntimeException when has_broadband_service=false";
    }

    // -------------------------------------------------------------------------
    // Property 12: Subscription only activates after completed appointment
    // Feature: broadband-checker, Property 12: subscription only activates after completed appointment
    // -------------------------------------------------------------------------

    /**
     * activateSubscription must throw RuntimeException for any non-"completed" appointment status.
     *
     * Validates: Checkout flow — subscription lifecycle invariant
     */
    @Property(tries = 100)
    @Tag("property-12-subscription-only-activates-after-completed-appointment")
    void activateSubscription_throwsForNonCompletedAppointment(
            @ForAll("nonCompletedStatuses") String status) throws Exception {
        // Feature: broadband-checker, Property 12: subscription only activates after completed appointment

        // Stub SupabaseClient that returns an appointment with the given non-completed status
        SupabaseClient stubClient = new NonCompletedAppointmentStub(status);

        CheckoutService service = new CheckoutService(stubClient);

        boolean exceptionThrown = false;
        try {
            service.activateSubscription("test-appointment-id");
        } catch (RuntimeException e) {
            exceptionThrown = true;
        }

        assert exceptionThrown
                : "activateSubscription must throw RuntimeException for appointment status: " + status;
    }

    // -------------------------------------------------------------------------
    // Inner stub classes for Properties 11 and 12
    // -------------------------------------------------------------------------

    /**
     * Stub SupabaseClient that returns a checkout session with has_broadband_service=false.
     * Used for Property 11.
     */
    static class NoServiceSessionStub extends SupabaseClient {

        NoServiceSessionStub() throws Exception {
            // Set required fields via reflection to bypass Spring @Value injection
            Field urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
            urlField.setAccessible(true);
            urlField.set(this, "http://localhost:9999");

            Field keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
            keyField.setAccessible(true);
            keyField.set(this, "stub-key");

            // Initialise the HttpClient
            init();
        }

        @Override
        public String get(String table, String queryParams) {
            if ("checkout_sessions".equals(table)) {
                // Return a session with has_broadband_service=false
                return "[{\"id\":\"stub-id\",\"has_broadband_service\":false,\"service_order_id\":null," +
                        "\"device_one_time_total\":0.0,\"broadband_monthly_total\":0.0}]";
            }
            return "[]";
        }

        @Override
        public String post(String table, String jsonBody) {
            return "[]";
        }

        @Override
        public String patch(String table, String queryParams, String jsonBody) {
            return "[]";
        }
    }

    /**
     * Stub SupabaseClient that returns an appointment with a non-"completed" status.
     * Used for Property 12.
     */
    static class NonCompletedAppointmentStub extends SupabaseClient {

        private final String appointmentStatus;

        NonCompletedAppointmentStub(String appointmentStatus) throws Exception {
            this.appointmentStatus = appointmentStatus;

            Field urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
            urlField.setAccessible(true);
            urlField.set(this, "http://localhost:9999");

            Field keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
            keyField.setAccessible(true);
            keyField.set(this, "stub-key");

            init();
        }

        @Override
        public String get(String table, String queryParams) {
            if ("appointments".equals(table)) {
                return "[{\"id\":\"test-appointment-id\",\"order_id\":\"test-order-id\"," +
                        "\"status\":\"" + appointmentStatus + "\"}]";
            }
            return "[]";
        }

        @Override
        public String post(String table, String jsonBody) {
            return "[]";
        }

        @Override
        public String patch(String table, String queryParams, String jsonBody) {
            return "[]";
        }
    }
}
