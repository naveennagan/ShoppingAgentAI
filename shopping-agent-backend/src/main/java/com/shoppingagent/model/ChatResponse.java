package com.shoppingagent.model;

import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class ChatResponse {
    private String action;
    private Object payload;
    private String message;
    private List<SummaryCard> summaryCards;
    private List<String> suggestedActions;
    private ComparisonData comparison;

    @Data
    @NoArgsConstructor
    public static class ComparisonData {
        private List<String> products;
        private List<ComparisonRow> rows;
    }

    @Data
    @NoArgsConstructor
    public static class ComparisonRow {
        private String field;
        private List<String> values;
    }

    /**
     * Backward-compatible constructor for existing code that creates
     * ChatResponse with only the original three fields.
     */
    public ChatResponse(String action, String payload, String message) {
        this.action = action;
        this.payload = payload;
        this.message = message;
    }

    /**
     * Returns payload as a String. If payload is a non-string object, returns its JSON representation.
     */
    public String getPayloadAsString() {
        if (payload == null) return null;
        if (payload instanceof String) return (String) payload;
        return payload.toString();
    }
}
