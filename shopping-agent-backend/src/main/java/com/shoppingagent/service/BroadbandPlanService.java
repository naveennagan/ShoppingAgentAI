package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.model.BroadbandPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class BroadbandPlanService {

    private static final Logger logger = LoggerFactory.getLogger(BroadbandPlanService.class);
    private static final String TABLE = "broadband_plans";

    private final SupabaseClient supabaseClient;
    private final IngestionService ingestionService;
    private final Gson gson = new Gson();

    public BroadbandPlanService(SupabaseClient supabaseClient, IngestionService ingestionService) {
        this.supabaseClient = supabaseClient;
        this.ingestionService = ingestionService;
    }

    public BroadbandPlan createPlan(BroadbandPlan plan) {
        logger.info("Creating broadband plan: {}", plan.getName());
        String json = supabaseClient.post(TABLE, gson.toJson(plan));
        BroadbandPlan saved = parseSinglePlan(json);
        reEmbed(saved);
        return saved;
    }

    public BroadbandPlan updatePlan(String planId, BroadbandPlan plan) {
        logger.info("Updating broadband plan: {}", planId);
        String json = supabaseClient.patch(TABLE, "plan_ref=eq." + planId, gson.toJson(plan));
        BroadbandPlan saved = parseSinglePlan(json);
        reEmbed(saved);
        return saved;
    }

    public void deletePlan(String planId) {
        logger.info("Deleting broadband plan: {}", planId);
        supabaseClient.delete(TABLE, "plan_ref=eq." + planId);
        try {
            ingestionService.deleteDocument("broadband_plan", planId);
        } catch (Exception e) {
            logger.error("Failed to remove knowledge document for plan {}: {}", planId, e.getMessage());
        }
    }

    public void deactivatePlan(String planId) {
        logger.info("Deactivating broadband plan: {}", planId);
        supabaseClient.patch(TABLE, "plan_ref=eq." + planId, "{\"is_active\": false}");
        try {
            ingestionService.deleteDocument("broadband_plan", planId);
        } catch (Exception e) {
            logger.error("Failed to remove knowledge document for deactivated plan {}: {}", planId, e.getMessage());
        }
    }

    private void reEmbed(BroadbandPlan plan) {
        try {
            String content = ingestionService.buildBroadbandContent(plan);
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("source_type", "broadband_plan");
            metadata.put("source_id", plan.getPlanId());
            metadata.put("name", plan.getName());
            metadata.put("technology_type", plan.getTechnologyType());
            ingestionService.upsertDocument("broadband_plan", plan.getPlanId(), content, metadata);
            logger.info("Re-embedded broadband plan {}", plan.getPlanId());
        } catch (Exception e) {
            logger.error("Failed to re-embed broadband plan {}: {}", plan.getPlanId(), e.getMessage());
        }
    }

    private BroadbandPlan parseSinglePlan(String json) {
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        JsonObject row = rows.get(0).getAsJsonObject();
        return new BroadbandPlan(
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
        );
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
}
