package com.shoppingagent.properties;

import com.google.gson.Gson;
import com.shoppingagent.controller.BroadbandController;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.service.ProductQualificationService;
import com.shoppingagent.service.SupabaseClient;
import net.jqwik.api.*;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Property-based tests for the Broadband Purchase Journey feature.
 * Covers addon compatibility filtering, invalid plan type rejection,
 * and technology-based plan filtering.
 */
class BroadbandPurchaseJourneyProperties {

    private static final Gson gson = new Gson();
    private static final List<String> VALID_PLAN_TYPES = List.of("Core", "Standard", "Premium", "Ultimate");
    private static final List<String> PLAN_TECH_TYPES = List.of("SOGEA", "FTTC", "FTTP");

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> validPlanTypes() {
        return Arbitraries.of("Core", "Standard", "Premium", "Ultimate");
    }

    @Provide
    Arbitrary<String> invalidPlanTypes() {
        return Arbitraries.strings().ofMinLength(1).ofMaxLength(30)
                .filter(s -> !VALID_PLAN_TYPES.contains(s));
    }


    /**
     * Generates a random set of addon entries. Each addon has an id, name,
     * monthly_price, description, and a set of compatible plan types.
     */
    @Provide
    Arbitrary<List<AddonFixture>> addonFixtures() {
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(20);
        Arbitrary<Double> prices = Arbitraries.doubles().between(1.0, 50.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Set<String>> compatibleTypes = Arbitraries.of("Core", "Standard", "Premium", "Ultimate")
                .set().ofMinSize(1).ofMaxSize(4);

        return Combinators.combine(names, prices, compatibleTypes)
                .as((name, price, types) -> new AddonFixture(UUID.randomUUID().toString(), name, price, "Desc for " + name, types))
                .list().ofMinSize(1).ofMaxSize(10);
    }

    @Provide
    Arbitrary<TechFlags> technologyFlags() {
        return Combinators.combine(
                Arbitraries.of(true, false),
                Arbitraries.of(true, false),
                Arbitraries.of(true, false)
        ).as(TechFlags::new);
    }

    @Provide
    Arbitrary<List<PlanFixture>> planFixtures() {
        Arbitrary<String> techTypes = Arbitraries.of("SOGEA", "FTTC", "FTTP");
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(3).ofMaxLength(20);
        Arbitrary<Double> prices = Arbitraries.doubles().between(10.0, 100.0)
                .map(d -> Math.round(d * 100.0) / 100.0);

        return Combinators.combine(names, techTypes, prices)
                .as((name, tech, price) -> new PlanFixture(UUID.randomUUID().toString(), name, tech, price))
                .list().ofMinSize(1).ofMaxSize(15);
    }

    // -------------------------------------------------------------------------
    // Property 7: Addon Compatibility Filtering
    // Feature: broadband-purchase-journey, Property 7
    // -------------------------------------------------------------------------

    /**
     * For any valid plan type and any set of addons with defined compatibility,
     * getAddons(planType) returns only addons that have a matching
     * plan_addon_compatibility entry for that plan type.
     *
     * Validates: Requirements 5.2, 15.5
     */
    @Property(tries = 100)
    @Tag("property-7-addon-compatibility-filtering")
    void addonCompatibilityFiltering_returnsOnlyCompatibleAddons(
            @ForAll("validPlanTypes") String planType,
            @ForAll("addonFixtures") List<AddonFixture> addons) throws Exception {
        // Feature: broadband-purchase-journey, Property 7: addon compatibility filtering

        // Determine which addons are compatible with the requested planType
        List<AddonFixture> expectedCompatible = addons.stream()
                .filter(a -> a.compatiblePlanTypes.contains(planType))
                .collect(Collectors.toList());

        // Build stub SupabaseClient that returns the correct data
        SupabaseClient stub = createStub(new StubBehavior() {
            @Override
            public String get(String table, String queryParams) {
                if ("plan_addon_compatibility".equals(table) && queryParams.contains("plan_type=eq." + planType)) {
                    // Return only addons compatible with this plan type
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (AddonFixture a : expectedCompatible) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("addon_id", a.id);
                        Map<String, Object> addonObj = new LinkedHashMap<>();
                        addonObj.put("id", a.id);
                        addonObj.put("name", a.name);
                        addonObj.put("monthly_price", a.monthlyPrice);
                        addonObj.put("description", a.description);
                        row.put("addons", addonObj);
                        rows.add(row);
                    }
                    return gson.toJson(rows);
                }
                return "[]";
            }
        });

        ProductQualificationService service = new ProductQualificationService(stub);
        List<Map<String, Object>> result = service.getAddons(planType);

        // Verify: result size matches expected compatible addons
        assert result.size() == expectedCompatible.size()
                : "Expected " + expectedCompatible.size() + " addons for planType=" + planType
                + " but got " + result.size();

        // Verify: every returned addon is in the expected compatible set
        Set<String> expectedIds = expectedCompatible.stream()
                .map(a -> a.id).collect(Collectors.toSet());
        for (Map<String, Object> addon : result) {
            String id = (String) addon.get("id");
            assert expectedIds.contains(id)
                    : "Addon " + id + " should not be returned for planType=" + planType;
        }

        // Verify: no addon outside the compatible set is returned
        Set<String> returnedIds = result.stream()
                .map(a -> (String) a.get("id")).collect(Collectors.toSet());
        for (AddonFixture a : addons) {
            if (!a.compatiblePlanTypes.contains(planType)) {
                assert !returnedIds.contains(a.id)
                        : "Addon " + a.id + " (" + a.name + ") is not compatible with " + planType
                        + " but was returned";
            }
        }
    }

