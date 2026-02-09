package com.shoppingagent.controller;

import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.service.GeminiService;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {
    
    private static final Logger logger = LoggerFactory.getLogger(ChatController.class);
    private final GeminiService geminiService;
    
    public ChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }
    
    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        logger.info("POST /api/chat - Message: {}", request.getMessage());
        ChatResponse response = geminiService.chat(request);
        logger.info("AI Response - Action: {}, Message: {}", response.getAction(), response.getMessage().substring(0, Math.min(50, response.getMessage().length())) + "...");
        return response;
    }
}
