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

        // Retrieve RAG context for the user query
        RagContext ragContext = ragService.retrieveContext(request.getMessage());

        ChatResponse response;
        if (ragContext != null) {
            logger.info("RAG context retrieved: {} documents, {} source IDs",
                    ragContext.getDocumentCount(), ragContext.getSourceIds().size());
            response = geminiService.chatWithContext(request, ragContext);
        } else {
            logger.warn("RAG context unavailable, falling back to full-catalog prompt");
            response = geminiService.chat(request);
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
     * Resolves short IDs (p0, p1, p2…) in the response payload and summary card IDs
     * to real UUIDs using the sourceIds list from RagContext.
     */
    void resolveShortIds(ChatResponse response, RagContext ragContext) {
        if (ragContext == null || ragContext.getSourceIds() == null || ragContext.getSourceIds().isEmpty()) {
            return;
        }

        List<String> sourceIds = ragContext.getSourceIds();

        // Resolve short IDs in payload
        if (response.getPayload() != null) {
            response.setPayload(replaceShortIds(response.getPayload(), sourceIds));
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
