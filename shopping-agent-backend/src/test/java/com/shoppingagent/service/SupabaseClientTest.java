package com.shoppingagent.service;

import com.shoppingagent.exception.SupabaseConnectionException;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class SupabaseClientTest {

    private static HttpServer server;
    private static int serverPort;
    private static final List<RecordedRequest> recordedRequests = new CopyOnWriteArrayList<>();

    @Autowired
    private SupabaseClient supabaseClient;

    record RecordedRequest(String method, String path, Map<String, List<String>> headers, String body) {}

    @BeforeAll
    static void startServer() throws IOException {
        server = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = server.getAddress().getPort();

        server.createContext("/", exchange -> {
            // Read request body
            String body = new String(exchange.getRequestBody().readAllBytes());
            recordedRequests.add(new RecordedRequest(
                    exchange.getRequestMethod(),
                    exchange.getRequestURI().toString(),
                    exchange.getRequestHeaders(),
                    body
            ));

            String response = "[]";
            exchange.sendResponseHeaders(200, response.length());
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(response.getBytes());
            }
        });

        server.start();
    }

    @AfterAll
    static void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @BeforeEach
    void clearRequests() {
        recordedRequests.clear();
    }

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("supabase.url", () -> "http://localhost:" + serverPort);
        registry.add("supabase.key", () -> "test-api-key-12345");
    }

    // --- URL Building Tests ---

    @Test
    void get_buildsCorrectUrl_withQueryParams() {
        supabaseClient.get("products", "select=*&category=eq.Mobile");

        assertEquals(1, recordedRequests.size());
        RecordedRequest req = recordedRequests.get(0);
        assertEquals("GET", req.method());
        assertEquals("/rest/v1/products?select=*&category=eq.Mobile", req.path());
    }

    @Test
    void get_buildsCorrectUrl_withoutQueryParams() {
        supabaseClient.get("products", "");

        assertEquals(1, recordedRequests.size());
        assertEquals("/rest/v1/products", recordedRequests.get(0).path());
    }

    @Test
    void post_buildsCorrectUrl() {
        supabaseClient.post("cart_items", "{\"session_id\":\"s1\"}");

        assertEquals(1, recordedRequests.size());
        RecordedRequest req = recordedRequests.get(0);
        assertEquals("POST", req.method());
        assertEquals("/rest/v1/cart_items", req.path());
    }

    @Test
    void patch_buildsCorrectUrl_withFilter() {
        supabaseClient.patch("cart_items", "id=eq.abc-123", "{\"quantity\":3}");

        assertEquals(1, recordedRequests.size());
        RecordedRequest req = recordedRequests.get(0);
        assertEquals("PATCH", req.method());
        assertEquals("/rest/v1/cart_items?id=eq.abc-123", req.path());
    }

    @Test
    void delete_buildsCorrectUrl_withFilter() {
        supabaseClient.delete("chat_history", "session_id=eq.sess-1");

        assertEquals(1, recordedRequests.size());
        RecordedRequest req = recordedRequests.get(0);
        assertEquals("DELETE", req.method());
        assertEquals("/rest/v1/chat_history?session_id=eq.sess-1", req.path());
    }

    // --- Header Construction Tests ---

    @Test
    void requests_includeApikeyHeader() {
        supabaseClient.get("products", "");

        RecordedRequest req = recordedRequests.get(0);
        List<String> apikey = req.headers().get("Apikey");
        assertNotNull(apikey);
        assertEquals("test-api-key-12345", apikey.get(0));
    }

    @Test
    void requests_includeBearerAuthorizationHeader() {
        supabaseClient.get("products", "");

        RecordedRequest req = recordedRequests.get(0);
        List<String> auth = req.headers().get("Authorization");
        assertNotNull(auth);
        assertEquals("Bearer test-api-key-12345", auth.get(0));
    }

    @Test
    void requests_includeContentTypeJson() {
        supabaseClient.get("products", "");

        RecordedRequest req = recordedRequests.get(0);
        List<String> contentType = req.headers().get("Content-type");
        assertNotNull(contentType);
        assertEquals("application/json", contentType.get(0));
    }

    @Test
    void post_includesPreferReturnRepresentation() {
        supabaseClient.post("products", "{}");

        RecordedRequest req = recordedRequests.get(0);
        List<String> prefer = req.headers().get("Prefer");
        assertNotNull(prefer);
        assertEquals("return=representation", prefer.get(0));
    }

    @Test
    void post_sendsRequestBody() {
        String body = "{\"name\":\"Test Product\",\"price\":99.99}";
        supabaseClient.post("products", body);

        RecordedRequest req = recordedRequests.get(0);
        assertEquals(body, req.body());
    }

    // --- Connection Failure Tests ---

    @Test
    void get_throwsSupabaseConnectionException_onConnectionFailure() throws Exception {
        // Create a separate client pointing to a port with nothing listening
        SupabaseClient failClient = new SupabaseClient();
        // Use reflection to set fields since @Value won't apply
        var urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(failClient, "http://localhost:1");
        var keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(failClient, "fake-key");
        failClient.init();

        assertThrows(SupabaseConnectionException.class, () ->
                failClient.get("products", ""));
    }

    @Test
    void post_throwsSupabaseConnectionException_onConnectionFailure() throws Exception {
        SupabaseClient failClient = new SupabaseClient();
        var urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(failClient, "http://localhost:1");
        var keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(failClient, "fake-key");
        failClient.init();

        assertThrows(SupabaseConnectionException.class, () ->
                failClient.post("products", "{}"));
    }

    // --- Init Validation Tests ---

    @Test
    void init_throwsIllegalStateException_whenUrlIsBlank() throws Exception {
        SupabaseClient client = new SupabaseClient();
        var urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(client, "");
        var keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(client, "some-key");

        IllegalStateException ex = assertThrows(IllegalStateException.class, client::init);
        assertTrue(ex.getMessage().contains("supabase.url"));
    }

    @Test
    void init_throwsIllegalStateException_whenKeyIsBlank() throws Exception {
        SupabaseClient client = new SupabaseClient();
        var urlField = SupabaseClient.class.getDeclaredField("supabaseUrl");
        urlField.setAccessible(true);
        urlField.set(client, "http://localhost:8080");
        var keyField = SupabaseClient.class.getDeclaredField("supabaseKey");
        keyField.setAccessible(true);
        keyField.set(client, "");

        IllegalStateException ex = assertThrows(IllegalStateException.class, client::init);
        assertTrue(ex.getMessage().contains("supabase.key"));
    }
}
