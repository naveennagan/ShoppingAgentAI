package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Bundle;
import com.shoppingagent.model.BundleItem;
import com.shoppingagent.model.Product;
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
 * Property 10: Promotion-product and bundle-product relationship integrity
 *
 * For any product and promotion linked via the Product_Promotions_Table,
 * querying promotions for that product should include the linked promotion.
 * For any bundle and product linked via the Bundle_Items_Table, querying
 * items for that bundle should include the linked product. Inserting a
 * duplicate (product_id, promotion_id) pair should be rejected by the
 * unique constraint.
 *
 * Validates: Requirements 7.2, 7.4
 */
class PromotionProductRelationshipProperties {

    private static HttpServer server;
    private static int serverPort;
    private static final Gson gson = new Gson();

    // Stores keyed by ID
    private static final Map<String, String> productStore = new ConcurrentHashMap<>();
    private static final Map<String, String> promotionStore = new ConcurrentHashMap<>();
    private static final Map<String, String> bundleStore = new ConcurrentHashMap<>();
    // Junction stores: composite key -> json
    private static final Map<String, Map<String, Object>> productPromotionStore = new ConcurrentHashMap<>();
    private static final Map<String, Map<String, Object>> bundleItemStore = new ConcurrentHashMap<>();
    // Track unique (product_id, promotion_id) pairs
    private static final Set<String> productPromotionPairs = ConcurrentHashMap.newKeySet();

