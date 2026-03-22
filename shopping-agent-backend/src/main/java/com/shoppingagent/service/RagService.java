package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.model.KnowledgeDocument;
import com.shoppingagent.model.RagContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Service
public class RagService {

    private static final Logger logger = LoggerFactory.getLogger(RagService.class);

    private final EmbeddingService embeddingService;
    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();
    private final ExecutorService executor = Executors.newCachedThreadPool();

    @Value("${rag.top-k:5}")
    private int topK;

    @Value("${rag.relevance-threshold:0.3}")
    private double relevanceThreshold;

    @Value("${rag.max-context-tokens:2000}")
    private int maxContextTokens;

    public RagService(EmbeddingService embeddingService, SupabaseClient supabaseClient) {
        this.embeddingService = embeddingService;
        this.supabaseClient = supabaseClient;
    }

    /**
     * Main entry point: retrieves relevant context for a user query.
     * Returns null on any failure (embedding error, search timeout, empty store).
     */
    public RagContext retrieveContext(String userQuery) {
        try {
            // Generate query embedding
            float[] queryEmbedding = embeddingService.generateEmbedding(userQuery);

            // Detect intent to filter source_type when unambiguous
            String sourceTypeFilter = detectIntent(userQuery);

            // Execute similarity search with 3-second timeout
            List<KnowledgeDocument> documents = similaritySearchWithTimeout(queryEmbedding, sourceTypeFilter);

            if (documents == null || documents.isEmpty()) {
                logger.warn("RAG similarity search returned no results for query: {}", truncateForLog(userQuery));
                return null;
            }

            // Assemble context window
            return assembleContext(documents);
        } catch (Exception e) {
            logger.error("RAG retrieval failed, falling back to full-catalog: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Executes similarity search with a 3-second timeout.
     */
    List<KnowledgeDocument> similaritySearchWithTimeout(float[] queryEmbedding, String sourceTypeFilter) {
        Future<List<KnowledgeDocument>> future = executor.submit(
                () -> similaritySearch(queryEmbedding, sourceTypeFilter));
        try {
            return future.get(3, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            logger.error("RAG similarity search timed out (>3s)");
            return null;
        } catch (Exception e) {
            logger.error("RAG similarity search failed: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Performs cosine similarity search against knowledge_documents via Supabase RPC.
     */
    List<KnowledgeDocument> similaritySearch(float[] queryEmbedding, String sourceTypeFilter) {
        JsonObject params = new JsonObject();
        params.addProperty("query_embedding", embeddingToString(queryEmbedding));
        params.addProperty("match_threshold", relevanceThreshold);
        params.addProperty("match_count", topK);
        if (sourceTypeFilter != null) {
            params.addProperty("filter_source_type", sourceTypeFilter);
        }

        String response = supabaseClient.rpc("match_knowledge_documents", gson.toJson(params));
        JsonArray rows = gson.fromJson(response, JsonArray.class);

        if (rows == null || rows.isEmpty()) {
            return Collections.emptyList();
        }

        List<KnowledgeDocument> documents = new ArrayList<>();
        for (JsonElement element : rows) {
            JsonObject row = element.getAsJsonObject();
            KnowledgeDocument doc = new KnowledgeDocument();
            doc.setId(row.has("id") && !row.get("id").isJsonNull() ? row.get("id").getAsString() : null);
            doc.setContent(row.has("content") && !row.get("content").isJsonNull() ? row.get("content").getAsString() : "");
            doc.setRelevanceScore(row.has("relevance_score") && !row.get("relevance_score").isJsonNull()
                    ? row.get("relevance_score").getAsDouble() : 0.0);
            if (row.has("metadata") && !row.get("metadata").isJsonNull()) {
                Map<String, Object> metadata = gson.fromJson(row.get("metadata"), Map.class);
                doc.setMetadata(metadata);
            } else {
                doc.setMetadata(Collections.emptyMap());
            }
            documents.add(doc);
        }

        // Results come ordered by cosine distance ascending (most relevant first)
        // which means relevance_score is already descending — but let's ensure it
        documents.sort((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()));
        return documents;
    }

    /**
     * Assembles a context window from retrieved documents.
     * Truncates by removing lowest-scored documents first if token limit is exceeded.
     */
    RagContext assembleContext(List<KnowledgeDocument> documents) {
        // Filter out any documents below the relevance threshold (defense-in-depth)
        List<KnowledgeDocument> contextDocs = documents.stream()
                .filter(doc -> doc.getRelevanceScore() >= relevanceThreshold)
                .sorted((a, b) -> Double.compare(b.getRelevanceScore(), a.getRelevanceScore()))
                .collect(Collectors.toCollection(ArrayList::new));

        if (contextDocs.isEmpty()) {
            return null;
        }

        // Truncate to fit within max token count, removing lowest-scored first
        while (contextDocs.size() > 1 && estimateTokens(buildContextString(contextDocs)) > maxContextTokens) {
            contextDocs.remove(contextDocs.size() - 1); // Remove lowest-scored (last in desc-sorted list)
        }

        String contextWindow = buildContextString(contextDocs);
        List<String> sourceIds = contextDocs.stream()
                .map(doc -> {
                    Object sourceId = doc.getMetadata().get("source_id");
                    return sourceId != null ? sourceId.toString() : null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        return new RagContext(contextWindow, sourceIds, contextDocs.size());
    }

    /**
     * Builds the formatted context string from documents.
     */
    private String buildContextString(List<KnowledgeDocument> documents) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < documents.size(); i++) {
            KnowledgeDocument doc = documents.get(i);
            String sourceType = doc.getMetadata().getOrDefault("source_type", "unknown").toString();
            String sourceId = doc.getMetadata().getOrDefault("source_id", "").toString();

            if (i > 0) {
                sb.append("\n\n");
            }
            sb.append("[").append(sourceType.toUpperCase()).append(" | ID: ").append(sourceId).append("]\n");
            sb.append(doc.getContent());
        }
        return sb.toString();
    }

    /**
     * Detects query intent to filter source_type when unambiguous.
     * Returns "product" for pure product queries, "broadband_plan" for pure broadband queries,
     * or null when intent is mixed/unclear.
     */
    String detectIntent(String query) {
        String lower = query.toLowerCase();

        boolean hasBroadband = lower.contains("broadband") || lower.contains("fibre")
                || lower.contains("internet") || lower.contains("wifi")
                || lower.contains("download speed") || lower.contains("upload speed")
                || lower.contains("mbps") || lower.contains("router");

        boolean hasProduct = lower.contains("phone") || lower.contains("laptop")
                || lower.contains("tablet") || lower.contains("headphone")
                || lower.contains("watch") || lower.contains("camera")
                || lower.contains("speaker") || lower.contains("product")
                || lower.contains("buy") || lower.contains("price");

        if (hasBroadband && !hasProduct) {
            return "broadband_plan";
        }
        if (hasProduct && !hasBroadband) {
            return "product";
        }
        // Mixed or unclear intent — search all source types
        return null;
    }

    /**
     * Rough token estimation: ~4 characters per token (common approximation).
     */
    int estimateTokens(String text) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        return (int) Math.ceil(text.length() / 4.0);
    }

    private String embeddingToString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        sb.append("]");
        return sb.toString();
    }

    private String truncateForLog(String text) {
        return text != null && text.length() > 100 ? text.substring(0, 100) + "..." : text;
    }
}
