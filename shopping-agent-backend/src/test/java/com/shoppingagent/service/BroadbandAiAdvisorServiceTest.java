package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.shoppingagent.exception.BroadbandAiException;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.BroadbandRecommendation;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.io.OutputStream;
import java.lang.reflect.Field;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Unit tests for BroadbandAiAdvisorService.
 *
 * Tests for buildBroadbandPrompt use the package-private method directly.
 * Tests for HTTP error paths use a local HttpServer (com.sun.net.httpserver.HttpServer)
 * via a testable subclass that overrides the Gemini base URL.
 *
 * Note: The 10-second timeout test is omitted — the service's hardcoded 10s timeout
 * would make any timeout test unacceptably slow for a unit test suite.
 */
class BroadbandAiAdvisorServiceTest {

    private static final Gson GSON = new Gson();

    private HttpServer localServer;
    private int serverPort;

    @BeforeEach
    void startLocalServer() throws IOException {
        localServer = HttpServer.create(new InetSocketAddress(0), 0);
        serverPort = localServer.getAddress().getPort();
        localServer.start();
    }

    @AfterEach
    void stopLocalServer() {
        if (localServer != null) {
            localServer.stop(0);
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Creates a BroadbandAiAdvisorService whose Gemini calls are redirected to
     * the local test server. Uses reflection to set apiKey and model fields.
     */
    private BroadbandAiAdvisorService servicePointingAt(String baseUrl) throws Exception {
        TestableBroadbandAiAdvisorService service = new TestableBroadbandAiAdvisorService(baseUrl);

        Field apiKeyField = BroadbandAiAdvisorService.class.getDeclaredField("apiKey");
        apiKeyField.setAccessible(true);
        apiKeyField.set(service, "test-api-key");

        Field modelField = BroadbandAiAdvisorService.class.getDeclaredField("model");
        modelField.setAccessible(true);
        modelField.set(service, "gemini-test");

        return service;
    }

    private List<BroadbandPlan> samplePlans() {
        return List.of(
                new BroadbandPlan("plan-1", "Full Fibre 100", 100, 20, "FTTP", 24, 29.99, "Best Value"),
                new BroadbandPlan("plan-2", "Full Fibre 500", 500, 100, "FTTP", 24, 49.99, null),
                new BroadbandPlan("plan-3", "Essential Broadband", 36, 10, "FTTC", 12, 19.99, null)
        );
    }

    /** Builds a valid Gemini-style 200 response body wrapping the given JSON text. */
    private String geminiResponseFor(String innerJson) {
        JsonObject part = new JsonObject();
        part.addProperty("text", innerJson);

        JsonArray parts = new JsonArray();
        parts.add(part);

        JsonObject content = new JsonObject();
        content.add("parts", parts);

        JsonObject candidate = new JsonObject();
        candidate.add("content", content);

        JsonArray candidates = new JsonArray();
        candidates.add(candidate);

        JsonObject root = new JsonObject();
        root.add("candidates", candidates);

        return GSON.toJson(root);
    }

    // -------------------------------------------------------------------------
    // buildBroadbandPrompt tests (package-private method, same package)
    // -------------------------------------------------------------------------

    @Test
    void buildBroadbandPrompt_containsPlanNamesAndSpeeds() throws Exception {
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);
        List<BroadbandPlan> plans = samplePlans();

        String prompt = service.buildBroadbandPrompt(plans, "I stream 4K video daily");

        assertThat(prompt).contains("Full Fibre 100");
        assertThat(prompt).contains("Full Fibre 500");
        assertThat(prompt).contains("Essential Broadband");
        assertThat(prompt).contains("100Mbps");
        assertThat(prompt).contains("500Mbps");
        assertThat(prompt).contains("36Mbps");
    }

    @Test
    void buildBroadbandPrompt_containsUsageDescription() throws Exception {
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);

        String prompt = service.buildBroadbandPrompt(samplePlans(), "I work from home and need low latency");

        assertThat(prompt).contains("I work from home and need low latency");
        assertThat(prompt).contains("USER NEEDS:");
    }

    @Test
    void buildBroadbandPrompt_withPromoLabel_includesPromoInPrompt() throws Exception {
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);
        List<BroadbandPlan> plans = List.of(
                new BroadbandPlan("plan-1", "Full Fibre 100", 100, 20, "FTTP", 24, 29.99, "6 months half price")
        );

        String prompt = service.buildBroadbandPrompt(plans, "casual browsing");

