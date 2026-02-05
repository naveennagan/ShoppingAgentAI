package com.shoppingagent.controller;

import com.shoppingagent.model.ChatRequest;
import com.shoppingagent.model.ChatResponse;
import com.shoppingagent.service.GeminiService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "http://localhost:3000")
public class ChatController {
    
    private final GeminiService geminiService;
    
    public ChatController(GeminiService geminiService) {
        this.geminiService = geminiService;
    }
    
    @PostMapping
    public ChatResponse chat(@RequestBody ChatRequest request) {
        return geminiService.chat(request);
    }
}
