package com.shoppingagent.controller;

import com.shoppingagent.exception.SupabaseConnectionException;
import com.shoppingagent.model.Bundle;
import com.shoppingagent.service.PromotionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/bundles")
@CrossOrigin(origins = "http://localhost:3000")
public class BundleController {

    private static final Logger logger = LoggerFactory.getLogger(BundleController.class);
    private final PromotionService promotionService;

    public BundleController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public ResponseEntity<?> getAllBundles() {
        logger.info("GET /api/bundles - Fetching all bundles");
        try {
            List<Bundle> bundles = promotionService.getAllBundles();
            logger.info("Returning {} bundles", bundles.size());
            return ResponseEntity.ok(bundles);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveBundles() {
        logger.info("GET /api/bundles/active - Fetching active bundles");
        try {
            List<Bundle> bundles = promotionService.getActiveBundles();
            logger.info("Returning {} active bundles", bundles.size());
            return ResponseEntity.ok(bundles);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }
}
