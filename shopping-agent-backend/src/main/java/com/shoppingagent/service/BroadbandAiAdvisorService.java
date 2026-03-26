package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.shoppingagent.exception.BroadbandAiException;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.BroadbandRecommendation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;

@Service
public class BroadbandAiAdvisorService {

    private static final Logger logger = LoggerFactory.getLogger(BroadbandAiAdvisorService.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;

    private final Gson gson = new Gson();

    /**
     * Builds a broadband-specific prompt, calls Gemini, and parses the response
     * into a BroadbandRecommendation.
     *
     * @param plans            list of available broadband plans
     * @param usageDescription user's description of their broadband needs
     * @return parsed BroadbandRecommendation
     * @throws BroadbandAiException on Gemini error, parse failure, or timeout
     */
    public BroadbandRecommendation recommend(List<BroadbandPlan> plans, String usageDescription) {
        String prompt = buildBroadbandPrompt(plans, usageDescription);

        try {
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(TIMEOUT)
                    .build();

            String requestBody = buildGeminiRequestBody(prompt);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/"
                            + model + ":generateContent?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .timeout(TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                logger.error("Gemini returned non-200 status: {}", response.statusCode());
                throw new BroadbandAiException(
                        "AI recommendations temporarily unavailable",
                        HttpStatus.SERVICE_UNAVAILABLE
                );
            }

            return parseGeminiResponse(response.body());

        } catch (BroadbandAiException e) {
            throw e;
        } catch (java.net.http.HttpTimeoutException e) {
            logger.error("Gemini request timed out", e);
            throw new BroadbandAiException(
                    "AI recommendation timed out, please retry",
                    HttpStatus.GATEWAY_TIMEOUT,
                    e
            );
        } catch (Exception e) {
            logger.error("Error calling Gemini for broadband recommendation", e);
            throw new BroadbandAiException(
                    "AI recommendations temporarily unavailable",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    e
            );
        }
    }

    /**
     * Builds the broadband advisor prompt as specified in the design document.
     */
    String buildBroadbandPrompt(List<BroadbandPlan> plans, String usageDescription) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are a broadband advisor for AI.Shop. Respond ONLY in JSON.\n\n");
        sb.append("AVAILABLE PLANS:\n");

        for (BroadbandPlan plan : plans) {
            sb.append(plan.getPlanId()).append(":").append(plan.getName())
              .append("|down:").append(plan.getDownloadSpeedMbps()).append("Mbps")
              .append("|up:").append(plan.getUploadSpeedMbps()).append("Mbps")
              .append("|tech:").append(plan.getTechnologyType())
              .append("|contract:").append(plan.getContractLengthMonths()).append("mo")
              .append("|price:£").append(plan.getMonthlyPrice()).append("/mo");
            if (plan.getPromotionalLabel() != null && !plan.getPromotionalLabel().isBlank()) {
                sb.append("|promo:").append(plan.getPromotionalLabel());
            }
            sb.append("\n");
        }

        sb.append("\nUSER NEEDS: ").append(usageDescription).append("\n\n");
        sb.append("OUTPUT FORMAT:\n");
        sb.append("{\n");
        sb.append("  \"topPlan\": { <full BroadbandPlan object> },\n");
        sb.append("  \"topPlanReasoning\": \"Plain English explanation (2-3 sentences)\",\n");
        sb.append("  \"alternatives\": [\n");
        sb.append("    { \"plan\": { <BroadbandPlan> }, \"reasoning\": \"1 sentence\" },\n");
        sb.append("    { \"plan\": { <BroadbandPlan> }, \"reasoning\": \"1 sentence\" }\n");
        sb.append("  ]\n");
        sb.append("}\n\n");
        sb.append("RULES:\n");
        sb.append("- topPlan must be one of the plans listed above\n");
        sb.append("- alternatives must be different from topPlan and from each other\n");
        sb.append("- reasoning must reference the user's stated needs\n");
        sb.append("- If fewer than 3 plans exist, alternatives may have fewer than 2 entries\n");
        sb.append("- Respond with valid JSON only, no markdown fences\n");

        return sb.toString();
    }

    private String buildGeminiRequestBody(String prompt) {
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

    private BroadbandRecommendation parseGeminiResponse(String responseBody) {
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
            logger.error("Failed to parse Gemini broadband response", e);
            throw new BroadbandAiException(
                    "AI recommendations temporarily unavailable",
                    HttpStatus.SERVICE_UNAVAILABLE,
                    e
            );
        }
    }
}
