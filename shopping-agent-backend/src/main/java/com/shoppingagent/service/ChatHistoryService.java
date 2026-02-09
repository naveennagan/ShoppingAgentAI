package com.shoppingagent.service;

import com.shoppingagent.model.ChatHistory;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChatHistoryService {
    private final Map<String, ChatHistory> histories = new ConcurrentHashMap<>();
    
    public ChatHistory getHistory(String sessionId) {
        return histories.getOrDefault(sessionId, new ChatHistory(sessionId, new ArrayList<>()));
    }
    
    public ChatHistory addMessage(String sessionId, String role, String text) {
        ChatHistory history = getHistory(sessionId);
        history.getMessages().add(new ChatHistory.ChatMessage(role, text, System.currentTimeMillis()));
        histories.put(sessionId, history);
        return history;
    }
    
    public ChatHistory clearHistory(String sessionId) {
        ChatHistory history = new ChatHistory(sessionId, new ArrayList<>());
        histories.put(sessionId, history);
        return history;
    }
}
