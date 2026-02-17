package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class GeminiService {
    
    @Value("${gemini.api.key}")
    private String apiKey;
    
    @Value("${gemini.model:gemini-2.5-flash}")
    private String model;
    
    private final ProductService productService;
    private final Gson gson = new Gson();
    
    public GeminiService(ProductService productService) {
        this.productService = productService;
    }
    
    public ChatResponse chat(ChatRequest request) {
        try {
            if (apiKey == null || apiKey.isEmpty()) {
                return new ChatResponse("NONE", null, "API Key not configured");
            }
            
            String systemPrompt = buildSystemPrompt();
            String requestBody = buildRequestBody(systemPrompt, request);
            
//            System.out.println("Request Body: " + requestBody);
            
            HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_2)
                .build();
            
            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();
            
            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            
            System.out.println("Response Status: " + response.statusCode());
//            System.out.println("Response Body: " + response.body());
            
            if (response.statusCode() == 200) {
                return parseGeminiResponse(response.body());
            } else {
                return new ChatResponse("NONE", null, "API Error: " + response.body());
            }
        } catch (Exception e) {
            e.printStackTrace();
            return new ChatResponse("NONE", null, "Network error: " + e.getMessage());
        }
    }
    
    private String buildSystemPrompt() {
        String productsJson = gson.toJson(productService.getAllProducts());
        return "You are an AI Shopping Assistant for \"AI.Shop\". " +
               "Your goal is to help users find products, navigate the site, and manage their cart.\n\n" +
               "AVAILABLE PRODUCTS:\n" + productsJson + "\n\n" +
               "CAPABILITIES:\n" +
               "- Search and recommend products based on user queries\n" +
               "- Add products to cart by ID\n" +
               "- Navigate to specific pages (/products, /cart, /checkout, /orders)\n" +
               "- Clear cart contents\n" +
               "- Autofill checkout with user data\n" +
               "- Show user order history\n\n" +
               "RESPONSE FORMAT:\n" +
               "You MUST respond with a JSON object containing:\n" +
               "{\"action\": \"NAVIGATE\" | \"ADD_TO_CART\" | \"CLEAR_CART\" | \"AUTOFILL_CHECKOUT\" | \"NONE\", " +
               "\"payload\": \"URL path\" | \"Product ID\" | \"JSON string\" | null, " +
               "\"message\": \"Helpful response to user\"}\n\n" +
               "EXAMPLES:\n" +
               "User: \"Show me phones\" → {\"action\":\"NONE\",\"payload\":null,\"message\":\"Here are our phones: [list products]\"}\n" +
               "User: \"Add iPhone to cart\" → {\"action\":\"ADD_TO_CART\",\"payload\":\"1\",\"message\":\"Added iPhone to your cart!\"}\n" +
               "User: \"Go to checkout\" → {\"action\":\"NAVIGATE\",\"payload\":\"/checkout\",\"message\":\"Taking you to checkout...\"}\n" +
               "User: \"Show my orders\" → {\"action\":\"NAVIGATE\",\"payload\":\"/orders\",\"message\":\"Here are your orders...\"}\n" +
               "User: \"Clear my cart\" → {\"action\":\"CLEAR_CART\",\"payload\":null,\"message\":\"Cart cleared!\"}";
    }
    
    private String buildRequestBody(String systemPrompt, ChatRequest request) {
        JsonObject body = new JsonObject();
        
        // Build contents array properly
        StringBuilder contentsBuilder = new StringBuilder();
        contentsBuilder.append("[");
        contentsBuilder.append("{\"role\":\"user\",\"parts\":[{\"text\":\"");
        contentsBuilder.append(escapeJson(systemPrompt));
        contentsBuilder.append("\"}]},");
        contentsBuilder.append("{\"role\":\"model\",\"parts\":[{\"text\":\"{\\\"action\\\":\\\"NONE\\\",\\\"payload\\\":null,\\\"message\\\":\\\"Ready\\\"}\"}]},");
        contentsBuilder.append("{\"role\":\"user\",\"parts\":[{\"text\":\"");
        contentsBuilder.append(escapeJson(request.getMessage()));
        contentsBuilder.append("\"}]}");
        contentsBuilder.append("]");
        
        // Parse the string as JSON array
        com.google.gson.JsonArray contents = gson.fromJson(contentsBuilder.toString(), com.google.gson.JsonArray.class);
        body.add("contents", contents);
        
        JsonObject generationConfig = new JsonObject();
        generationConfig.addProperty("response_mime_type", "application/json");
        body.add("generationConfig", generationConfig);
        
        return gson.toJson(body);
    }
    
    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                   .replace("\"", "\\\"")
                   .replace("\n", "\\n")
                   .replace("\r", "\\r")
                   .replace("\t", "\\t");
    }
    
    private ChatResponse parseGeminiResponse(String responseBody) {
        try {
            JsonObject json = gson.fromJson(responseBody, JsonObject.class);
            String text = json.getAsJsonArray("candidates")
                .get(0).getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
                .get(0).getAsJsonObject()
                .get("text").getAsString();
            
            return gson.fromJson(text, ChatResponse.class);
        } catch (Exception e) {
            return new ChatResponse("NONE", null, "Error parsing AI response");
        }
    }
}
