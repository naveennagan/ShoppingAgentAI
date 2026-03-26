package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.model.Promotion;
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
    private final PromotionService promotionService;
    private final Gson gson = new Gson();
    
    public GeminiService(ProductService productService, PromotionService promotionService) {
        this.productService = productService;
        this.promotionService = promotionService;
    }
    
    public ChatResponse chat(ChatRequest request) {
        try {
            if (apiKey == null || apiKey.isEmpty()) {
                return new ChatResponse("NONE", null, "API Key not configured");
            }
            
            String systemPrompt = buildSystemPrompt(request.getCartItems(), request.getAppliedDeviceCoupon(), request.getAppliedBroadbandCoupon());
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
                    ? buildRagSystemPrompt(ragContext, request.getCartItems(), request.getAppliedDeviceCoupon(), request.getAppliedBroadbandCoupon())
                    : buildSystemPrompt(request.getCartItems(), request.getAppliedDeviceCoupon(), request.getAppliedBroadbandCoupon());
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
    
    private String buildRagSystemPrompt(RagContext ragContext, List<ChatRequest.CartItem> cartItems, String appliedDeviceCoupon, String appliedBroadbandCoupon) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an AI Shopping Assistant for \"AI.Shop\". ")
              .append("Your goal is to help users find products, navigate the site, and manage their cart.\n\n")
              .append("RELEVANT CONTEXT:\n").append(ragContext.getContextWindow()).append("\n\n");

        // Include cart context when available, grouped by type
        if (cartItems != null && !cartItems.isEmpty()) {
            List<ChatRequest.CartItem> deviceItems = cartItems.stream()
                    .filter(i -> !"broadband".equals(i.getItemType()))
                    .collect(java.util.stream.Collectors.toList());
            List<ChatRequest.CartItem> broadbandItems = cartItems.stream()
                    .filter(i -> "broadband".equals(i.getItemType()))
                    .collect(java.util.stream.Collectors.toList());

            prompt.append("CURRENT CART:\n");
            if (!deviceItems.isEmpty()) {
                prompt.append("Devices (pay today):\n");
                for (ChatRequest.CartItem item : deviceItems) {
                    prompt.append("- ").append(item.getName())
                          .append(" (ID: ").append(item.getProductId())
                          .append(", Price: £").append(String.format("%.2f", item.getPrice()))
                          .append(", Qty: ").append(item.getQuantity()).append(")\n");
                }
            }
            if (!broadbandItems.isEmpty()) {
                prompt.append("Broadband (monthly):\n");
                for (ChatRequest.CartItem item : broadbandItems) {
                    prompt.append("- ").append(item.getName())
                          .append(" (ID: ").append(item.getProductId())
                          .append(", Price: £").append(String.format("%.2f", item.getPrice()))
                          .append("/mo, Qty: ").append(item.getQuantity()).append(")\n");
                }
            }
            prompt.append("\n");
        } else {
            prompt.append("CURRENT CART: empty\n\n");
        }
        prompt.append("APPLIED COUPONS:\n");
        if (appliedDeviceCoupon != null && !appliedDeviceCoupon.isEmpty()) {
            prompt.append("- Device coupon: ").append(appliedDeviceCoupon).append("\n");
        } else {
            prompt.append("- Device coupon: none\n");
        }
        if (appliedBroadbandCoupon != null && !appliedBroadbandCoupon.isEmpty()) {
            prompt.append("- Broadband coupon: ").append(appliedBroadbandCoupon).append("\n");
        } else {
            prompt.append("- Broadband coupon: none\n");
        }
        prompt.append("\n");

        prompt.append(buildPromotionsContext());

        prompt.append("CAPABILITIES:\n").append(
               "- Search and recommend products based on user queries\n" +
               "- Add products to cart by ID\n" +
               "- Navigate to specific pages (/products, /cart, /checkout, /orders)\n" +
               "- Clear cart contents\n" +
               "- Autofill checkout with user data\n" +
               "- Show user order history\n" +
               "- List available coupons/promotions and apply or remove them\n\n" +
               "RESPONSE FORMAT:\n" +
               "You MUST respond with a JSON object containing:\n" +
               "{\"action\": \"NAVIGATE\" | \"ADD_TO_CART\" | \"CLEAR_CART\" | \"SHOW_PRODUCTS\" | \"APPLY_COUPON\" | \"REMOVE_COUPON\" | \"AUTOFILL_CHECKOUT\" | \"EDIT_CHECKOUT\" | \"FETCH_ORDERS\" | \"ADVANCE_STEP\" | \"NONE\", " +
               "\"payload\": \"URL path\" | \"Product ID\" | \"Comma-separated Product IDs\" | {\"code\": \"PROMO_CODE\", \"itemType\": \"device\" | \"broadband\" | \"both\"} | null, " +
               "\"message\": \"Helpful response to user\", " +
               "\"summaryCards\": [{\"type\": \"product\" | \"broadband\", \"id\": \"UUID\", \"name\": \"...\", \"price\": 0.0, \"brand\": \"...\", \"rating\": 0.0, " +
               "\"downloadSpeed\": \"...\", \"uploadSpeed\": \"...\", \"monthlyPrice\": 0.0, \"contractLength\": \"...\", \"promotionalLabel\": \"...\"}], " +
               "\"suggestedActions\": [\"action label 1\", \"action label 2\"], " +
               "\"comparison\": {\"products\": [\"Name A\", \"Name B\"], \"rows\": [{\"field\": \"Price\", \"values\": [\"£x\", \"£y\"]}]}}\n\n" +
               "COUPON/PROMOTION RULES:\n" +
               "- Each coupon has an 'Applies to' field: 'device' (phones/laptops/etc), 'broadband', or 'both'.\n" +
               "- When the user asks about coupons for their cart, ONLY show coupons that match the item types in their CURRENT CART. Do NOT show device-only coupons for a broadband cart, or broadband-only coupons for a device cart. Coupons with 'both' always apply.\n" +
               "- When listing coupons, format each one on its own line as a numbered list. Each item MUST be on a separate line. Example:\n" +
               "1. WELCOME20 — £20 off your first phone purchase\n" +
               "2. DEVICE10 — 10% off device purchases\n" +
               "- When the user asks to apply a coupon code, use action APPLY_COUPON with payload {\"code\": \"THE_CODE\", \"itemType\": \"device\" | \"broadband\" | \"both\"}. Set itemType based on what the user wants. Use \"both\" when the user wants to apply to both device and broadband.\n" +
               "- When the user asks to remove a coupon, use action REMOVE_COUPON.\n" +
               "- If a coupon is already applied (see APPLIED COUPONS above), tell the user which slot (device/broadband) it's on. A coupon applied to devices does NOT automatically apply to broadband, and vice versa.\n" +
               "- NEVER say you cannot apply coupons. You CAN list and apply them.\n\n" +
               "COMPARISON:\n" +
               "- When the user asks to compare 2-3 products, include a comparison field in the response.\n" +
               "- Format: \"comparison\": {\"products\": [\"Product A\", \"Product B\"], \"rows\": [{\"field\": \"Price\", \"values\": [\"£x\", \"£y\"]}, {\"field\": \"Brand\", \"values\": [\"A\", \"B\"]}]}\n" +
               "- Include rows for: Price, Brand, Category, Rating, and all available spec fields (Storage, RAM, Display, Battery, Camera, OS, etc).\n" +
               "- Keep the message brief when showing a comparison table.\n\n" +
               "SUMMARY CARDS:\n" +
               "- Include summaryCards array when recommending products or broadband plans\n" +
               "- For products: include type, id, name, price, brand, rating, and promotionalLabel (if applicable)\n" +
               "- For broadband plans: include type, id, name, downloadSpeed, uploadSpeed, monthlyPrice, contractLength, and promotionalLabel (if applicable)\n" +
               "- Omit summaryCards if no specific items are being recommended\n\n" +
               "SUGGESTED ACTIONS:\n" +
               "- Only include suggestedActions in these situations: (1) after showing products/plans, (2) after adding to cart, (3) when the user first starts a conversation, (4) when the user seems unsure what to do next.\n" +
               "- Do NOT include suggestedActions for simple conversational replies, confirmations, or when the user is clearly in the middle of a task.\n" +
               "- When included, limit to 2-4 contextual follow-up actions.\n" +
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
               "- ORDERS: When user says 'view my orders', 'show my orders', 'what are my orders', use FETCH_ORDERS to display order details in chat. When user says 'go to orders', 'take me to orders', 'open orders page', use NAVIGATE with '/orders'.\n" +
               "- When user asks to see/show/display products, ALWAYS use SHOW_PRODUCTS action\n" +
               "- Include relevant product IDs in payload as comma-separated string\n" +
               "- Never use NONE action for product display requests\n" +
               "- When the user asks about their cart contents and the CURRENT CART is empty, clearly tell them their cart is empty and suggest browsing products. Do NOT navigate to /cart or show checkout options for an empty cart.\n" +
               "- When showing cart contents, ALWAYS separate devices and broadband. Show device items with 'Pay Today' total and broadband items with 'Monthly' total. NEVER add device and broadband prices together into a single total. Show applied coupons per category.\n" +
               "- If the user asks about broadband, fibre, internet plans, or anything broadband-related, DO NOT say you don't have broadband. Acknowledge what they are looking for and ask for their UK postcode so you can check broadband availability at their address. If a SYSTEM CONTEXT is provided about a broadband guided flow, follow those instructions.\n" +
               "- Use the source IDs from the RELEVANT CONTEXT when referencing products or plans\n" +
               "- ADVANCE_STEP: When a SYSTEM CONTEXT mentions a broadband guided flow step and the user clearly wants to skip, move on, proceed, or is done with the current optional step (add-ons, TV packages, SIM plans, home phone), use action ADVANCE_STEP. This tells the frontend to move to the next step. Include a brief friendly message acknowledging their choice.\n\n" +
               "CHECKOUT ACTIONS:\n" +
               "The checkout has two sections with DIFFERENT fields. You MUST use the exact field names below.\n" +
               "ABOUT YOU section fields: fullName, email, phone, address\n" +
               "PAYMENT section fields: cardholderName, last4Digits\n" +
               "- AUTOFILL_CHECKOUT: Fills all checkout fields and navigates to payment. Payload: {\"fullName\":\"...\",\"email\":\"...\",\"phone\":\"...\",\"address\":\"...\",\"cardholderName\":\"...\",\"last4Digits\":\"....\"}. All fields optional, defaults used if omitted.\n" +
               "- EDIT_CHECKOUT: Updates specific fields without navigating. Only include the fields being changed.\n" +
               "  Examples:\n" +
               "  'change my name to Sarah' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"fullName\":\"Sarah\"},\"message\":\"Updated your name to Sarah.\"}\n" +
               "  'change cardholder name to Bob' or 'change card name to Bob' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"cardholderName\":\"Bob\"},\"message\":\"Updated cardholder name to Bob.\"}\n" +
               "  'update card to 5678' or 'change last 4 digits to 5678' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"last4Digits\":\"5678\"},\"message\":\"Updated card digits.\"}\n" +
               "  'change email to x@y.com' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"email\":\"x@y.com\"},\"message\":\"Updated email.\"}\n" +
               "  'fill card as Jane and 6345' → {\"action\":\"AUTOFILL_CHECKOUT\",\"payload\":{\"cardholderName\":\"Jane\",\"last4Digits\":\"6345\"},\"message\":\"Filled card details.\"}\n" +
               "DISAMBIGUATION: 'name' alone means fullName (About You). 'cardholder name' or 'card name' means cardholderName (Payment). A 4-digit number always means last4Digits.");

        return prompt.toString();
    }
    
    private String buildSystemPrompt(List<ChatRequest.CartItem> cartItems, String appliedDeviceCoupon, String appliedBroadbandCoupon) {
        String productsJson = gson.toJson(productService.getAllProducts());
        StringBuilder prompt = new StringBuilder();
        prompt.append("You are an AI Shopping Assistant for \"AI.Shop\". ")
              .append("Your goal is to help users find products, navigate the site, and manage their cart.\n\n")
              .append("AVAILABLE PRODUCTS:\n").append(productsJson).append("\n\n");

        if (cartItems != null && !cartItems.isEmpty()) {
            List<ChatRequest.CartItem> deviceItems = cartItems.stream()
                    .filter(i -> !"broadband".equals(i.getItemType()))
                    .collect(java.util.stream.Collectors.toList());
            List<ChatRequest.CartItem> broadbandItems = cartItems.stream()
                    .filter(i -> "broadband".equals(i.getItemType()))
                    .collect(java.util.stream.Collectors.toList());

            prompt.append("CURRENT CART:\n");
            if (!deviceItems.isEmpty()) {
                prompt.append("Devices (pay today):\n");
                for (ChatRequest.CartItem item : deviceItems) {
                    prompt.append("- ").append(item.getName())
                          .append(" (ID: ").append(item.getProductId())
                          .append(", Price: £").append(String.format("%.2f", item.getPrice()))
                          .append(", Qty: ").append(item.getQuantity()).append(")\n");
                }
            }
            if (!broadbandItems.isEmpty()) {
                prompt.append("Broadband (monthly):\n");
                for (ChatRequest.CartItem item : broadbandItems) {
                    prompt.append("- ").append(item.getName())
                          .append(" (ID: ").append(item.getProductId())
                          .append(", Price: £").append(String.format("%.2f", item.getPrice()))
                          .append("/mo, Qty: ").append(item.getQuantity()).append(")\n");
                }
            }
            prompt.append("\n");
        } else {
            prompt.append("CURRENT CART: empty\n\n");
        }
        prompt.append("APPLIED COUPONS:\n");
        if (appliedDeviceCoupon != null && !appliedDeviceCoupon.isEmpty()) {
            prompt.append("- Device coupon: ").append(appliedDeviceCoupon).append("\n");
        } else {
            prompt.append("- Device coupon: none\n");
        }
        if (appliedBroadbandCoupon != null && !appliedBroadbandCoupon.isEmpty()) {
            prompt.append("- Broadband coupon: ").append(appliedBroadbandCoupon).append("\n");
        } else {
            prompt.append("- Broadband coupon: none\n");
        }
        prompt.append("\n");

        prompt.append(buildPromotionsContext());

        prompt.append(
               "CAPABILITIES:\n" +
               "- Search and recommend products based on user queries\n" +
               "- Add products to cart by ID\n" +
               "- Navigate to specific pages (/products, /cart, /checkout, /orders)\n" +
               "- Clear cart contents\n" +
               "- Autofill checkout with user data\n" +
               "- Show user order history\n" +
               "- List available coupons/promotions and apply or remove them\n\n" +
               "RESPONSE FORMAT:\n" +
               "You MUST respond with a JSON object containing:\n" +
               "{\"action\": \"NAVIGATE\" | \"ADD_TO_CART\" | \"CLEAR_CART\" | \"SHOW_PRODUCTS\" | \"APPLY_COUPON\" | \"REMOVE_COUPON\" | \"AUTOFILL_CHECKOUT\" | \"EDIT_CHECKOUT\" | \"FETCH_ORDERS\" | \"ADVANCE_STEP\" | \"NONE\", " +
               "\"payload\": \"URL path\" | \"Product ID\" | \"Comma-separated Product IDs\" | {\"code\": \"PROMO_CODE\", \"itemType\": \"device\" | \"broadband\" | \"both\"} | null, " +
               "\"message\": \"Helpful response to user\"}\n\n" +
               "COUPON/PROMOTION RULES:\n" +
               "- Each coupon has an 'Applies to' field: 'device' (phones/laptops/etc), 'broadband', or 'both'.\n" +
               "- When the user asks about coupons for their cart, ONLY show coupons that match the item types in their cart. Do NOT show device-only coupons for a broadband cart, or broadband-only coupons for a device cart. Coupons with 'both' always apply.\n" +
               "- When listing coupons, format each one on its own line as a numbered list. Each item MUST be on a separate line. Example:\n" +
               "1. WELCOME20 — £20 off your first phone purchase\n" +
               "2. DEVICE10 — 10% off device purchases\n" +
               "- When the user asks to apply a coupon code, use action APPLY_COUPON with payload {\"code\": \"THE_CODE\", \"itemType\": \"device\" | \"broadband\" | \"both\"}. Set itemType based on what the user wants. Use \"both\" when the user wants to apply to both device and broadband.\n" +
               "- When the user asks to remove a coupon, use action REMOVE_COUPON.\n" +
               "- NEVER say you cannot apply coupons. You CAN list and apply them.\n\n" +
               "COMPARISON:\n" +
               "- When the user asks to compare 2-3 products, include a comparison field: \"comparison\": {\"products\": [\"Name A\", \"Name B\"], \"rows\": [{\"field\": \"Price\", \"values\": [\"£x\", \"£y\"]}]}\n" +
               "- Include rows for: Price, Brand, Category, Rating, and all available spec fields.\n\n" +
               "EXAMPLES:\n" +
               "User: \"Show me phones\" → {\"action\":\"SHOW_PRODUCTS\",\"payload\":\"1,2,3\",\"message\":\"Here are our available phones:\"}\n" +
               "User: \"Show me iPhones\" → {\"action\":\"SHOW_PRODUCTS\",\"payload\":\"1,2\",\"message\":\"Here are our iPhones:\"}\n" +
               "User: \"Add iPhone to cart\" → {\"action\":\"ADD_TO_CART\",\"payload\":\"1\",\"message\":\"Added iPhone to your cart!\"}\n" +
               "User: \"Go to checkout\" → {\"action\":\"NAVIGATE\",\"payload\":\"/checkout\",\"message\":\"Taking you to checkout...\"}\n" +
               "User: \"Show my orders\" → {\"action\":\"FETCH_ORDERS\",\"payload\":null,\"message\":\"Let me check your orders...\"}\n" +
               "User: \"Go to my orders\" → {\"action\":\"NAVIGATE\",\"payload\":\"/orders\",\"message\":\"Taking you to the orders page.\"}\n" +
               "User: \"Clear my cart\" → {\"action\":\"CLEAR_CART\",\"payload\":null,\"message\":\"Cart cleared!\"}\n\n" +
               "IMPORTANT RULES:\n" +
               "- ORDERS: When user says 'view my orders', 'show my orders', 'what are my orders', use FETCH_ORDERS to display order details in chat. When user says 'go to orders', 'take me to orders', 'open orders page', use NAVIGATE with '/orders'.\n" +
               "- When user asks to see/show/display products, ALWAYS use SHOW_PRODUCTS action\n" +
               "- Include relevant product IDs in payload as comma-separated string\n" +
               "- Never use NONE action for product display requests\n" +
               "- When the user asks about their cart contents and the cart is empty, clearly tell them their cart is empty and suggest browsing products. Do NOT navigate to /cart or show checkout options for an empty cart.\n" +
               "- When showing cart contents, ALWAYS separate devices and broadband. Show device items with 'Pay Today' total and broadband items with 'Monthly' total. NEVER add device and broadband prices together into a single total. Show applied coupons per category.\n" +
               "- If the user asks about broadband, fibre, internet plans, or anything broadband-related, DO NOT say you don't have broadband. Acknowledge what they are looking for and ask for their UK postcode so you can check broadband availability at their address. If a SYSTEM CONTEXT is provided about a broadband guided flow, follow those instructions.\n" +
               "- ADVANCE_STEP: When a SYSTEM CONTEXT mentions a broadband guided flow step and the user clearly wants to skip, move on, proceed, or is done with the current optional step (add-ons, TV packages, SIM plans, home phone), use action ADVANCE_STEP. This tells the frontend to move to the next step. Include a brief friendly message acknowledging their choice.\n\n" +
               "CHECKOUT ACTIONS:\n" +
               "The checkout has two sections with DIFFERENT fields. You MUST use the exact field names below.\n" +
               "ABOUT YOU section fields: fullName, email, phone, address\n" +
               "PAYMENT section fields: cardholderName, last4Digits\n" +
               "- AUTOFILL_CHECKOUT: Fills all checkout fields and navigates to payment. Payload: {\"fullName\":\"...\",\"email\":\"...\",\"phone\":\"...\",\"address\":\"...\",\"cardholderName\":\"...\",\"last4Digits\":\"....\"}. All fields optional, defaults used if omitted.\n" +
               "- EDIT_CHECKOUT: Updates specific fields without navigating. Only include the fields being changed.\n" +
               "  Examples:\n" +
               "  'change my name to Sarah' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"fullName\":\"Sarah\"},\"message\":\"Updated your name to Sarah.\"}\n" +
               "  'change cardholder name to Bob' or 'change card name to Bob' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"cardholderName\":\"Bob\"},\"message\":\"Updated cardholder name to Bob.\"}\n" +
               "  'update card to 5678' or 'change last 4 digits to 5678' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"last4Digits\":\"5678\"},\"message\":\"Updated card digits.\"}\n" +
               "  'change email to x@y.com' → {\"action\":\"EDIT_CHECKOUT\",\"payload\":{\"email\":\"x@y.com\"},\"message\":\"Updated email.\"}\n" +
               "  'fill card as Jane and 6345' → {\"action\":\"AUTOFILL_CHECKOUT\",\"payload\":{\"cardholderName\":\"Jane\",\"last4Digits\":\"6345\"},\"message\":\"Filled card details.\"}\n" +
               "DISAMBIGUATION: 'name' alone means fullName (About You). 'cardholder name' or 'card name' means cardholderName (Payment). A 4-digit number always means last4Digits.");
        return prompt.toString();
    }
    
    private String buildRequestBody(String systemPrompt, ChatRequest request) {
        JsonObject body = new JsonObject();
        
        // Build contents array with conversation history
        StringBuilder contentsBuilder = new StringBuilder();
        contentsBuilder.append("[");
        // System prompt as first user message
        contentsBuilder.append("{\"role\":\"user\",\"parts\":[{\"text\":\"");
        contentsBuilder.append(escapeJson(systemPrompt));
        contentsBuilder.append("\"}]},");
        contentsBuilder.append("{\"role\":\"model\",\"parts\":[{\"text\":\"{\\\"action\\\":\\\"NONE\\\",\\\"payload\\\":null,\\\"message\\\":\\\"Ready\\\"}\"}]}");

        // Include conversation history
        if (request.getHistory() != null && !request.getHistory().isEmpty()) {
            for (ChatRequest.ChatMessage msg : request.getHistory()) {
                String role = "user".equals(msg.getRole()) ? "user" : "model";
                contentsBuilder.append(",{\"role\":\"").append(role).append("\",\"parts\":[{\"text\":\"");
                contentsBuilder.append(escapeJson(msg.getText()));
                contentsBuilder.append("\"}]}");
            }
        }

        // Current message
        contentsBuilder.append(",{\"role\":\"user\",\"parts\":[{\"text\":\"");
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

    private String buildPromotionsContext() {
        try {
            List<Promotion> promotions = promotionService.getAllPromotions();
            if (promotions == null || promotions.isEmpty()) {
                return "";
            }
            StringBuilder sb = new StringBuilder();
            sb.append("AVAILABLE COUPONS/PROMOTIONS:\n");
            for (Promotion p : promotions) {
                if (!p.isActive()) continue;
                sb.append("- Code: ").append(p.getPromoCode() != null ? p.getPromoCode() : "N/A");
                sb.append(", Name: ").append(p.getName());
                sb.append(", Discount: ").append(p.getDiscountValue());
                sb.append(p.getDiscountType() != null && p.getDiscountType().equals("percentage") ? "%" : " off");
                if (p.getDescription() != null && !p.getDescription().isEmpty()) {
                    sb.append(", Description: ").append(p.getDescription());
                }
                String itemType = p.getApplicableItemType();
                if (itemType == null || itemType.isBlank()) {
                    itemType = "both";
                }
                sb.append(", Applies to: ").append(itemType);
                sb.append("\n");
            }
            sb.append("\n");
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
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
