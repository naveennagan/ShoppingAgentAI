package com.shoppingagent.properties;

import com.google.gson.Gson;
import com.shoppingagent.exception.InvalidCouponException;
import com.shoppingagent.model.CouponValidationResult;
import com.shoppingagent.model.Promotion;
import com.shoppingagent.service.PromotionService;
import com.shoppingagent.service.SupabaseClient;
import com.sun.net.httpserver.HttpServer;
import net.jqwik.api.*;
import net.jqwik.api.lifecycle.AfterContainer;
import net.jqwik.api.lifecycle.BeforeContainer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based tests for the Split Voucher System feature.
 * All properties run 100 iterations each.
 */
class SplitVoucherProperties {

    private static final Gson gson = new Gson();
    private static HttpServer server;
    private static int serverPort;
    private static final Map<String, String> promotionStore = new java.util.concurrent.ConcurrentHashMap<>();

    @BeforeContainer
    static void startServer() throws IOException {
        promotionStore.clear();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = server.getAddress().getPort();

        server.createContext("/rest/v1/promotions", exchange -> {
            String method = exchange.getRequestMethod();
            String query = exchange.getRequestURI().getQuery();

            if ("GET".equals(method) && query != null && query.contains("promo_code=eq.")) {
                String code = query.substring(query.indexOf("promo_code=eq.") + "promo_code=eq.".length());
                if (code.contains("&")) code = code.substring(0, code.indexOf("&"));
                String promoJson = promotionStore.get(code);
                String response = promoJson != null ? "[" + promoJson + "]" : "[]";
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            } else {
                byte[] bytes = "[]".getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
            }
        });

        // product_promotions endpoint (returns empty for these tests)
        server.createContext("/rest/v1/product_promotions", exchange -> {
            byte[] bytes = "[]".getBytes();
            exchange.sendResponseHeaders(200, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) { os.write(bytes); }
        });

        server.start();
    }

    @AfterContainer
    static void stopServer() {
        if (server != null) server.stop(0);
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

    // -------------------------------------------------------------------------
    // Arbitraries
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> randomStrings() {
        return Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(30);
    }

    @Provide
    Arbitrary<String> discountTypes() {
        return Arbitraries.of("percentage", "fixed_amount");
    }

    @Provide
    Arbitrary<Double> positiveDoubles() {
        return Arbitraries.doubles().between(0.01, 10000.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
    }

    @Provide
    Arbitrary<Integer> nullableValidTill() {
        return Arbitraries.oneOf(
                Arbitraries.just(null),
                Arbitraries.integers().between(1, 120)
        );
    }

    @Provide
    Arbitrary<String> nullableApplicableItemType() {
        return Arbitraries.oneOf(
                Arbitraries.just(null),
                Arbitraries.of("device", "broadband", "both")
        );
    }

    @Provide
    Arbitrary<Promotion> randomPromotions() {
        Arbitrary<String> strings = randomStrings();
        Arbitrary<String> discTypes = discountTypes();
        Arbitrary<Double> discValues = positiveDoubles();
        Arbitrary<Boolean> booleans = Arbitraries.of(true, false);
        Arbitrary<Integer> validTills = nullableValidTill();
        Arbitrary<String> itemTypes = nullableApplicableItemType();

        // Combine first 8 fields
        Arbitrary<Promotion> base = Combinators.combine(
                strings, strings, strings, discTypes, discValues, strings, strings, strings
        ).as((id, name, desc, discType, discValue, code, start, end) -> {
            Promotion p = new Promotion();
            p.setId(id);
            p.setName(name);
            p.setDescription(desc);
            p.setDiscountType(discType);
            p.setDiscountValue(discValue);
            p.setPromoCode(code);
            p.setStartDate(start);
            p.setEndDate(end);
            return p;
        });

        // Combine remaining 5 fields with the base promotion
        return Combinators.combine(base, strings, booleans, strings, validTills, itemTypes)
                .as((p, label, active, created, validTill, itemType) -> {
                    p.setPromotionalLabel(label);
                    p.setActive(active);
                    p.setCreatedAt(created);
                    p.setValidTill(validTill);
                    p.setApplicableItemType(itemType);
                    return p;
                });
    }

    // -------------------------------------------------------------------------
    // Property 1: Promotion field round-trip
    // -------------------------------------------------------------------------

    // Feature: split-voucher-system, Property 1: Promotion field round-trip
    // **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
    @Property(tries = 100)
    void promotionFieldRoundTrip(@ForAll("randomPromotions") Promotion original) {
        String json = gson.toJson(original);
        Promotion deserialized = gson.fromJson(json, Promotion.class);

        assertThat(deserialized).isEqualTo(original);
    }

    // -------------------------------------------------------------------------
    // Arbitraries for Property 2
    // -------------------------------------------------------------------------

    @Provide
    Arbitrary<String> validApplicableItemTypes() {
        return Arbitraries.of("device", "broadband", "both");
    }

    @Provide
    Arbitrary<String> requestItemTypes() {
        return Arbitraries.of("device", "broadband");
    }

    // -------------------------------------------------------------------------
    // Property 2: Item type filtering
    // -------------------------------------------------------------------------

    // Feature: split-voucher-system, Property 2: Item type filtering
    // **Validates: Requirements 2.1, 2.2**
    @Property(tries = 100)
    void itemTypeFiltering(
            @ForAll("validApplicableItemTypes") String applicableItemType,
            @ForAll("requestItemTypes") String requestItemType
    ) throws Exception {
        promotionStore.clear();

        // Build an active, non-expired promotion with the given applicable_item_type
        String promoCode = "TEST-" + UUID.randomUUID().toString().substring(0, 8);
        Promotion promotion = new Promotion();
        promotion.setId(UUID.randomUUID().toString());
        promotion.setName("Test Promo");
        promotion.setDescription("Test");
        promotion.setDiscountType("percentage");
        promotion.setDiscountValue(10.0);
        promotion.setPromoCode(promoCode);
        promotion.setStartDate(OffsetDateTime.now().minusDays(1).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        promotion.setEndDate(OffsetDateTime.now().plusDays(30).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        promotion.setPromotionalLabel("Test");
        promotion.setActive(true);
        promotion.setCreatedAt(OffsetDateTime.now().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME));
        promotion.setValidTill(null);
        promotion.setApplicableItemType(applicableItemType);

        // Store the promotion so the stub server returns it
        promotionStore.put(promoCode, gson.toJson(promotion));

        SupabaseClient client = buildClient();
        PromotionService service = new PromotionService(client);

        boolean shouldSucceed = applicableItemType.equals("both") || applicableItemType.equals(requestItemType);

        if (shouldSucceed) {
            CouponValidationResult result = service.validateCouponCode(promoCode, Collections.emptyList(), requestItemType);
            assertThat(result).isNotNull();
            assertThat(result.getPromotionId()).isEqualTo(promotion.getId());
            assertThat(result.getApplicableItemType()).isEqualTo(applicableItemType);
        } else {
            try {
                service.validateCouponCode(promoCode, Collections.emptyList(), requestItemType);
                assertThat(true).as("Expected InvalidCouponException for mismatched item type").isFalse();
            } catch (InvalidCouponException e) {
                assertThat(e.getReason()).isEqualTo(InvalidCouponException.Reason.WRONG_ITEM_TYPE);
                assertThat(e.getMessage()).contains("not applicable");
            }
        }
    }
}
