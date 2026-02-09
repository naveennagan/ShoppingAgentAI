package com.shoppingagent.controller;

import com.shoppingagent.model.ChatHistory;
import com.shoppingagent.service.ChatHistoryService;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/chat-history")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatHistoryController {
    
    private static final Logger logger = LoggerFactory.getLogger(ChatHistoryController.class);
    private final ChatHistoryService chatHistoryService;
    
    public ChatHistoryController(ChatHistoryService chatHistoryService) {
        this.chatHistoryService = chatHistoryService;
    }
    
    @GetMapping("/{sessionId}")
    public ChatHistory getHistory(@PathVariable String sessionId) {
        logger.info("GET /api/chat-history/{} - Fetching chat history", sessionId);
        ChatHistory history = chatHistoryService.getHistory(sessionId);
        logger.info("Chat history has {} messages", history.getMessages().size());
        return history;
    }
    
    @PostMapping("/{sessionId}/add")
    public ChatHistory addMessage(@PathVariable String sessionId,
                                  @RequestParam String role,
                                  @RequestParam String text) {
        logger.info("POST /api/chat-history/{}/add - Adding message: [{}] {}", sessionId, role, text.substring(0, Math.min(50, text.length())) + "...");
        ChatHistory history = chatHistoryService.addMessage(sessionId, role, text);
        logger.info("Chat history now has {} messages", history.getMessages().size());
        return history;
    }
    
    @DeleteMapping("/{sessionId}/clear")
    public ChatHistory clearHistory(@PathVariable String sessionId) {
        logger.info("DELETE /api/chat-history/{}/clear - Clearing chat history", sessionId);
        ChatHistory history = chatHistoryService.clearHistory(sessionId);
        logger.info("Chat history cleared");
        return history;
    }
}
