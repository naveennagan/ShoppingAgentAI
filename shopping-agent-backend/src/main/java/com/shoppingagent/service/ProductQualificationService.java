package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.shoppingagent.model.BroadbandPlan;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductQualificationService {

    private static final Logger logger = LoggerFactory.getLogger(ProductQualificationService.class);
    private static final String PLANS_TABLE = "broadband_plans";

    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();

    public ProductQualificationService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    /**
     * Returns all active broadband plans from Supabase.
     * For the POC, all active plans are returned regardless of UPRN.
     *
     * @param uprn the address UPRN (used for future EE API integration; ignored in POC)
     * @return list of active BroadbandPlan objects
     */
    public List<BroadbandPlan> getPlans(String uprn) {
        logger.debug("Fetching active broadband plans for UPRN: {}", uprn);

        String json = supabaseClient.get(
                PLANS_TABLE,
                "select=plan_ref,name,download_speed_mbps,upload_speed_mbps,technology_type," +
                "contract_length_months,monthly_price,promotional_label&is_active=eq.true"
        );

        List<BroadbandPlan> plans = new ArrayList<>();
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        if (rows == null) {
            return plans;
        }

        for (JsonElement element : rows) {
            JsonObject row = element.getAsJsonObject();
            BroadbandPlan plan = new BroadbandPlan(
                    getStringOrNull(row, "plan_ref"),
                    getStringOrNull(row, "name"),
                    getIntOrZero(row, "download_speed_mbps"),
                    getIntOrZero(row, "upload_speed_mbps"),
                    getStringOrNull(row, "technology_type"),
                    getIntOrZero(row, "contract_length_months"),
                    getDoubleOrZero(row, "monthly_price"),
                    getStringOrNull(row, "promotional_label")
            );
            plans.add(plan);
        }

        logger.debug("Found {} active broadband plans", plans.size());
        return plans;
    }

    /**
     * Returns all active add-ons from Supabase.
     */
    public List<java.util.Map<String, Object>> getAddons() {
        logger.debug("Fetching active broadband add-ons");
        String json = supabaseClient.get("addons",
                "select=id,name,monthly_price,description&is_active=eq.true");
        com.google.gson.JsonArray rows = gson.fromJson(json, com.google.gson.JsonArray.class);
        List<java.util.Map<String, Object>> result = new ArrayList<>();
        if (rows == null) return result;
        for (com.google.gson.JsonElement el : rows) {
            com.google.gson.JsonObject row = el.getAsJsonObject();
            java.util.Map<String, Object> addon = new java.util.LinkedHashMap<>();
            addon.put("id", getStringOrNull(row, "id"));
            addon.put("name", getStringOrNull(row, "name"));
            addon.put("monthlyPrice", getDoubleOrZero(row, "monthly_price"));
            addon.put("description", getStringOrNull(row, "description"));
            result.add(addon);
        }
        return result;
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
}
