package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.ChatHistory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ChatHistoryService {

    private static final Logger logger = LoggerFactory.getLogger(ChatHistoryService.class);
    private static final String TABLE = "chat_history";

    private final SupabaseClient supabaseClient;
    private final Gson gson;

    public ChatHistoryService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.gson = new Gson();
    }

    public ChatHistory getHistory(String sessionId) {
        logger.debug("Fetching chat history for session: {}", sessionId);
        String json = supabaseClient.get(TABLE,
                "select=role,message_text,created_at&session_id=eq." + sessionId + "&order=created_at.asc");
        List<ChatHistoryRow> rows = gson.fromJson(json, new TypeToken<List<ChatHistoryRow>>() {}.getType());
        List<ChatHistory.ChatMessage> messages = new ArrayList<>();
        if (rows != null) {
            for (ChatHistoryRow row : rows) {
                messages.add(new ChatHistory.ChatMessage(row.role, row.message_text, row.created_at));
            }
        }
        return new ChatHistory(sessionId, messages);
    }

    public ChatHistory addMessage(String sessionId, String role, String text) {
        logger.debug("Adding message to chat history - session: {}, role: {}", sessionId, role);
        JsonObject body = new JsonObject();
        body.addProperty("session_id", sessionId);
        body.addProperty("role", role);
        body.addProperty("message_text", text);
        supabaseClient.post(TABLE, gson.toJson(body));
        return getHistory(sessionId);
    }

    public ChatHistory clearHistory(String sessionId) {
        logger.debug("Clearing chat history for session: {}", sessionId);
        supabaseClient.delete(TABLE, "session_id=eq." + sessionId);
        return new ChatHistory(sessionId, new ArrayList<>());
    }

    /** Internal row type for deserializing chat_history rows. */
    private static class ChatHistoryRow {
        String role;
        String message_text;
        String created_at;
    }
}
