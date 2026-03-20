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
    /**
     * Returns active broadband plans filtered by the technologies available at the given address.
     *
     * @param uprn the address UPRN used to look up technology flags
     * @return list of active BroadbandPlan objects compatible with the address technology
     */
    public List<BroadbandPlan> getPlans(String uprn) {
        logger.debug("Fetching active broadband plans for UPRN: {}", uprn);

        // 1. Look up address technology flags by UPRN
        String addressJson = supabaseClient.get("addresses",
                "select=technology_copper,technology_fttp,technology_sogea&uprn=eq." + uprn);
        JsonArray addressRows = gson.fromJson(addressJson, JsonArray.class);
        if (addressRows == null || addressRows.isEmpty()) {
            logger.debug("No address found for UPRN: {}, returning empty plan list", uprn);
            return List.of();
        }

        JsonObject address = addressRows.get(0).getAsJsonObject();
        boolean technologyCopper = getBooleanOrFalse(address, "technology_copper");
        boolean technologyFttp = getBooleanOrFalse(address, "technology_fttp");
        boolean technologySogea = getBooleanOrFalse(address, "technology_sogea");

        // 2. Build compatible technology types
        List<String> compatibleTypes = new ArrayList<>();
        if (technologyCopper || technologySogea) {
            compatibleTypes.add("SOGEA");
            compatibleTypes.add("FTTC");
        }
        if (technologyFttp) {
            compatibleTypes.add("FTTP");
        }
        if (compatibleTypes.isEmpty()) {
            logger.debug("No technology flags set for UPRN: {}, returning empty plan list", uprn);
            return List.of();
        }

        // 3. Query plans filtered by compatible technology types
        String techFilter = "technology_type=in.(" + String.join(",", compatibleTypes) + ")";
        String json = supabaseClient.get(
                PLANS_TABLE,
                "select=plan_ref,name,download_speed_mbps,upload_speed_mbps,plan_type,technology_type," +
                "contract_length_months,monthly_price,promotional_label,includes_router,router_name," +
                "speed_guarantee_mbps,activation_fee,out_of_contract_price&is_active=eq.true&" + techFilter
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
            plans.add(plan);
        }

        logger.debug("Found {} active broadband plans for UPRN: {}", plans.size(), uprn);
        return plans;
    }

    /**
     * Returns all active add-ons from Supabase.
     */
    /**
     * Returns active add-ons from Supabase.
     * When planType is provided, returns only addons compatible with that plan type
     * via the plan_addon_compatibility junction table.
     * When planType is null, returns all active addons (backward compatible).
     *
     * @param planType optional plan type filter (Core, Standard, Premium, Ultimate)
     * @return list of addon maps with camelCase keys
     */
    public List<java.util.Map<String, Object>> getAddons(String planType) {
        logger.debug("Fetching active broadband add-ons, planType={}", planType);
        List<java.util.Map<String, Object>> result = new ArrayList<>();

        if (planType != null) {
            // Query plan_addon_compatibility joined with addons, filtered by plan_type
            String json = supabaseClient.get("plan_addon_compatibility",
                    "select=addon_id,addons(id,name,monthly_price,description)" +
                    "&plan_type=eq." + planType);
            com.google.gson.JsonArray rows = gson.fromJson(json, com.google.gson.JsonArray.class);
            if (rows == null) return result;
            for (com.google.gson.JsonElement el : rows) {
                com.google.gson.JsonObject row = el.getAsJsonObject();
                com.google.gson.JsonObject addonObj = row.has("addons") && !row.get("addons").isJsonNull()
                        ? row.getAsJsonObject("addons") : null;
                if (addonObj == null) continue;
                java.util.Map<String, Object> addon = new java.util.LinkedHashMap<>();
                addon.put("id", getStringOrNull(addonObj, "id"));
                addon.put("name", getStringOrNull(addonObj, "name"));
                addon.put("monthlyPrice", getDoubleOrZero(addonObj, "monthly_price"));
                addon.put("description", getStringOrNull(addonObj, "description"));
                result.add(addon);
            }
        } else {
            // Backward compatible: return all active addons
            String json = supabaseClient.get("addons",
                    "select=id,name,monthly_price,description&is_active=eq.true");
            com.google.gson.JsonArray rows = gson.fromJson(json, com.google.gson.JsonArray.class);
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

    private boolean getBooleanOrFalse(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return (el != null && !el.isJsonNull()) && el.getAsBoolean();
    }
}
