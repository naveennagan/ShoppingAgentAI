package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Bundle;
import com.shoppingagent.model.BundleItem;
import com.shoppingagent.model.Promotion;
import com.sun.net.httpserver.HttpServer;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.AfterContainer;
import net.jqwik.api.lifecycle.BeforeContainer;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Type;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Property 9: Promotion and bundle persistence round-trip
 *
 * For any valid promotion object (with name, discount_type constrained to
 * 'percentage' or 'fixed_amount', discount_value, and optional fields),
 * inserting it and querying it back by ID should produce an equivalent object.
 * The same round-trip property applies to bundle objects.
 *
 * Validates: Requirements 7.1, 7.3
 */
class PromotionBundlePersistenceProperties {

    private static HttpServer server;
    private static int serverPort;
    private static final Map<String, String> promotionStore = new ConcurrentHashMap<>();
    private static final Map<String, String> bundleStore = new ConcurrentHashMap<>();
    private static final Gson gson = new Gson();
    private static final Type PROMOTION_LIST_TYPE = new TypeToken<List<Promotion>>() {}.getType();
    private static final Type BUNDLE_LIST_TYPE = new TypeToken<List<Bundle>>() {}.getType();

    @BeforeContainer
    static void startServer() throws IOException {
        promotionStore.clear();
        bundleStore.clear();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = server.getAddress().getPort();

        // Promotions endpoint
        server.createContext("/rest/v1/promotions", exchange -> {
            String method = exchange.getRequestMethod();
            String query = exchange.getRequestURI().getQuery();

            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                Promotion promo = gson.fromJson(body, Promotion.class);
                if (promo.getId() == null || promo.getId().isBlank()) {
                    promo.setId(UUID.randomUUID().toString());
                }
                String stored = gson.toJson(promo);
                promotionStore.put(promo.getId(), stored);
                String response = "[" + stored + "]";
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else if ("GET".equals(method)) {
                String response;
                if (query != null && query.contains("id=eq.")) {
                    String id = extractParam(query, "id=eq.");
                    String stored = promotionStore.get(id);
                    response = stored != null ? "[" + stored + "]" : "[]";
                } else {
                    response = "[" + String.join(",", promotionStore.values()) + "]";
                }
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        // Bundles endpoint
        server.createContext("/rest/v1/bundles", exchange -> {
            String method = exchange.getRequestMethod();
            String query = exchange.getRequestURI().getQuery();

            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                Bundle bundle = gson.fromJson(body, Bundle.class);
                if (bundle.getId() == null || bundle.getId().isBlank()) {
                    bundle.setId(UUID.randomUUID().toString());
                }
                if (bundle.getItems() == null) {
                    bundle.setItems(new ArrayList<>());
                }
                String stored = gson.toJson(bundle);
                bundleStore.put(bundle.getId(), stored);
                String response = "[" + stored + "]";
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else if ("GET".equals(method)) {
                String response;
                if (query != null && query.contains("id=eq.")) {
                    String id = extractParam(query, "id=eq.");
                    String stored = bundleStore.get(id);
                    response = stored != null ? "[" + stored + "]" : "[]";
                } else {
                    response = "[" + String.join(",", bundleStore.values()) + "]";
                }
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        server.start();
    }

    @AfterContainer
    static void stopServer() {
        if (server != null) server.stop(0);
    }

    private static String extractParam(String query, String prefix) {
        int start = query.indexOf(prefix) + prefix.length();
        String value = query.substring(start);
        if (value.contains("&")) value = value.substring(0, value.indexOf("&"));
        return value;
    }

    private SupabaseClient buildClient() throws Exception {
        SupabaseClient client = new SupabaseClient();
        var urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(client, "http://localhost:" + serverPort);
        var keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(client, "test-key");
        client.init();
        return client;
    }

    // --- Arbitraries ---

    @Provide
    Arbitrary<Promotion> validPromotions() {
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<String> descriptions = Arbitraries.strings().alpha().ofMinLength(0).ofMaxLength(80);
        Arbitrary<String> discountTypes = Arbitraries.of("percentage", "fixed_amount");
        Arbitrary<Double> discountValues = Arbitraries.doubles().between(0.01, 99.99)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<String> promoCodes = Arbitraries.strings().alpha().ofLength(8)
                .injectNull(0.3);
        Arbitrary<String> labels = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(30)
                .injectNull(0.3);
        Arbitrary<Boolean> actives = Arbitraries.of(true, false);

        return Combinators.combine(names, descriptions, discountTypes, discountValues, promoCodes, labels, actives)
                .as((name, desc, dtype, dval, code, label, active) -> {
                    Promotion p = new Promotion();
                    p.setId(UUID.randomUUID().toString());
                    p.setName(name);
                    p.setDescription(desc);
                    p.setDiscountType(dtype);
                    p.setDiscountValue(dval);
                    p.setPromoCode(code);
                    p.setPromotionalLabel(label);
                    p.setActive(active);
                    return p;
                });
    }

    @Provide
    Arbitrary<Bundle> validBundles() {
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<String> descriptions = Arbitraries.strings().alpha().ofMinLength(0).ofMaxLength(80);
        Arbitrary<String> discountTypes = Arbitraries.of("percentage", "fixed_amount");
        Arbitrary<Double> discountValues = Arbitraries.doubles().between(0.01, 99.99)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Boolean> actives = Arbitraries.of(true, false);

        return Combinators.combine(names, descriptions, discountTypes, discountValues, actives)
                .as((name, desc, dtype, dval, active) -> {
                    Bundle b = new Bundle();
                    b.setId(UUID.randomUUID().toString());
                    b.setName(name);
                    b.setDescription(desc);
                    b.setDiscountType(dtype);
                    b.setDiscountValue(dval);
                    b.setActive(active);
                    b.setItems(new ArrayList<>());
                    return b;
                });
    }

    // --- Property Tests ---

    /**
     * Property 9a: Promotion persistence round-trip — all fields preserved.
     *
     * Validates: Requirements 7.1
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-9-promotion-bundle-persistence-round-trip")
    void promotionRoundTrip_allFieldsPreserved(@ForAll("validPromotions") Promotion original) throws Exception {
        promotionStore.clear();

        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);

        // Insert
        String json = gson.toJson(original);
        String postResponse = client.post("promotions", json);
        List<Promotion> inserted = gson.fromJson(postResponse, PROMOTION_LIST_TYPE);
        String insertedId = inserted.get(0).getId();

        // Retrieve via getAllPromotions and find by id
        List<Promotion> all = service.getAllPromotions();
        Optional<Promotion> retrieved = all.stream()
                .filter(p -> insertedId.equals(p.getId()))
                .findFirst();

        assert retrieved.isPresent() : "Promotion should be found after insert";
        Promotion result = retrieved.get();

        assert original.getName().equals(result.getName()) : "Name mismatch";
        assert Objects.equals(original.getDescription(), result.getDescription()) : "Description mismatch";
        assert original.getDiscountType().equals(result.getDiscountType()) : "DiscountType mismatch";
        assert original.getDiscountValue() == result.getDiscountValue() : "DiscountValue mismatch";
        assert Objects.equals(original.getPromoCode(), result.getPromoCode()) : "PromoCode mismatch";
        assert Objects.equals(original.getPromotionalLabel(), result.getPromotionalLabel()) : "Label mismatch";
        assert original.isActive() == result.isActive() : "IsActive mismatch";
    }

    /**
     * Property 9b: Bundle persistence round-trip — all fields preserved.
     *
     * Validates: Requirements 7.3
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-9-promotion-bundle-persistence-round-trip")
    void bundleRoundTrip_allFieldsPreserved(@ForAll("validBundles") Bundle original) throws Exception {
        bundleStore.clear();

        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);

        // Insert
        String json = gson.toJson(original);
        String postResponse = client.post("bundles", json);
        List<Bundle> inserted = gson.fromJson(postResponse, BUNDLE_LIST_TYPE);
        String insertedId = inserted.get(0).getId();

        // Retrieve via getAllBundles and find by id
        List<Bundle> all = service.getAllBundles();
        Optional<Bundle> retrieved = all.stream()
                .filter(b -> insertedId.equals(b.getId()))
                .findFirst();

        assert retrieved.isPresent() : "Bundle should be found after insert";
        Bundle result = retrieved.get();

        assert original.getName().equals(result.getName()) : "Name mismatch";
        assert Objects.equals(original.getDescription(), result.getDescription()) : "Description mismatch";
        assert original.getDiscountType().equals(result.getDiscountType()) : "DiscountType mismatch";
        assert original.getDiscountValue() == result.getDiscountValue() : "DiscountValue mismatch";
        assert original.isActive() == result.isActive() : "IsActive mismatch";
    }
}