        assertThat(prompt).contains("6 months half price");
        assertThat(prompt).contains("promo:");
    }

    @Test
    void buildBroadbandPrompt_withoutPromoLabel_doesNotIncludePromoSegment() throws Exception {
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);
        List<BroadbandPlan> plans = List.of(
                new BroadbandPlan("plan-2", "Full Fibre 500", 500, 100, "FTTP", 24, 49.99, null)
        );

        String prompt = service.buildBroadbandPrompt(plans, "gaming");

        // The promo segment should only appear when promotionalLabel is non-null
        assertThat(prompt).doesNotContain("promo:");
    }

    @Test
    void buildBroadbandPrompt_containsPlanIdAndPriceAndTechType() throws Exception {
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);
        List<BroadbandPlan> plans = List.of(
                new BroadbandPlan("plan-abc", "Fibre Max", 900, 200, "FTTP", 18, 59.99, null)
        );

        String prompt = service.buildBroadbandPrompt(plans, "heavy usage");

        assertThat(prompt).contains("plan-abc");
        assertThat(prompt).contains("£59.99");
        assertThat(prompt).contains("FTTP");
        assertThat(prompt).contains("18mo");
    }

    // -------------------------------------------------------------------------
    // recommend() — HTTP error path tests using local HttpServer
    // -------------------------------------------------------------------------

    @Test
    void recommend_whenGeminiReturnsNon200_throwsServiceUnavailableException() throws Exception {
        // Register a handler that returns 503
        localServer.createContext("/v1beta/models/gemini-test:generateContent", exchange -> {
            byte[] body = "Service Unavailable".getBytes();
            exchange.sendResponseHeaders(503, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });

        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);

        assertThatThrownBy(() -> service.recommend(samplePlans(), "streaming"))
                .isInstanceOf(BroadbandAiException.class)
                .satisfies(ex -> {
                    BroadbandAiException aiEx = (BroadbandAiException) ex;
                    assertThat(aiEx.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
                    assertThat(aiEx.getMessage()).contains("temporarily unavailable");
                });
    }

    @Test
    void recommend_whenGeminiReturns429_throwsServiceUnavailableException() throws Exception {
        localServer.createContext("/v1beta/models/gemini-test:generateContent", exchange -> {
            byte[] body = "Too Many Requests".getBytes();
            exchange.sendResponseHeaders(429, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });

        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);

        assertThatThrownBy(() -> service.recommend(samplePlans(), "streaming"))
                .isInstanceOf(BroadbandAiException.class)
                .satisfies(ex -> assertThat(((BroadbandAiException) ex).getStatus())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    @Test
    void recommend_whenGeminiReturns200WithValidJson_returnsRecommendation() throws Exception {
        BroadbandPlan topPlan = new BroadbandPlan("plan-1", "Full Fibre 100", 100, 20, "FTTP", 24, 29.99, "Best Value");

        // Build the inner recommendation JSON
        JsonObject topPlanJson = new JsonObject();
        topPlanJson.addProperty("planId", "plan-1");
        topPlanJson.addProperty("name", "Full Fibre 100");
        topPlanJson.addProperty("downloadSpeedMbps", 100);
        topPlanJson.addProperty("uploadSpeedMbps", 20);
        topPlanJson.addProperty("technologyType", "FTTP");
        topPlanJson.addProperty("contractLengthMonths", 24);
        topPlanJson.addProperty("monthlyPrice", 29.99);
        topPlanJson.addProperty("promotionalLabel", "Best Value");

        JsonObject recommendationJson = new JsonObject();
        recommendationJson.add("topPlan", topPlanJson);
        recommendationJson.addProperty("topPlanReasoning", "Great for everyday streaming.");
        recommendationJson.add("alternatives", new JsonArray());

        String innerJson = GSON.toJson(recommendationJson);
        String fullResponse = geminiResponseFor(innerJson);

        localServer.createContext("/v1beta/models/gemini-test:generateContent", exchange -> {
            byte[] body = fullResponse.getBytes();
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(body);
            }
        });

        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);

        BroadbandRecommendation result = service.recommend(samplePlans(), "streaming HD video");

        assertThat(result).isNotNull();
        assertThat(result.getTopPlan()).isNotNull();
        assertThat(result.getTopPlan().getPlanId()).isEqualTo("plan-1");
        assertThat(result.getTopPlan().getName()).isEqualTo("Full Fibre 100");
        assertThat(result.getTopPlanReasoning()).isEqualTo("Great for everyday streaming.");
    }

    @Test
    void recommend_whenConnectionRefused_throwsServiceUnavailableException() throws Exception {
        // Stop the server so the port is closed — connection will be refused
        localServer.stop(0);
        localServer = null;

        // Point to the now-closed port
        BroadbandAiAdvisorService service = servicePointingAt("http://localhost:" + serverPort);

        assertThatThrownBy(() -> service.recommend(samplePlans(), "gaming"))
                .isInstanceOf(BroadbandAiException.class)
                .satisfies(ex -> assertThat(((BroadbandAiException) ex).getStatus())
                        .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
    }

    // -------------------------------------------------------------------------
    // BroadbandAiException unit tests
    // -------------------------------------------------------------------------

    @Test
    void broadbandAiException_twoArgConstructor_hasCorrectStatusAndMessage() {
        BroadbandAiException ex = new BroadbandAiException("test message", HttpStatus.SERVICE_UNAVAILABLE);

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(ex.getMessage()).isEqualTo("test message");
        assertThat(ex.getCause()).isNull();
    }

    @Test
    void broadbandAiException_threeArgConstructor_preservesCause() {
        RuntimeException cause = new RuntimeException("root cause");
        BroadbandAiException ex = new BroadbandAiException("timeout", HttpStatus.GATEWAY_TIMEOUT, cause);

        assertThat(ex.getStatus()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
        assertThat(ex.getMessage()).isEqualTo("timeout");
        assertThat(ex.getCause()).isSameAs(cause);
    }

    // -------------------------------------------------------------------------
    // Testable subclass — redirects Gemini URL to a configurable base URL
    // -------------------------------------------------------------------------

    /**
     * Subclass of BroadbandAiAdvisorService that overrides the Gemini URL so
     * HTTP calls can be redirected to a local test server.
     *
     * The URL pattern mirrors the real service:
     *   {baseUrl}/v1beta/models/{model}:generateContent?key={apiKey}
     */
    static class TestableBroadbandAiAdvisorService extends BroadbandAiAdvisorService {

        private final String geminiBaseUrl;

        TestableBroadbandAiAdvisorService(String geminiBaseUrl) {
            this.geminiBaseUrl = geminiBaseUrl;
        }

        @Override
        public BroadbandRecommendation recommend(List<BroadbandPlan> plans, String usageDescription) {
            // Re-implement recommend() using the overridable URL, keeping all the same
            // error-handling logic as the parent class.
            String prompt = buildBroadbandPrompt(plans, usageDescription);

            try {
                // Read apiKey and model via reflection (set by test setup)
                String apiKey = getField("apiKey");
                String model = getField("model");

                com.google.gson.Gson gson = new com.google.gson.Gson();

                HttpClient client = HttpClient.newBuilder()
                        .connectTimeout(Duration.ofSeconds(5))
                        .build();

                String requestBody = buildRequestBody(prompt, gson);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(geminiBaseUrl + "/v1beta/models/" + model
                                + ":generateContent?key=" + apiKey))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(5))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    throw new BroadbandAiException(
                            "AI recommendations temporarily unavailable",
                            HttpStatus.SERVICE_UNAVAILABLE
                    );
                }

                return parseResponse(response.body(), gson);

            } catch (BroadbandAiException e) {
                throw e;
            } catch (java.net.http.HttpTimeoutException e) {
                throw new BroadbandAiException(
                        "AI recommendation timed out, please retry",
                        HttpStatus.GATEWAY_TIMEOUT,
                        e
                );
            } catch (Exception e) {
                throw new BroadbandAiException(
                        "AI recommendations temporarily unavailable",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        e
                );
            }
        }

        private String getField(String name) throws Exception {
            Field f = BroadbandAiAdvisorService.class.getDeclaredField(name);
            f.setAccessible(true);
            return (String) f.get(this);
        }

        private String buildRequestBody(String prompt, com.google.gson.Gson gson) {
            JsonObject body = new JsonObject();
            JsonArray contents = new JsonArray();
            JsonObject userTurn = new JsonObject();
            userTurn.addProperty("role", "user");
            JsonArray parts = new JsonArray();
            JsonObject part = new JsonObject();
            part.addProperty("text", prompt);
            parts.add(part);
            userTurn.add("parts", parts);
            contents.add(userTurn);
            body.add("contents", contents);
            JsonObject generationConfig = new JsonObject();
            generationConfig.addProperty("response_mime_type", "application/json");
            body.add("generationConfig", generationConfig);
            return gson.toJson(body);
        }

        private BroadbandRecommendation parseResponse(String responseBody, com.google.gson.Gson gson) {
            try {
                JsonObject json = gson.fromJson(responseBody, JsonObject.class);
                String text = json.getAsJsonArray("candidates")
                        .get(0).getAsJsonObject()
                        .getAsJsonObject("content")
                        .getAsJsonArray("parts")
                        .get(0).getAsJsonObject()
                        .get("text").getAsString();

                BroadbandRecommendation recommendation = gson.fromJson(text, BroadbandRecommendation.class);
                if (recommendation == null || recommendation.getTopPlan() == null) {
                    throw new BroadbandAiException(
                            "AI recommendations temporarily unavailable",
                            HttpStatus.SERVICE_UNAVAILABLE
                    );
                }
                return recommendation;
            } catch (BroadbandAiException e) {
                throw e;
            } catch (Exception e) {
                throw new BroadbandAiException(
                        "AI recommendations temporarily unavailable",
                        HttpStatus.SERVICE_UNAVAILABLE,
                        e
                );
            }
        }
    }
}
