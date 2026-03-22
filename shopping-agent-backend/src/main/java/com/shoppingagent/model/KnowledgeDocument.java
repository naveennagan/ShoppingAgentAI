package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KnowledgeDocument {
    private String id;
    private String content;
    private Map<String, Object> metadata;
    private float[] embedding;
    private double relevanceScore;
    private Instant createdAt;
}