    // -------------------------------------------------------------------------
    // Property 8: Invalid Plan Type Rejection
    // Feature: broadband-purchase-journey, Property 8
    // -------------------------------------------------------------------------

    /**
     * For any string not in {Core, Standard, Premium, Ultimate},
     * the addons endpoint returns HTTP 400.
     *
     * Validates: Requirements 15.7
     */
    @Property(tries = 100)
    @Tag("property-8-invalid-plan-type-rejection")
    void invalidPlanTypeRejection_returns400(@ForAll("invalidPlanTypes") String invalidType) {
        // Feature: broadband-purchase-journey, Property 8: invalid plan type rejection

        // The controller validates planType before calling the service,
        // so we can pass null for all service dependencies
        BroadbandController controller = new BroadbandController(null, null, null, null, null, null);

        ResponseEntity<?> response = controller.getAddons(invalidType);

        assert response.getStatusCode().value() == 400
                : "Expected 400 for invalid planType '" + invalidType + "' but got " + response.getStatusCode().value();

        // Verify error body contains a descriptive message
        assert response.getBody() != null : "Response body must not be null for 400";
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        assert body.containsKey("error") : "400 response must contain 'error' key";
    }


    // -------------------------------------------------------------------------
    // Property 20: Technology-Based Plan Filtering
    // Feature: broadband-purchase-journey, Property 20
    // -------------------------------------------------------------------------

