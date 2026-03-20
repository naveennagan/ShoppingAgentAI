package com.shoppingagent.controller;

import com.shoppingagent.exception.InvalidCouponException;
import com.shoppingagent.exception.SupabaseConnectionException;
import com.shoppingagent.model.CouponValidationRequest;
import com.shoppingagent.model.Promotion;
import com.shoppingagent.service.PromotionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = "http://localhost:3000")
public class PromotionController {

    private static final Logger logger = LoggerFactory.getLogger(PromotionController.class);
    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public ResponseEntity<?> getAllPromotions() {
        logger.info("GET /api/promotions - Fetching all promotions");
        try {
            List<Promotion> promotions = promotionService.getAllPromotions();
            logger.info("Returning {} promotions", promotions.size());
            return ResponseEntity.ok(promotions);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<?> getPromotionsForProduct(@PathVariable String productId) {
        logger.info("GET /api/promotions/product/{} - Fetching promotions for product", productId);
        try {
            List<Promotion> promotions = promotionService.getPromotionsForProduct(productId);
            logger.info("Returning {} promotions for product {}", promotions.size(), productId);
            return ResponseEntity.ok(promotions);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }


    @GetMapping("/coupon-product-mappings")
    public ResponseEntity<?> getCouponProductMappings() {
        logger.info("GET /api/promotions/coupon-product-mappings");
        try {
            var mappings = promotionService.getCouponProductMappings();
            return ResponseEntity.ok(mappings);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @PostMapping("/validate-code")
    public ResponseEntity<?> validateCouponCode(@RequestBody CouponValidationRequest request) {
        logger.info("POST /api/promotions/validate-code - Validating coupon code: {}", request.getCode());
        try {
            var result = promotionService.validateCouponCode(request.getCode(), request.getProductIds(), request.getItemType());
            return ResponseEntity.ok(result);
        } catch (InvalidCouponException e) {
            logger.warn("Coupon validation failed: {}", e.getMessage());
            HttpStatus status = e.getReason() == InvalidCouponException.Reason.NOT_FOUND
                    ? HttpStatus.NOT_FOUND
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("error", e.getMessage()));
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

}
