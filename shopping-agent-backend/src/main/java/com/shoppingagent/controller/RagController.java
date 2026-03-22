package com.shoppingagent.controller;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.model.IngestionResult;
import com.shoppingagent.model.RagStatus;
import com.shoppingagent.service.IngestionService;
import com.shoppingagent.service.SupabaseClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/rag")
@CrossOrigin(origins = "http://localhost:3000")
public class RagController {

    private static final Logger logger = LoggerFactory.getLogger(RagController.class);

    private final IngestionService ingestionService;
    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();

    public RagController(IngestionService ingestionService, SupabaseClient supabaseClient) {
        this.ingestionService = ingestionService;
        this.supabaseClient = supabaseClient;
    }

    @PostMapping("/ingest")
    public ResponseEntity<?> ingest() {
        logger.info("POST /api/rag/ingest - Starting ingestion");
        try {
            IngestionResult result = ingestionService.ingestAll();
            logger.info("Ingestion complete: {} ingested, {} failures", result.getTotalIngested(), result.getFailures());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Ingestion failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Ingestion failed: " + e.getMessage());
        }
    }

    @GetMapping("/status")
    public ResponseEntity<?> getStatus() {
        logger.info("GET /api/rag/status - Fetching RAG status");
        try {
            String allDocsJson = supabaseClient.get("knowledge_documents", "select=id");
            JsonArray allDocs = gson.fromJson(allDocsJson, JsonArray.class);
            long totalDocuments = allDocs != null ? allDocs.size() : 0;

            Instant lastIngestion = null;
            if (totalDocuments > 0) {
                String latestJson = supabaseClient.get("knowledge_documents",
                        "select=created_at&order=created_at.desc&limit=1");
                JsonArray latestRows = gson.fromJson(latestJson, JsonArray.class);
                if (latestRows != null && !latestRows.isEmpty()) {
                    JsonObject row = latestRows.get(0).getAsJsonObject();
                    JsonElement createdAt = row.get("created_at");
                    if (createdAt != null && !createdAt.isJsonNull()) {
                        lastIngestion = Instant.parse(createdAt.getAsString());
                    }
                }
            }

            RagStatus status = new RagStatus(totalDocuments, lastIngestion, 0);
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            logger.error("Failed to fetch RAG status: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to fetch RAG status: " + e.getMessage());
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> health() {
        logger.info("GET /api/rag/health - Checking RAG health");
        try {
            long count = ingestionService.getDocumentCount();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("documentCount", count);
            result.put("status", count > 0 ? "healthy" : "empty");
            if (count == 0) {
                result.put("warning", "RAG pipeline has no data to search against");
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Failed to check RAG health: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to check RAG health: " + e.getMessage());
        }
    }
}
