package com.shoppingagent.controller;

import com.shoppingagent.exception.SupabaseConnectionException;
import com.shoppingagent.model.Promotion;
import com.shoppingagent.service.PromotionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
}
