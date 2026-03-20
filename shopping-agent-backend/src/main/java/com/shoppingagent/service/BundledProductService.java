package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BundledProductService {

    private static final Logger logger = LoggerFactory.getLogger(BundledProductService.class);

    private final SupabaseClient supabaseClient;
    private final Gson gson = new Gson();

    public BundledProductService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    public List<Map<String, Object>> getTvPackages() {
        logger.debug("Fetching active TV packages");
        String json = supabaseClient.get("tv_packages",
                "select=id,name,description,monthly_price,channel_count&is_active=eq.true");
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        List<Map<String, Object>> result = new ArrayList<>();
        if (rows == null) return result;
        for (JsonElement el : rows) {
            JsonObject row = el.getAsJsonObject();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", getStringOrNull(row, "id"));
            item.put("name", getStringOrNull(row, "name"));
            item.put("description", getStringOrNull(row, "description"));
            item.put("monthlyPrice", getDoubleOrZero(row, "monthly_price"));
            item.put("channelCount", getIntOrZero(row, "channel_count"));
            result.add(item);
        }
        logger.debug("Found {} active TV packages", result.size());
        return result;
    }

    public List<Map<String, Object>> getSimPlans() {
        logger.debug("Fetching active SIM plans");
        String json = supabaseClient.get("sim_plans",
                "select=id,name,monthly_price,max_speed,description,is_unlimited&is_active=eq.true");
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        List<Map<String, Object>> result = new ArrayList<>();
        if (rows == null) return result;
        for (JsonElement el : rows) {
            JsonObject row = el.getAsJsonObject();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", getStringOrNull(row, "id"));
            item.put("name", getStringOrNull(row, "name"));
            item.put("monthlyPrice", getDoubleOrZero(row, "monthly_price"));
            item.put("maxSpeed", getStringOrNull(row, "max_speed"));
            item.put("description", getStringOrNull(row, "description"));
            item.put("isUnlimited", getBooleanOrFalse(row, "is_unlimited"));
            result.add(item);
        }
        logger.debug("Found {} active SIM plans", result.size());
        return result;
    }

    public List<Map<String, Object>> getHomePhoneServices() {
        logger.debug("Fetching active home phone services");
        String json = supabaseClient.get("home_phone_services",
                "select=id,name,description,monthly_price,includes_calls_to&is_active=eq.true");
        JsonArray rows = gson.fromJson(json, JsonArray.class);
        List<Map<String, Object>> result = new ArrayList<>();
        if (rows == null) return result;
        for (JsonElement el : rows) {
            JsonObject row = el.getAsJsonObject();
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", getStringOrNull(row, "id"));
            item.put("name", getStringOrNull(row, "name"));
            item.put("description", getStringOrNull(row, "description"));
            item.put("monthlyPrice", getDoubleOrZero(row, "monthly_price"));
            item.put("includesCallsTo", getStringOrNull(row, "includes_calls_to"));
            result.add(item);
        }
        logger.debug("Found {} active home phone services", result.size());
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

    private boolean getBooleanOrFalse(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) && el.getAsBoolean();
    }
}
