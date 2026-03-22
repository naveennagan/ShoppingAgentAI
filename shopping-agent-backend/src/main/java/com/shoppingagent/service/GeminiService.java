package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.model.RagContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

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
            } else if (response.statusCode() == 429) {
                System.err.println("Gemini API rate limit exceeded: " + response.body());
                return new ChatResponse("NONE", null, "I'm getting a lot of requests right now. Please wait a few seconds and try again.");
            } else {
                System.err.println("Gemini API error (" + response.statusCode() + "): " + response.body());
                return new ChatResponse("NONE", null, "Sorry, the AI service is temporarily unavailable. Please try again in a moment.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return new ChatResponse("NONE", null, "Network error: " + e.getMessage());
        }
    }
    
    public ChatResponse chatWithContext(ChatRequest request, RagContext ragContext) {
        try {
            if (apiKey == null || apiKey.isEmpty()) {
                return new ChatResponse("NONE", null, "API Key not configured");
            }

            String systemPrompt = (ragContext != null)
                    ? buildRagSystemPrompt(ragContext, request.getCartItems(), request.getAppliedCouponCode())
                    : buildSystemPrompt();
            String requestBody = buildRequestBody(systemPrompt, request);

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

            if (response.statusCode() == 200) {
                return parseGeminiResponse(response.body());
            } else if (response.statusCode() == 429) {
                System.err.println("Gemini API rate limit exceeded: " + response.body());
                return new ChatResponse("NONE", null, "I'm getting a lot of requests right now. Please wait a few seconds and try again.");
            } else {
                System.err.println("Gemini API error (" + response.statusCode() + "): " + response.body());
                return new ChatResponse("NONE", null, "Sorry, the AI service is temporarily unavailable. Please try again in a moment.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            return new ChatResponse("NONE", null, "Network error: " + e.getMessage());
        }
    }
    
    private String buildRagSystemPrompt(RagContext ragContext, List<ChatRequest.CartItem> cartItems, String appliedCouponCode) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an AI Shopping Assistant for \"AI.Shop\". ")
              .append("Your goal is to help users find products, navigate the site, and manage their cart.\n\n")
              .append("RELEVANT CONTEXT:\n").append(ragContext.getContextWindow()).append("\n\n");

        // Include cart context when available
        if (cartItems != null && !cartItems.isEmpty()) {
            prompt.append("CURRENT CART:\n");
            for (ChatRequest.CartItem item : cartItems) {
                prompt.append("- ").append(item.getName())
                      .append(" (ID: ").append(item.getProductId())
                      .append(", Price: $").append(String.format("%.2f", item.getPrice()))
                      .append(", Qty: ").append(item.getQuantity()).append(")\n");
            }
            prompt.append("\n");
        } else {
            prompt.append("CURRENT CART: empty\n\n");
        }
        if (appliedCouponCode != null && !appliedCouponCode.isEmpty()) {
            prompt.append("APPLIED COUPON: ").append(appliedCouponCode).append("\n\n");
        }

        prompt.append("CAPABILITIES:\n").append(
               "- Search and recommend products based on user queries\n" +
               "- Add products to cart by ID\n" +
               "- Navigate to specific pages (/products, /cart, /checkout, /orders)\n" +
               "- Clear cart contents\n" +
               "- Autofill checkout with user data\n" +
               "- Show user order history\n\n" +
               "RESPONSE FORMAT:\n" +
               "You MUST respond with a JSON object containing:\n" +
               "{\"action\": \"NAVIGATE\" | \"ADD_TO_CART\" | \"CLEAR_CART\" | \"SHOW_PRODUCTS\" | \"NONE\", " +
               "\"payload\": \"URL path\" | \"Product ID\" | \"Comma-separated Product IDs\" | null, " +
               "\"message\": \"Helpful response to user\", " +
               "\"summaryCards\": [{\"type\": \"product\" | \"broadband\", \"id\": \"UUID\", \"name\": \"...\", \"price\": 0.0, \"brand\": \"...\", \"rating\": 0.0, " +
               "\"downloadSpeed\": \"...\", \"uploadSpeed\": \"...\", \"monthlyPrice\": 0.0, \"contractLength\": \"...\", \"promotionalLabel\": \"...\"}], " +
               "\"suggestedActions\": [\"action label 1\", \"action label 2\"]}\n\n" +
               "SUMMARY CARDS:\n" +
               "- Include summaryCards array when recommending products or broadband plans\n" +
               "- For products: include type, id, name, price, brand, rating, and promotionalLabel (if applicable)\n" +
               "- For broadband plans: include type, id, name, downloadSpeed, uploadSpeed, monthlyPrice, contractLength, and promotionalLabel (if applicable)\n" +
               "- Omit summaryCards if no specific items are being recommended\n\n" +
               "SUGGESTED ACTIONS:\n" +
               "- Include suggestedActions array with 2-4 contextual follow-up actions the user might want to take\n" +
               "- Examples: \"Compare plans\", \"Check availability\", \"View add-ons\", \"Add to cart\", \"Show deals\"\n\n" +
               "EXAMPLES:\n" +
               "User: \"Show me phones\" → {\"action\":\"SHOW_PRODUCTS\",\"payload\":\"1,2,3\",\"message\":\"Here are our available phones:\",\"summaryCards\":[...],\"suggestedActions\":[\"Compare prices\",\"View specs\"]}\n" +
               "User: \"Add iPhone to cart\" → {\"action\":\"ADD_TO_CART\",\"payload\":\"1\",\"message\":\"Added iPhone to your cart!\",\"suggestedActions\":[\"Go to checkout\",\"Continue shopping\"]}\n\n" +
               "LIST FORMATTING RULES:\n" +
               "- When responding with any list of 2 or more items (addresses, broadband plans, add-ons, plan features, appointment slots, or any other enumerable content), ALWAYS format them as a bulleted list using '•' or '-' characters. Each item must appear on its own line.\n" +
               "- Before the list, include the total count of items (e.g., 'I found 8 addresses:', 'Here are 3 available plans:').\n\n" +
               "PLAN FEATURE QUERY RECOGNITION:\n" +
               "- When the user asks about plan features, details, or specifications (e.g., 'tell me its features', 'what does this plan include', 'plan details', 'what are the features'), respond with the plan's key attributes: name, download speed, upload speed, technology type, contract length, monthly price, promotional label, router details, activation fee, speed guarantee, and out-of-contract price. Format these as a bulleted list.\n\n" +
               "INSTALLATION DATE QUERY RECOGNITION:\n" +
               "- When the user asks about installation dates, appointment scheduling, or engineer visits (e.g., 'confirm installation on 5 Apr', 'when is my installation', 'book installation', 'available installation dates', 'engineer visit'), route the request to the appointment service. Use action 'BOOK_APPOINTMENT' with the requested date/time in the payload, or action 'CHECK_APPOINTMENT' to retrieve existing appointment details. Do NOT deflect installation queries to customer support.\n\n" +
               "IMPORTANT RULES:\n" +
               "- When user asks to see/show/display products, ALWAYS use SHOW_PRODUCTS action\n" +
               "- Include relevant product IDs in payload as comma-separated string\n" +
               "- Never use NONE action for product display requests\n" +
               "- When the user asks about their cart contents and the CURRENT CART is empty, clearly tell them their cart is empty and suggest browsing products. Do NOT navigate to /cart or show checkout options for an empty cart.\n" +
               "- If the user asks about broadband, fibre, internet plans, or anything broadband-related, DO NOT say you don't have broadband. Acknowledge what they are looking for and ask for their UK postcode so you can check broadband availability at their address. If a SYSTEM CONTEXT is provided about a broadband guided flow, follow those instructions.\n" +
               "- Use the source IDs from the RELEVANT CONTEXT when referencing products or plans");

        return prompt.toString();
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
               "{\"action\": \"NAVIGATE\" | \"ADD_TO_CART\" | \"CLEAR_CART\" | \"SHOW_PRODUCTS\" | \"NONE\", " +
               "\"payload\": \"URL path\" | \"Product ID\" | \"Comma-separated Product IDs\" | null, " +
               "\"message\": \"Helpful response to user\"}\n\n" +
               "EXAMPLES:\n" +
               "User: \"Show me phones\" → {\"action\":\"SHOW_PRODUCTS\",\"payload\":\"1,2,3\",\"message\":\"Here are our available phones:\"}\n" +
               "User: \"Show me iPhones\" → {\"action\":\"SHOW_PRODUCTS\",\"payload\":\"1,2\",\"message\":\"Here are our iPhones:\"}\n" +
               "User: \"Add iPhone to cart\" → {\"action\":\"ADD_TO_CART\",\"payload\":\"1\",\"message\":\"Added iPhone to your cart!\"}\n" +
               "User: \"Go to checkout\" → {\"action\":\"NAVIGATE\",\"payload\":\"/checkout\",\"message\":\"Taking you to checkout...\"}\n" +
               "User: \"Show my orders\" → {\"action\":\"NAVIGATE\",\"payload\":\"/orders\",\"message\":\"Here are your orders...\"}\n" +
               "User: \"Clear my cart\" → {\"action\":\"CLEAR_CART\",\"payload\":null,\"message\":\"Cart cleared!\"}\n\n" +
               "IMPORTANT RULES:\n" +
               "- When user asks to see/show/display products, ALWAYS use SHOW_PRODUCTS action\n" +
               "- Include relevant product IDs in payload as comma-separated string\n" +
               "- Never use NONE action for product display requests\n" +
               "- When the user asks about their cart contents and the cart is empty, clearly tell them their cart is empty and suggest browsing products. Do NOT navigate to /cart or show checkout options for an empty cart.\n" +
               "- If the user asks about broadband, fibre, internet plans, or anything broadband-related, DO NOT say you don't have broadband. Acknowledge what they are looking for and ask for their UK postcode so you can check broadband availability at their address. If a SYSTEM CONTEXT is provided about a broadband guided flow, follow those instructions.";
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