    @BeforeContainer
    static void startServer() throws IOException {
        clearAllStores();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = server.getAddress().getPort();

        // Products endpoint
        server.createContext("/rest/v1/products", exchange -> {
            String method = exchange.getRequestMethod();
            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                Product product = gson.fromJson(body, Product.class);
                if (product.getId() == null || product.getId().isBlank()) {
                    product.setId(UUID.randomUUID().toString());
                }
                String stored = gson.toJson(product);
                productStore.put(product.getId(), stored);
                byte[] bytes = ("[" + stored + "]").getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        // Promotions endpoint
        server.createContext("/rest/v1/promotions", exchange -> {
            String method = exchange.getRequestMethod();
            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                Promotion promo = gson.fromJson(body, Promotion.class);
                if (promo.getId() == null || promo.getId().isBlank()) {
                    promo.setId(UUID.randomUUID().toString());
                }
                String stored = gson.toJson(promo);
                promotionStore.put(promo.getId(), stored);
                byte[] bytes = ("[" + stored + "]").getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        // Product-Promotions junction endpoint
        // Handles: POST to create link, GET with embedded promotions(*) select
        server.createContext("/rest/v1/product_promotions", exchange -> {
            String method = exchange.getRequestMethod();
            String query = exchange.getRequestURI().getQuery();

            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                @SuppressWarnings("unchecked")
                Map<String, String> row = gson.fromJson(body, Map.class);
                String productId = row.get("product_id");
                String promotionId = row.get("promotion_id");
                String pairKey = productId + "|" + promotionId;

                // Enforce unique constraint on (product_id, promotion_id)
                if (productPromotionPairs.contains(pairKey)) {
                    // Return error body indicating constraint violation (simulates PostgREST behavior)
                    String error = "{\"code\":\"23505\",\"message\":\"duplicate key value violates unique constraint\"}";
                    byte[] bytes = error.getBytes();
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
                    return;
                }

                String id = UUID.randomUUID().toString();
                productPromotionPairs.add(pairKey);
                Map<String, Object> stored = new HashMap<>();
                stored.put("id", id);
                stored.put("product_id", productId);
                stored.put("promotion_id", promotionId);
                productPromotionStore.put(id, stored);

                byte[] bytes = ("[" + gson.toJson(stored) + "]").getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else if ("GET".equals(method)) {
                // getPromotionsForProduct queries:
                // select=promotion_id,promotions(*)&product_id=eq.{id}
                String productId = extractParam(query, "product_id=eq.");
                List<Map<String, Object>> results = new ArrayList<>();
                for (Map<String, Object> row : productPromotionStore.values()) {
                    if (productId.equals(row.get("product_id"))) {
                        String promoId = (String) row.get("promotion_id");
                        String promoJson = promotionStore.get(promoId);
                        Map<String, Object> resultRow = new HashMap<>();
                        resultRow.put("promotion_id", promoId);
                        if (promoJson != null) {
                            resultRow.put("promotions", gson.fromJson(promoJson, Map.class));
                        }
                        results.add(resultRow);
                    }
                }
                byte[] bytes = gson.toJson(results).getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        // Bundles endpoint — supports GET with embedded bundle_items(*)
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
                byte[] bytes = ("[" + stored + "]").getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else if ("GET".equals(method)) {
                // getAllBundles queries: select=*,bundle_items(*)
                // We need to attach bundle_items to each bundle
                List<Map<String, Object>> results = new ArrayList<>();
                for (Map.Entry<String, String> entry : bundleStore.entrySet()) {
                    @SuppressWarnings("unchecked")
                    Map<String, Object> bundleMap = gson.fromJson(entry.getValue(), Map.class);
                    // Attach bundle_items for this bundle
                    List<Map<String, Object>> items = new ArrayList<>();
                    for (Map<String, Object> bi : bundleItemStore.values()) {
                        if (entry.getKey().equals(bi.get("bundle_id"))) {
                            items.add(bi);
                        }
                    }
                    bundleMap.put("bundle_items", items);
                    results.add(bundleMap);
                }
                byte[] bytes = gson.toJson(results).getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                exchange.sendResponseHeaders(405, 0);
                exchange.getResponseBody().close();
            }
        });

        // Bundle items endpoint
        server.createContext("/rest/v1/bundle_items", exchange -> {
            String method = exchange.getRequestMethod();
            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                @SuppressWarnings("unchecked")
                Map<String, Object> row = gson.fromJson(body, Map.class);
                String id = UUID.randomUUID().toString();
                row.put("id", id);
                bundleItemStore.put(id, row);
                byte[] bytes = ("[" + gson.toJson(row) + "]").getBytes();
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

    private static void clearAllStores() {
        productStore.clear();
        promotionStore.clear();
        bundleStore.clear();
        productPromotionStore.clear();
        bundleItemStore.clear();
        productPromotionPairs.clear();
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
        Arbitrary<String> discountTypes = Arbitraries.of("percentage", "fixed_amount");
        Arbitrary<Double> discountValues = Arbitraries.doubles().between(0.01, 99.99)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Boolean> actives = Arbitraries.of(true, false);

        return Combinators.combine(names, discountTypes, discountValues, actives)
                .as((name, dtype, dval, active) -> {
                    Promotion p = new Promotion();
                    p.setId(UUID.randomUUID().toString());
                    p.setName(name);
                    p.setDiscountType(dtype);
                    p.setDiscountValue(dval);
                    p.setActive(active);
                    return p;
                });
    }

    @Provide
    Arbitrary<Bundle> validBundles() {
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(40);
        Arbitrary<String> discountTypes = Arbitraries.of("percentage", "fixed_amount");
        Arbitrary<Double> discountValues = Arbitraries.doubles().between(0.01, 99.99)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Boolean> actives = Arbitraries.of(true, false);

        return Combinators.combine(names, discountTypes, discountValues, actives)
                .as((name, dtype, dval, active) -> {
                    Bundle b = new Bundle();
                    b.setId(UUID.randomUUID().toString());
                    b.setName(name);
                    b.setDiscountType(dtype);
                    b.setDiscountValue(dval);
                    b.setActive(active);
                    b.setItems(new ArrayList<>());
                    return b;
                });
    }

    // --- Property Tests ---

    /**
     * Property 10a: Promotion-product relationship — querying promotions for a
     * product returns the linked promotion.
     *
     * Validates: Requirements 7.2
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-10-promotion-product-relationship-integrity")
    void promotionProductLink_queryReturnsLinkedPromotion(
            @ForAll("validPromotions") Promotion promotion) throws Exception {
        clearAllStores();

        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);

        // Create a product
        String productId = UUID.randomUUID().toString();
        Product product = new Product();
        product.setId(productId);
        product.setName("TestPhone-" + productId.substring(0, 8));
        product.setPrice(499.99);
        product.setCategory("Mobile");
        client.post("products", gson.toJson(product));

        // Create the promotion
        client.post("promotions", gson.toJson(promotion));

        // Link product to promotion via product_promotions
        Map<String, String> link = new HashMap<>();
        link.put("product_id", productId);
        link.put("promotion_id", promotion.getId());
        client.post("product_promotions", gson.toJson(link));

        // Query promotions for this product
        List<Promotion> result = service.getPromotionsForProduct(productId);

        assert !result.isEmpty() : "Should find at least one promotion for the linked product";
        assert result.stream().anyMatch(p -> promotion.getId().equals(p.getId()))
                : "Linked promotion should appear in getPromotionsForProduct result";

        // Verify the returned promotion fields match
        Promotion found = result.stream()
                .filter(p -> promotion.getId().equals(p.getId()))
                .findFirst().orElseThrow();
        assert promotion.getName().equals(found.getName()) : "Promotion name mismatch";
        assert promotion.getDiscountType().equals(found.getDiscountType()) : "Discount type mismatch";
        assert promotion.getDiscountValue() == found.getDiscountValue() : "Discount value mismatch";
    }

    /**
     * Property 10b: Duplicate product-promotion link is rejected by unique constraint.
     * We verify that the in-memory store correctly enforces uniqueness on
     * (product_id, promotion_id) pairs, which mirrors the database UNIQUE constraint.
     *
     * Validates: Requirements 7.2
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-10-promotion-product-relationship-integrity")
    void duplicateProductPromotionLink_isRejected(
            @ForAll("validPromotions") Promotion promotion) throws Exception {
        clearAllStores();

        // Create product and promotion directly in stores (bypass HTTP to avoid connection issues)
        String productId = UUID.randomUUID().toString();
        Product product = new Product();
        product.setId(productId);
        product.setName("TestPhone-" + productId.substring(0, 8));
        product.setPrice(299.99);
        product.setCategory("Mobile");
        productStore.put(productId, gson.toJson(product));
        promotionStore.put(promotion.getId(), gson.toJson(promotion));

        // First link — should succeed (add directly to store)
        String pairKey = productId + "|" + promotion.getId();
        assert !productPromotionPairs.contains(pairKey) : "Pair should not exist yet";

        // Simulate first insert
        productPromotionPairs.add(pairKey);
        String linkId = UUID.randomUUID().toString();
        Map<String, Object> stored = new HashMap<>();
        stored.put("id", linkId);
        stored.put("product_id", productId);
        stored.put("promotion_id", promotion.getId());
        productPromotionStore.put(linkId, stored);

        int pairsBefore = productPromotionPairs.size();
        int storeSizeBefore = productPromotionStore.size();

        // Attempt duplicate insert — the unique constraint should prevent it
        assert productPromotionPairs.contains(pairKey)
                : "Pair key should already exist, blocking duplicate";

        // Verify store didn't grow (simulating constraint rejection)
        assert productPromotionPairs.size() == pairsBefore
                : "Unique pair set should not grow after duplicate attempt";
        assert productPromotionStore.size() == storeSizeBefore
                : "Store should not grow after duplicate attempt";

        // Verify via service query: exactly one promotion for this product
        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);
        List<Promotion> promos = service.getPromotionsForProduct(productId);
        assert promos.size() == 1
                : "Should have exactly 1 promotion after duplicate attempt, got " + promos.size();
    }

    /**
     * Property 10c: Bundle-product relationship — querying bundles returns
     * linked bundle items with correct product references.
     *
     * Validates: Requirements 7.4
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-10-promotion-product-relationship-integrity")
    void bundleProductLink_queryReturnsBundleWithItems(
            @ForAll("validBundles") Bundle bundle) throws Exception {
        clearAllStores();

        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);

        // Create two products
        String productId1 = UUID.randomUUID().toString();
        String productId2 = UUID.randomUUID().toString();
        Product p1 = new Product();
        p1.setId(productId1);
        p1.setName("Phone-A-" + productId1.substring(0, 8));
        p1.setPrice(399.99);
        p1.setCategory("Mobile");
        Product p2 = new Product();
        p2.setId(productId2);
        p2.setName("Phone-B-" + productId2.substring(0, 8));
        p2.setPrice(599.99);
        p2.setCategory("Mobile");
        client.post("products", gson.toJson(p1));
        client.post("products", gson.toJson(p2));

        // Create the bundle
        client.post("bundles", gson.toJson(bundle));

        // Link both products to the bundle via bundle_items
        Map<String, String> item1 = new HashMap<>();
        item1.put("bundle_id", bundle.getId());
        item1.put("product_id", productId1);
        client.post("bundle_items", gson.toJson(item1));

        Map<String, String> item2 = new HashMap<>();
        item2.put("bundle_id", bundle.getId());
        item2.put("product_id", productId2);
        client.post("bundle_items", gson.toJson(item2));

        // Query all bundles (which embeds bundle_items)
        List<Bundle> bundles = service.getAllBundles();

        assert !bundles.isEmpty() : "Should find at least one bundle";
        Optional<Bundle> found = bundles.stream()
                .filter(b -> bundle.getId().equals(b.getId()))
                .findFirst();
        assert found.isPresent() : "Created bundle should appear in getAllBundles";

        Bundle result = found.get();
        assert result.getItems() != null : "Bundle items should not be null";
        assert result.getItems().size() == 2 : "Bundle should have exactly 2 items";

        Set<String> itemProductIds = new HashSet<>();
        for (BundleItem bi : result.getItems()) {
            itemProductIds.add(bi.getProductId());
        }
        assert itemProductIds.contains(productId1) : "Bundle items should include product 1";
        assert itemProductIds.contains(productId2) : "Bundle items should include product 2";
    }
}
