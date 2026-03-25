package com.shoppingagent.controller;

import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.model.RagContext;
import com.shoppingagent.model.SummaryCard;
import com.shoppingagent.service.GeminiService;
import com.shoppingagent.service.RagService;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {

    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private static final Pattern SHORT_ID_PATTERN = Pattern.compile("\\bp(\\d+)\\b");

    private final GeminiService geminiService;
    private final RagService ragService;

    public ChatController(GeminiService geminiService, RagService ragService) {
        this.geminiService = geminiService;
        this.ragService = ragService;
    }

    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        logger.info("POST /api/chat - Message: {}", request.getMessage());

        // Skip RAG for messages that don't need product/broadband knowledge
        ChatResponse response;
        RagContext ragContext = null;

        if (needsRagContext(request.getMessage())) {
            ragContext = ragService.retrieveContext(request.getMessage());

            if (ragContext != null) {
                logger.info("RAG context retrieved: {} documents, {} source IDs",
                        ragContext.getDocumentCount(), ragContext.getSourceIds().size());
                response = geminiService.chatWithContext(request, ragContext);
            } else {
                logger.warn("RAG context unavailable, falling back to full-catalog prompt");
                response = geminiService.chat(request);
            }
        } else {
            logger.info("Skipping RAG - message does not require product context");
            response = geminiService.chatWithContext(request, null);
        }

        // Resolve short IDs (p0, p1…) to real UUIDs from RagContext
        resolveShortIds(response, ragContext);

        String messagePreview = response.getMessage() != null
                ? response.getMessage().substring(0, Math.min(50, response.getMessage().length())) + "..."
                : "(null)";
        logger.info("AI Response - Action: {}, Message: {}", response.getAction(), messagePreview);
        return response;
    }

    /**
     * Determines whether a message needs RAG context (product/broadband knowledge).
     * Cart operations, navigation, greetings, and guided flow control don't need RAG.
     */
    private boolean needsRagContext(String message) {
        if (message == null || message.isEmpty()) return false;

        String lower = message.toLowerCase().trim();

        // Strip SYSTEM CONTEXT for intent detection
        int systemCtxIdx = lower.indexOf("[system context:");
        String userPart = systemCtxIdx >= 0 ? lower.substring(0, systemCtxIdx).trim() : lower;

        // Cart operations
        if (userPart.matches(".*(what('?s| is) in my cart|show my cart|view cart|cart contents|clear (my )?cart|empty (my )?cart|remove .* from cart).*")) {
            return false;
        }

        // Navigation
        if (userPart.matches(".*(go to|take me to|navigate to|open) (cart|checkout|orders|home|products page).*")) {
            return false;
        }

        // Greetings and simple responses
        if (userPart.matches("^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|sure|bye|help)$")) {
            return false;
        }

        // Guided flow control (these are handled by frontend, but if they reach backend)
        if (userPart.matches("^(cancel|go back|back|start over|skip|continue|next|done|proceed)$")) {
            return false;
        }

        // Coupon operations
        if (userPart.matches(".*(apply|use|remove|delete|show|list|what|any|available|valid) .*(coupon|code|promo|voucher|discount|deal).*") ||
            userPart.matches(".*(coupon|promo|voucher|discount|deal)s?\\b.*")) {
            return false;
        }

        // Quantity updates
        if (userPart.matches(".*(change|update|set) (quantity|qty).*")) {
            return false;
        }

        // Checkout
        if (userPart.matches(".*(checkout|pay|payment|place order|complete order).*")) {
            return false;
        }

        return true;
    }

    /**
     * Resolves short IDs (p0, p1, p2…) in the response payload and summary card IDs
     * to real UUIDs using the sourceIds list from RagContext.
     */
    void resolveShortIds(ChatResponse response, RagContext ragContext) {
        if (ragContext == null || ragContext.getSourceIds() == null || ragContext.getSourceIds().isEmpty()) {
            return;
        }

        List<String> sourceIds = ragContext.getSourceIds();

        // Resolve short IDs in payload (only for string payloads)
        if (response.getPayload() instanceof String) {
            response.setPayload(replaceShortIds((String) response.getPayload(), sourceIds));
        }

        // Resolve short IDs in summary card IDs
        if (response.getSummaryCards() != null) {
            for (SummaryCard card : response.getSummaryCards()) {
                if (card.getId() != null) {
                    card.setId(replaceShortIds(card.getId(), sourceIds));
                }
            }
        }
    }

    /**
     * Replaces short ID references (p0, p1, p2…) with actual UUIDs from the sourceIds list.
     */
    private String replaceShortIds(String text, List<String> sourceIds) {
        Matcher matcher = SHORT_ID_PATTERN.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            int index = Integer.parseInt(matcher.group(1));
            String replacement = (index >= 0 && index < sourceIds.size())
                    ? sourceIds.get(index)
                    : matcher.group(); // Keep original if index out of bounds
            matcher.appendReplacement(result, Matcher.quoteReplacement(replacement));
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
