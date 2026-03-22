package com.shoppingagent.model;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatResponse {
    private String action;
    private String payload;
    private String message;
    private List<SummaryCard> summaryCards;
    private List<String> suggestedActions;

    /**
     * Backward-compatible constructor for existing code that creates
     * ChatResponse with only the original three fields.
     */
    public ChatResponse(String action, String payload, String message) {
        this.action = action;
        this.payload = payload;
        this.message = message;
    }
}