    /**
     * For any combination of technology flags (copper, fttp, sogea) and any set
     * of broadband plans, getPlans(uprn) returns only plans whose technology_type
     * is compatible with the address technology flags:
     * - SOGEA/FTTC when copper=true OR sogea=true
     * - FTTP when fttp=true
     *
     * Validates: Requirements 4.8, 4.9
     */
    @Property(tries = 100)
    @Tag("property-20-technology-based-plan-filtering")
    void technologyBasedPlanFiltering_returnsOnlyCompatiblePlans(
            @ForAll("technologyFlags") TechFlags flags,
            @ForAll("planFixtures") List<PlanFixture> allPlans) throws Exception {
        // Feature: broadband-purchase-journey, Property 20: technology-based plan filtering

        String testUprn = "TEST-UPRN-" + UUID.randomUUID();

        // Compute expected compatible technology types
        Set<String> compatibleTechTypes = new HashSet<>();
        if (flags.copper || flags.sogea) {
            compatibleTechTypes.add("SOGEA");
            compatibleTechTypes.add("FTTC");
        }
        if (flags.fttp) {
            compatibleTechTypes.add("FTTP");
        }

        // Expected plans: those whose technologyType is in the compatible set
        List<PlanFixture> expectedPlans = allPlans.stream()
                .filter(p -> compatibleTechTypes.contains(p.technologyType))
                .collect(Collectors.toList());

        // Build stub SupabaseClient
        SupabaseClient stub = createStub(new StubBehavior() {
            @Override
            public String get(String table, String queryParams) {
                if ("addresses".equals(table) && queryParams.contains("uprn=eq." + testUprn)) {
                    // Return address with the given technology flags
                    Map<String, Object> addr = new LinkedHashMap<>();
                    addr.put("technology_copper", flags.copper);
                    addr.put("technology_fttp", flags.fttp);
                    addr.put("technology_sogea", flags.sogea);
                    return gson.toJson(List.of(addr));
                }
                if ("broadband_plans".equals(table)) {
                    // Return only plans matching the technology_type filter in the query
                    // Parse the in.(...) filter from queryParams
                    List<PlanFixture> filtered = allPlans.stream()
                            .filter(p -> queryParams.contains(p.technologyType))
                            .collect(Collectors.toList());
                    List<Map<String, Object>> rows = new ArrayList<>();
                    for (PlanFixture p : filtered) {
                        Map<String, Object> row = new LinkedHashMap<>();
                        row.put("plan_ref", p.id);
                        row.put("name", p.name);
                        row.put("download_speed_mbps", 100);
                        row.put("upload_speed_mbps", 20);
                        row.put("plan_type", "Standard");
                        row.put("technology_type", p.technologyType);
                        row.put("contract_length_months", 24);
                        row.put("monthly_price", p.monthlyPrice);
                        row.put("promotional_label", null);
                        row.put("includes_router", true);
                        row.put("router_name", "Smart Hub");
                        row.put("speed_guarantee_mbps", 50);
                        row.put("activation_fee", 0.0);
                        row.put("out_of_contract_price", 0.0);
                        rows.add(row);
                    }
                    return gson.toJson(rows);
                }
                return "[]";
            }
        });

        ProductQualificationService service = new ProductQualificationService(stub);
        List<BroadbandPlan> result = service.getPlans(testUprn);

        if (compatibleTechTypes.isEmpty()) {
            // No technology flags set → expect empty result
            assert result.isEmpty()
                    : "Expected empty plan list when no technology flags are set, but got " + result.size();
            return;
        }

        // Verify: result size matches expected
        assert result.size() == expectedPlans.size()
                : "Expected " + expectedPlans.size() + " plans but got " + result.size()
                + " for flags copper=" + flags.copper + " fttp=" + flags.fttp + " sogea=" + flags.sogea;

        // Verify: every returned plan has a compatible technology type
        for (BroadbandPlan plan : result) {
            assert compatibleTechTypes.contains(plan.getTechnologyType())
                    : "Plan with technologyType=" + plan.getTechnologyType()
                    + " should not be returned for flags copper=" + flags.copper
                    + " fttp=" + flags.fttp + " sogea=" + flags.sogea;
        }

        // Verify: no plan with incompatible technology is returned
        Set<String> returnedIds = result.stream()
                .map(BroadbandPlan::getPlanId).collect(Collectors.toSet());
        for (PlanFixture p : allPlans) {
            if (!compatibleTechTypes.contains(p.technologyType)) {
                assert !returnedIds.contains(p.id)
                        : "Plan " + p.id + " (tech=" + p.technologyType
                        + ") is incompatible but was returned";
            }
        }
    }

    // -------------------------------------------------------------------------
    // Helper: SupabaseClient stub factory
    // -------------------------------------------------------------------------

    interface StubBehavior {
        String get(String table, String queryParams);
    }

    private static SupabaseClient createStub(StubBehavior behavior) throws Exception {
        SupabaseClient stub = new SupabaseClient() {
            @Override
            public String get(String table, String queryParams) {
                return behavior.get(table, queryParams);
            }

            @Override
            public String post(String table, String jsonBody) {
                return "[]";
            }

            @Override
            public String patch(String table, String queryParams, String jsonBody) {
                return "[]";
            }
        };

        // Set required fields via reflection to bypass Spring @Value injection
        Field urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(stub, "http://localhost:9999");

        Field keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(stub, "stub-key");

        return stub;
    }

    // -------------------------------------------------------------------------
    // Fixture classes
    // -------------------------------------------------------------------------

    static class AddonFixture {
        final String id;
        final String name;
        final double monthlyPrice;
        final String description;
        final Set<String> compatiblePlanTypes;

        AddonFixture(String id, String name, double monthlyPrice, String description, Set<String> compatiblePlanTypes) {
            this.id = id;
            this.name = name;
            this.monthlyPrice = monthlyPrice;
            this.description = description;
            this.compatiblePlanTypes = compatiblePlanTypes;
        }
    }

    static class TechFlags {
        final boolean copper;
        final boolean fttp;
        final boolean sogea;

        TechFlags(boolean copper, boolean fttp, boolean sogea) {
            this.copper = copper;
            this.fttp = fttp;
            this.sogea = sogea;
        }
    }

    static class PlanFixture {
        final String id;
        final String name;
        final String technologyType;
        final double monthlyPrice;

        PlanFixture(String id, String name, String technologyType, double monthlyPrice) {
            this.id = id;
            this.name = name;
            this.technologyType = technologyType;
            this.monthlyPrice = monthlyPrice;
        }
    }
}
