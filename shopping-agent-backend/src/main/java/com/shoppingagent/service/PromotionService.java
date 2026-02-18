package com.shoppingagent.service;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.shoppingagent.exception.InvalidCouponException;
import com.shoppingagent.model.Bundle;
import com.shoppingagent.model.CouponValidationResult;
import com.shoppingagent.model.Promotion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.lang.reflect.Type;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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

    /**
     * Returns a map of promotionId -> list of productIds for all active coupon promotions.
     * Used by the AI assistant to know which products each coupon applies to.
     */
    public java.util.Map<String, List<String>> getCouponProductMappings() {
        logger.debug("Fetching coupon-product mappings");
        // Fetch all coupon promotions (promo_code is not null)
        String promoJson = supabaseClient.get("promotions", "select=id,name,promo_code&promo_code=not.is.null");
        List<Promotion> couponPromos = gson.fromJson(promoJson, PROMOTION_LIST_TYPE);
        if (couponPromos == null || couponPromos.isEmpty()) {
            return new java.util.HashMap<>();
        }

        // Fetch all product_promotions rows for these promotion IDs
        String promoIds = couponPromos.stream()
                .map(Promotion::getId)
                .collect(Collectors.joining(","));
        String ppJson = supabaseClient.get("product_promotions",
                "select=product_id,promotion_id&promotion_id=in.(" + promoIds + ")");
        List<ProductPromotionIdRow> rows = gson.fromJson(ppJson,
                new TypeToken<List<ProductPromotionIdRow>>() {}.getType());

        // Build map: promotionId -> [productId, ...]
        java.util.Map<String, List<String>> mapping = new java.util.HashMap<>();
        if (rows != null) {
            for (ProductPromotionIdRow row : rows) {
                mapping.computeIfAbsent(row.promotion_id, k -> new ArrayList<>()).add(row.product_id);
            }
        }
        return mapping;
    }

    /** Internal row type for deserializing the product_promotions join with embedded promotion. */
    private static class ProductPromotionRow {
        String promotion_id;
        Promotion promotions; // Supabase embeds the related table using the table name
    }


    public CouponValidationResult validateCouponCode(String code, List<String> productIds) {
        logger.debug("Validating coupon code: {}", code);

        // Query promotions table for the given promo_code
        String json = supabaseClient.get("promotions", "select=*&promo_code=eq." + code);
        List<Promotion> promotions = gson.fromJson(json, PROMOTION_LIST_TYPE);

        if (promotions == null || promotions.isEmpty()) {
            throw new InvalidCouponException("Invalid coupon code", InvalidCouponException.Reason.NOT_FOUND);
        }

        Promotion promotion = promotions.get(0);

        // Check expiry before active status (priority order per design)
        if (promotion.getEndDate() != null && !promotion.getEndDate().isBlank()) {
            OffsetDateTime endDate = OffsetDateTime.parse(promotion.getEndDate());
            if (OffsetDateTime.now().isAfter(endDate)) {
                throw new InvalidCouponException("Coupon code has expired", InvalidCouponException.Reason.EXPIRED);
            }
        }

        if (!promotion.isActive()) {
            throw new InvalidCouponException("Coupon code is not currently active", InvalidCouponException.Reason.INACTIVE);
        }

        // Find intersection of submitted productIds with products linked to this promotion
        List<String> applicableProductIds = new ArrayList<>();
        if (productIds != null && !productIds.isEmpty()) {
            String promotionId = promotion.getId();
            String ppJson = supabaseClient.get("product_promotions",
                    "select=product_id&promotion_id=eq." + promotionId + "&product_id=in.(" +
                    productIds.stream().collect(Collectors.joining(",")) + ")");
            List<ProductPromotionIdRow> rows = gson.fromJson(ppJson,
                    new TypeToken<List<ProductPromotionIdRow>>() {}.getType());
            if (rows != null) {
                applicableProductIds = rows.stream()
                        .map(r -> r.product_id)
                        .collect(Collectors.toList());
            }
        }

        return new CouponValidationResult(
                promotion.getId(),
                promotion.getName(),
                promotion.getDiscountType(),
                promotion.getDiscountValue(),
                applicableProductIds
        );
    }

    /** Internal row type for deserializing product_id and promotion_id from product_promotions. */
    private static class ProductPromotionIdRow {
        String product_id;
        String promotion_id;
    }

}
