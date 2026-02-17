package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.model.Bundle;
import com.shoppingagent.model.Promotion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

@Service
public class PromotionService {

    private static final Logger logger = LoggerFactory.getLogger(PromotionService.class);
    private static final Type PROMOTION_LIST_TYPE = new TypeToken<List<Promotion>>() {}.getType();
    private static final Type BUNDLE_LIST_TYPE = new TypeToken<List<Bundle>>() {}.getType();

    private final SupabaseClient supabaseClient;
    private final Gson gson;

    public PromotionService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
        this.gson = new Gson();
    }

    public List<Promotion> getAllPromotions() {
        logger.debug("Fetching all promotions from Supabase");
        String json = supabaseClient.get("promotions", "select=*");
        List<Promotion> promotions = gson.fromJson(json, PROMOTION_LIST_TYPE);
        return promotions != null ? promotions : new ArrayList<>();
    }

    public List<Promotion> getPromotionsForProduct(String productId) {
        logger.debug("Fetching promotions for product: {}", productId);
        // Use product_promotions junction table to find linked promotion IDs,
        // then fetch the full promotion objects via an embedded select.
        String json = supabaseClient.get("product_promotions",
                "select=promotion_id,promotions(*)&product_id=eq." + productId);
        List<ProductPromotionRow> rows = gson.fromJson(json,
                new TypeToken<List<ProductPromotionRow>>() {}.getType());
        List<Promotion> promotions = new ArrayList<>();
        if (rows != null) {
            for (ProductPromotionRow row : rows) {
                if (row.promotions != null) {
                    promotions.add(row.promotions);
                }
            }
        }
        return promotions;
    }

    public List<Bundle> getAllBundles() {
        logger.debug("Fetching all bundles with items from Supabase");
        String json = supabaseClient.get("bundles", "select=*,bundle_items(*)");
        List<Bundle> bundles = gson.fromJson(json, BUNDLE_LIST_TYPE);
        return bundles != null ? bundles : new ArrayList<>();
    }

    public List<Bundle> getActiveBundles() {
        logger.debug("Fetching active bundles from Supabase");
        String json = supabaseClient.get("bundles", "select=*,bundle_items(*)&is_active=eq.true");
        List<Bundle> bundles = gson.fromJson(json, BUNDLE_LIST_TYPE);
        return bundles != null ? bundles : new ArrayList<>();
    }

    /** Internal row type for deserializing the product_promotions join with embedded promotion. */
    private static class ProductPromotionRow {
        String promotion_id;
        Promotion promotions; // Supabase embeds the related table using the table name
    }
}
