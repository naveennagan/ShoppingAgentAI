package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.exception.EmbeddingException;
import com.shoppingagent.model.BroadbandPlan;
import com.shoppingagent.model.IngestionResult;
import com.shoppingagent.model.Product;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class IngestionService {

    private static final Logger logger = LoggerFactory.getLogger(IngestionService.class);
    private static final String TABLE = "knowledge_documents";

    private final ProductService productService;
    private final SupabaseClient supabaseClient;
    private final EmbeddingService embeddingService;
    private final Gson gson = new Gson();

    @Value("${ingestion.item-delay-ms:200}")
    private int itemDelayMs;

    @Value("${ingestion.batch-size:10}")
    private int batchSize;

    @Value("${ingestion.batch-pause-ms:2000}")
    private int batchPauseMs;

    @Value("${ingestion.max-retries:3}")
    private int maxRetries;

    public IngestionService(ProductService productService,
                            SupabaseClient supabaseClient,
                            EmbeddingService embeddingService) {
        this.productService = productService;
        this.supabaseClient = supabaseClient;
        this.embeddingService = embeddingService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        long docCount = getDocumentCount();
        logger.info("Startup check: knowledge_documents count = {}", docCount);
        if (docCount == 0) {
            logger.info("Vector store is empty, triggering auto-ingestion");
            triggerAsyncIngestion();
        }
    }

    @Async
    public void triggerAsyncIngestion() {
        ingestAll();
    }

    public IngestionResult ingestAll() {
        logger.info("Starting full ingestion of products and broadband plans");
        int totalIngested = 0;
        int failures = 0;
        List<String> failedSourceIds = new ArrayList<>();

        // Collect all items to ingest
        List<IngestItem> items = new ArrayList<>();

        List<Product> products = productService.getAllProducts();
        for (Product product : products) {
            items.add(new IngestItem("product", product.getId(),
                    buildProductContent(product), buildProductMetadata(product)));
        }

        List<BroadbandPlan> plans = fetchAllBroadbandPlans();
        for (BroadbandPlan plan : plans) {
            items.add(new IngestItem("broadband_plan", plan.getPlanId(),
                    buildBroadbandContent(plan), buildBroadbandMetadata(plan)));
        }

        int totalItems = items.size();
        logger.info("Total items to ingest: {}", totalItems);

        // Process in batches
        for (int batchStart = 0; batchStart < totalItems; batchStart += batchSize) {
            int batchEnd = Math.min(batchStart + batchSize, totalItems);
            int batchNum = (batchStart / batchSize) + 1;
            logger.info("Processing batch {} (items {}-{})", batchNum, batchStart + 1, batchEnd);

            for (int i = batchStart; i < batchEnd; i++) {
                IngestItem item = items.get(i);
                boolean success = ingestItemWithRetry(item);
                if (success) {
                    totalIngested++;
                } else {
                    failures++;
                    failedSourceIds.add(item.sourceId);
                }

                // Per-item delay (skip after last item in batch)
                if (i < batchEnd - 1) {
                    sleep(itemDelayMs);
                }
            }

            // Batch pause (skip after last batch)
            if (batchEnd < totalItems) {
                logger.debug("Pausing {}ms between batches", batchPauseMs);
                sleep(batchPauseMs);
            }
        }

        logger.info("Ingestion summary: total attempted={}, successfully ingested={}, failed={}",
                totalItems, totalIngested, failures);
        return new IngestionResult(totalIngested, failures, Instant.now(), failedSourceIds);
    }

    private boolean ingestItemWithRetry(IngestItem item) {
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                upsertDocument(item.sourceType, item.sourceId, item.content, item.metadata);
                return true;
            } catch (EmbeddingException e) {
                if (e.isRetryable() && attempt < maxRetries) {
                    long waitMs = (long) Math.pow(2, attempt) * 1000; // exponential backoff: 1s, 2s, 4s
                    logger.warn("Retryable error for item {} (attempt {}/{}). Status: {}, waiting {}ms before retry. Error: {}",
                            item.sourceId, attempt + 1, maxRetries, e.getStatusCode(), waitMs, e.getMessage());
                    if (e.getResponseBody() != null) {
                        logger.warn("Full error response body for item {}: status={}, body={}",
                                item.sourceId, e.getStatusCode(), e.getResponseBody());
                    }
                    sleep(waitMs);
                } else {
                    logger.error("Failed to ingest item {} after {} attempts. Status: {}, Error: {}",
                            item.sourceId, attempt + 1, e.getStatusCode(), e.getMessage());
                    if (e.getResponseBody() != null) {
                        logger.error("Full error response body for item {}: status={}, body={}",
                                item.sourceId, e.getStatusCode(), e.getResponseBody());
                    }
                    return false;
                }
            } catch (Exception e) {
                logger.error("Non-retryable error for item {}: {}", item.sourceId, e.getMessage());
                return false;
            }
        }
        return false;
    }

    public long getDocumentCount() {
        try {
            String json = supabaseClient.get(TABLE, "select=id");
            JsonArray docs = gson.fromJson(json, JsonArray.class);
            return docs != null ? docs.size() : 0;
        } catch (Exception e) {
            logger.error("Failed to query document count: {}", e.getMessage());
            return 0;
        }
    }

    public void upsertDocument(String sourceType, String sourceId, String content, Map<String, Object> metadata) {
        float[] embedding = embeddingService.generateEmbedding(content);

        JsonObject doc = new JsonObject();
        doc.addProperty("content", content);
        doc.add("metadata", gson.toJsonTree(metadata));
        doc.addProperty("embedding", embeddingToString(embedding));

        deleteDocument(sourceType, sourceId);
        supabaseClient.post(TABLE, gson.toJson(doc));
    }

    public void deleteDocument(String sourceType, String sourceId) {
        try {
            String query = "metadata->>source_type=eq." + sourceType + "&metadata->>source_id=eq." + sourceId;
            supabaseClient.delete(TABLE, query);
        } catch (Exception e) {
            logger.debug("No existing document to delete for {}/{}: {}", sourceType, sourceId, e.getMessage());
        }
    }

    private Map<String, Object> buildProductMetadata(Product product) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("source_type", "product");
        metadata.put("source_id", product.getId());
        metadata.put("name", product.getName());
        metadata.put("brand", product.getBrand());
        metadata.put("category", product.getCategory());
        return metadata;
    }

    private Map<String, Object> buildBroadbandMetadata(BroadbandPlan plan) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("source_type", "broadband_plan");
        metadata.put("source_id", plan.getPlanId());
        metadata.put("name", plan.getName());
        metadata.put("technology_type", plan.getTechnologyType());
        return metadata;
    }

    private List<BroadbandPlan> fetchAllBroadbandPlans() {
        String json = supabaseClient.get("broadband_plans",
                "select=plan_ref,name,download_speed_mbps,upload_speed_mbps,plan_type,technology_type," +
                "contract_length_months,monthly_price,promotional_label,includes_router,router_name," +
                "speed_guarantee_mbps,activation_fee,out_of_contract_price&is_active=eq.true");

        List<BroadbandPlan> plans = new ArrayList<>();
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        if (rows == null) return plans;

        for (JsonElement element : rows) {
            JsonObject row = element.getAsJsonObject();
            plans.add(new BroadbandPlan(
                    getStringOrNull(row, "plan_ref"),
                    getStringOrNull(row, "name"),
                    getIntOrZero(row, "download_speed_mbps"),
                    getIntOrZero(row, "upload_speed_mbps"),
                    getStringOrNull(row, "plan_type"),
                    getStringOrNull(row, "technology_type"),
                    getIntOrZero(row, "contract_length_months"),
                    getDoubleOrZero(row, "monthly_price"),
                    getStringOrNull(row, "promotional_label"),
                    getBooleanOrFalse(row, "includes_router"),
                    getStringOrNull(row, "router_name"),
                    getIntOrZero(row, "speed_guarantee_mbps"),
                    getDoubleOrZero(row, "activation_fee"),
                    getDoubleOrZero(row, "out_of_contract_price")
            ));
        }
        return plans;
    }

    public String buildProductContent(Product product) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product: ").append(product.getName()).append("\n");
        sb.append("Brand: ").append(product.getBrand()).append("\n");
        sb.append("Category: ").append(product.getCategory()).append("\n");
        sb.append("Price: £").append(String.format("%.2f", product.getPrice())).append("\n");
        sb.append("Description: ").append(product.getDescription()).append("\n");
        if (product.getSpecs() != null && !product.getSpecs().isEmpty()) {
            String specsStr = product.getSpecs().entrySet().stream()
                    .map(e -> e.getKey() + ":" + e.getValue())
                    .collect(Collectors.joining("; "));
            sb.append("Specs: ").append(specsStr).append("\n");
        }
        sb.append("Rating: ").append(product.getRating()).append("/5");
        return sb.toString();
    }

    public String buildBroadbandContent(BroadbandPlan plan) {
        StringBuilder sb = new StringBuilder();
        sb.append("Broadband Plan: ").append(plan.getName()).append("\n");
        sb.append("Download Speed: ").append(plan.getDownloadSpeedMbps()).append(" Mbps\n");
        sb.append("Upload Speed: ").append(plan.getUploadSpeedMbps()).append(" Mbps\n");
        sb.append("Technology: ").append(plan.getTechnologyType()).append("\n");
        sb.append("Contract Length: ").append(plan.getContractLengthMonths()).append(" months\n");
        sb.append("Monthly Price: £").append(String.format("%.2f", plan.getMonthlyPrice())).append("/mo");
        if (plan.getPromotionalLabel() != null && !plan.getPromotionalLabel().isEmpty()) {
            sb.append("\nPromotional Label: ").append(plan.getPromotionalLabel());
        }
        return sb.toString();
    }

    private void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            logger.warn("Sleep interrupted during ingestion");
        }
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

    private String getStringOrNull(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) ? el.getAsString() : null;
    }

    private int getIntOrZero(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) ? el.getAsInt() : 0;
    }

    private double getDoubleOrZero(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) ? el.getAsDouble() : 0.0;
    }

    private boolean getBooleanOrFalse(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) && el.getAsBoolean();
    }

    private static class IngestItem {
        final String sourceType;
        final String sourceId;
        final String content;
        final Map<String, Object> metadata;

        IngestItem(String sourceType, String sourceId, String content, Map<String, Object> metadata) {
            this.sourceType = sourceType;
            this.sourceId = sourceId;
            this.content = content;
            this.metadata = metadata;
        }
    }
}
