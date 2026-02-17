package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Product;
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
 * Property 1: Product persistence round-trip
 *
 * For any valid product object, inserting it into the Product_Table via POST
 * and then querying it back by ID via GET should produce an equivalent product
 * with all fields matching.
 *
 * Validates: Requirements 1.1, 3.1, 3.2
 */
class ProductPersistenceProperties {

    private static HttpServer server;
    private static int serverPort;
    private static final Map<String, String> productStore = new ConcurrentHashMap<>();
    private static final Gson gson = new Gson();
    private static final Type PRODUCT_LIST_TYPE = new TypeToken<List<Product>>() {}.getType();

    @BeforeContainer
    static void startServer() throws IOException {
        productStore.clear();
        server = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = server.getAddress().getPort();

        server.createContext("/rest/v1/products", exchange -> {
            String method = exchange.getRequestMethod();
            String query = exchange.getRequestURI().getQuery();

            if ("POST".equals(method)) {
                String body = new String(exchange.getRequestBody().readAllBytes());
                // Parse the posted product, assign a UUID if missing, store it
                Product product = gson.fromJson(body, Product.class);
                if (product.getId() == null || product.getId().isBlank()) {
                    product.setId(UUID.randomUUID().toString());
                }
                String stored = gson.toJson(product);
                productStore.put(product.getId(), stored);
                // Return as array (PostgREST style with Prefer: return=representation)
                String response = "[" + stored + "]";
                byte[] bytes = response.getBytes();
                exchange.sendResponseHeaders(200, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
            } else if ("GET".equals(method)) {
                if (query != null && query.contains("id=eq.")) {
                    String id = query.substring(query.indexOf("id=eq.") + 6);
                    // Strip any trailing query params
                    if (id.contains("&")) id = id.substring(0, id.indexOf("&"));
                    String stored = productStore.get(id);
                    String response = stored != null ? "[" + stored + "]" : "[]";
                    byte[] bytes = response.getBytes();
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(bytes);
                    }
                } else {
                    // Return all products
                    String response = "[" + String.join(",", productStore.values()) + "]";
                    byte[] bytes = response.getBytes();
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(bytes);
                    }
                }
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

    @Provide
    Arbitrary<Product> validProducts() {
        Arbitrary<String> names = Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(50);
        Arbitrary<Double> prices = Arbitraries.doubles().between(0.01, 9999.99)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<String> descriptions = Arbitraries.strings().alpha().ofMinLength(0).ofMaxLength(100);
        Arbitrary<String> categories = Arbitraries.of("Mobile", "Electronics", "Accessories");
        Arbitrary<String> imageUrls = Arbitraries.strings().alpha().ofMinLength(0).ofMaxLength(50)
                .map(s -> "https://img.example.com/" + s);
        Arbitrary<String> brands = Arbitraries.of("Samsung", "Apple", "Google", "OnePlus", "Xiaomi");
        Arbitrary<Integer> stocks = Arbitraries.integers().between(0, 1000);
        Arbitrary<Double> ratings = Arbitraries.doubles().between(0.0, 5.0)
                .map(d -> Math.round(d * 100.0) / 100.0);
        Arbitrary<Map<String, String>> specs = Arbitraries.maps(
                Arbitraries.of("RAM", "Storage", "Screen", "Camera", "Battery", "OS"),
                Arbitraries.strings().alpha().ofMinLength(1).ofMaxLength(20)
        ).ofMinSize(0).ofMaxSize(4);
        Arbitrary<List<String>> tags = Arbitraries.of("5G", "Android", "iOS", "Budget", "Flagship", "NFC")
                .list().ofMinSize(0).ofMaxSize(3).uniqueElements();

        // jqwik combine supports max 8 params, so build in two stages
        Arbitrary<Product> base = Combinators.combine(names, prices, descriptions, categories, imageUrls, brands, stocks, ratings)
                .as((name, price, desc, cat, img, brand, stock, rating) -> {
                    Product p = new Product();
                    p.setId(UUID.randomUUID().toString());
                    p.setName(name);
                    p.setPrice(price);
                    p.setDescription(desc);
                    p.setCategory(cat);
                    p.setImage(img);
                    p.setBrand(brand);
                    p.setStock(stock);
                    p.setRating(rating);
                    return p;
                });

        return Combinators.combine(base, specs, tags)
                .as((product, spec, tag) -> {
                    product.setSpecs(spec);
                    product.setTags(tag);
                    return product;
                });
    }

    /**
     * Property 1: Product persistence round-trip
     *
     * Validates: Requirements 1.1, 3.1, 3.2
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-1-product-persistence-round-trip")
    void productRoundTrip_allFieldsPreserved(@ForAll("validProducts") Product original) throws Exception {
        productStore.clear();

        SupabaseClient client = buildClient();
        ProductService service = new ProductService(client);

        // Insert via SupabaseClient POST (simulating what a service would do)
        String json = gson.toJson(original);
        String postResponse = client.post("products", json);
        List<Product> inserted = gson.fromJson(postResponse, PRODUCT_LIST_TYPE);
        String insertedId = inserted.get(0).getId();

        // Retrieve by ID via ProductService
        Optional<Product> retrieved = service.getProductById(insertedId);

        assert retrieved.isPresent() : "Product should be found after insert";
        Product result = retrieved.get();

        assert original.getName().equals(result.getName()) : "Name mismatch";
        assert original.getPrice() == result.getPrice() : "Price mismatch";
        assert original.getDescription().equals(result.getDescription()) : "Description mismatch";
        assert original.getCategory().equals(result.getCategory()) : "Category mismatch";
        assert original.getImage().equals(result.getImage()) : "Image mismatch";
        assert original.getBrand().equals(result.getBrand()) : "Brand mismatch";
        assert original.getStock() == result.getStock() : "Stock mismatch";
        assert original.getRating() == result.getRating() : "Rating mismatch";
        assert original.getSpecs().equals(result.getSpecs()) : "Specs mismatch";
        assert original.getTags().equals(result.getTags()) : "Tags mismatch";
    }

    /**
     * Property 1 (getAllProducts variant): Inserted product appears in getAllProducts.
     *
     * Validates: Requirements 1.1, 3.1
     */
    @Property(tries = 100)
    @Tag("supabase-integration")
    @Tag("property-1-product-persistence-round-trip")
    void productRoundTrip_appearsInGetAll(@ForAll("validProducts") Product original) throws Exception {
        productStore.clear();

        SupabaseClient client = buildClient();
        ProductService service = new ProductService(client);

        String json = gson.toJson(original);
        String postResponse = client.post("products", json);
        List<Product> inserted = gson.fromJson(postResponse, PRODUCT_LIST_TYPE);
        String insertedId = inserted.get(0).getId();

        List<Product> all = service.getAllProducts();

        assert all.stream().anyMatch(p -> insertedId.equals(p.getId()))
                : "Inserted product should appear in getAllProducts";
    }
}
