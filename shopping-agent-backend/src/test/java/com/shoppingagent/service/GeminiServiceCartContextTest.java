package com.shoppingagent.service;

import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.model.RagContext;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.OutputStream;
import java.lang.reflect.Field;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Tests that GeminiService.chatWithContext correctly wires cart context
 * (cartItems and appliedCouponCode) into the system prompt sent to Gemini.
 */
@ExtendWith(MockitoExtension.class)
class GeminiServiceCartContextTest {

    @Mock
    private ProductService productService;

    private HttpServer server;
    private final AtomicReference<String> capturedBody = new AtomicReference<>();

    @BeforeEach
    void setUp() throws Exception {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        server.createContext("/", exchange -> {
            byte[] body = exchange.getRequestBody().readAllBytes();
            capturedBody.set(new String(body, StandardCharsets.UTF_8));

            String responseJson = "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"{\\\"action\\\":\\\"NONE\\\",\\\"payload\\\":null,\\\"message\\\":\\\"OK\\\"}\"}]}}]}";
            byte[] responseBytes = responseJson.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(200, responseBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(responseBytes);
            }
        });
        server.start();
    }

    @AfterEach
    void tearDown() {
        if (server != null) server.stop(0);
    }

    @Test
    void chatWithContext_includesCartItemsInPrompt() throws Exception {
        ChatRequest request = new ChatRequest();
        request.setMessage("What's in my cart?");
        request.setCartItems(Arrays.asList(
                createCartItem("prod-1", "Wireless Mouse", 29.99, 2),
                createCartItem("prod-2", "USB-C Cable", 9.99, 1)
        ));

        RagContext ragContext = new RagContext();
        ragContext.setContextWindow("Some relevant product context");
        ragContext.setSourceIds(Collections.emptyList());

        GeminiService testService = createTestableService();
        testService.chatWithContext(request, ragContext);

        String body = capturedBody.get();
        assertNotNull(body, "Request body should have been captured");
        assertTrue(body.contains("CURRENT CART"), "Should contain CURRENT CART section");
        assertTrue(body.contains("Wireless Mouse"), "Should contain first cart item name");
        assertTrue(body.contains("prod-1"), "Should contain first cart item product ID");
        assertTrue(body.contains("USB-C Cable"), "Should contain second cart item name");
        assertTrue(body.contains("prod-2"), "Should contain second cart item product ID");
    }

    @Test
    void chatWithContext_includesCouponCodeInPrompt() throws Exception {
        ChatRequest request = new ChatRequest();
        request.setMessage("Do I have a coupon?");
        request.setCartItems(Collections.emptyList());
        request.setAppliedCouponCode("SAVE20");

        RagContext ragContext = new RagContext();
        ragContext.setContextWindow("Some context");
        ragContext.setSourceIds(Collections.emptyList());

        GeminiService testService = createTestableService();
        testService.chatWithContext(request, ragContext);

        String body = capturedBody.get();
        assertNotNull(body);
        assertTrue(body.contains("APPLIED COUPON"), "Should contain APPLIED COUPON section");
        assertTrue(body.contains("SAVE20"), "Should contain the coupon code");
    }

    @Test
    void chatWithContext_omitsCartSectionWhenCartIsNull() throws Exception {
        ChatRequest request = new ChatRequest();
        request.setMessage("Hello");
        request.setCartItems(null);
        request.setAppliedCouponCode(null);

        RagContext ragContext = new RagContext();
        ragContext.setContextWindow("Some context");
        ragContext.setSourceIds(Collections.emptyList());

        GeminiService testService = createTestableService();
        testService.chatWithContext(request, ragContext);

        String body = capturedBody.get();
        assertNotNull(body);
        assertFalse(body.contains("CURRENT CART"), "Should NOT contain CURRENT CART when cart is null");
        assertFalse(body.contains("APPLIED COUPON"), "Should NOT contain APPLIED COUPON when coupon is null");
    }

    @Test
    void chatWithContext_omitsCartSectionWhenCartIsEmpty() throws Exception {
        ChatRequest request = new ChatRequest();
        request.setMessage("Hello");
        request.setCartItems(Collections.emptyList());
        request.setAppliedCouponCode("");

        RagContext ragContext = new RagContext();
        ragContext.setContextWindow("Some context");
        ragContext.setSourceIds(Collections.emptyList());

        GeminiService testService = createTestableService();
        testService.chatWithContext(request, ragContext);

        String body = capturedBody.get();
        assertNotNull(body);
        assertFalse(body.contains("CURRENT CART"), "Should NOT contain CURRENT CART when cart is empty");
        assertFalse(body.contains("APPLIED COUPON"), "Should NOT contain APPLIED COUPON when coupon is empty");
    }

    // --- Helpers ---

    private ChatRequest.CartItem createCartItem(String productId, String name, double price, int quantity) {
        ChatRequest.CartItem item = new ChatRequest.CartItem();
        item.setProductId(productId);
        item.setName(name);
        item.setPrice(price);
        item.setQuantity(quantity);
        return item;
    }

    private GeminiService createTestableService() throws Exception {
        int port = server.getAddress().getPort();
        String localUrl = "http://localhost:" + port;

        GeminiService service = new GeminiService(productService) {
            @Override
            public ChatResponse chatWithContext(ChatRequest request, RagContext ragContext) {
                try {
                    // Invoke private buildRagSystemPrompt via reflection
                    java.lang.reflect.Method buildPrompt = GeminiService.class.getDeclaredMethod(
                            "buildRagSystemPrompt", RagContext.class, List.class, String.class);
                    buildPrompt.setAccessible(true);
                    String systemPrompt = (String) buildPrompt.invoke(this, ragContext,
                            request.getCartItems(), request.getAppliedCouponCode());

                    java.lang.reflect.Method buildBody = GeminiService.class.getDeclaredMethod(
                            "buildRequestBody", String.class, ChatRequest.class);
                    buildBody.setAccessible(true);
                    String requestBody = (String) buildBody.invoke(this, systemPrompt, request);

                    java.net.http.HttpClient client = java.net.http.HttpClient.newBuilder().build();
                    java.net.http.HttpRequest httpRequest = java.net.http.HttpRequest.newBuilder()
                            .uri(java.net.URI.create(localUrl + "/test"))
                            .header("Content-Type", "application/json")
                            .POST(java.net.http.HttpRequest.BodyPublishers.ofString(requestBody))
                            .build();

                    java.net.http.HttpResponse<String> response = client.send(httpRequest,
                            java.net.http.HttpResponse.BodyHandlers.ofString());

                    if (response.statusCode() == 200) {
                        java.lang.reflect.Method parseResp = GeminiService.class.getDeclaredMethod(
                                "parseGeminiResponse", String.class);
                        parseResp.setAccessible(true);
                        return (ChatResponse) parseResp.invoke(this, response.body());
                    }
                    return new ChatResponse("NONE", null, "Error");
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            }
        };

        setField(service, "apiKey", "test-key");
        setField(service, "model", "test-model");
        return service;
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception {
        Class<?> clazz = target.getClass();
        Field field = null;
        while (clazz != null && field == null) {
            try {
                field = clazz.getDeclaredField(fieldName);
            } catch (NoSuchFieldException e) {
                clazz = clazz.getSuperclass();
            }
        }
        if (field == null) throw new NoSuchFieldException(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
