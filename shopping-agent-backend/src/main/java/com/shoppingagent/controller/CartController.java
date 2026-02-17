package com.shoppingagent.controller;

import com.shoppingagent.exception.SupabaseConnectionException;
import com.shoppingagent.model.Cart;
import com.shoppingagent.service.CartService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@RequestMapping("/api/cart")
@CrossOrigin(origins = "http://localhost:3000")
public class CartController {

    private static final Logger logger = LoggerFactory.getLogger(CartController.class);
    private final CartService cartService;

    public CartController(CartService cartService) {
        this.cartService = cartService;
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<?> getCart(@PathVariable String sessionId) {
        logger.info("GET /api/cart/{} - Fetching cart", sessionId);
        try {
            Cart cart = cartService.getCart(sessionId);
            logger.info("Cart has {} items", cart.getItems().size());
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @PostMapping("/{sessionId}/add")
    public ResponseEntity<?> addToCart(@PathVariable String sessionId,
                                       @RequestParam String productId,
                                       @RequestParam(defaultValue = "1") int quantity) {
        logger.info("POST /api/cart/{}/add - Adding product: {} (qty: {})", sessionId, productId, quantity);
        try {
            Cart cart = cartService.addToCart(sessionId, productId, quantity);
            logger.info("Cart now has {} items", cart.getItems().size());
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @DeleteMapping("/{sessionId}/remove/{productId}")
    public ResponseEntity<?> removeFromCart(@PathVariable String sessionId, @PathVariable String productId) {
        logger.info("DELETE /api/cart/{}/remove/{} - Removing product", sessionId, productId);
        try {
            Cart cart = cartService.removeFromCart(sessionId, productId);
            logger.info("Cart now has {} items", cart.getItems().size());
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @DeleteMapping("/{sessionId}/clear")
    public ResponseEntity<?> clearCart(@PathVariable String sessionId) {
        logger.info("DELETE /api/cart/{}/clear - Clearing cart", sessionId);
        try {
            Cart cart = cartService.clearCart(sessionId);
            logger.info("Cart cleared");
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @PutMapping("/{sessionId}/update")
    public ResponseEntity<?> updateQuantity(@PathVariable String sessionId,
                                             @RequestParam String productId,
                                             @RequestParam int quantity) {
        logger.info("PUT /api/cart/{}/update - Updating product: {} to qty: {}", sessionId, productId, quantity);
        try {
            Cart cart = cartService.updateQuantity(sessionId, productId, quantity);
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }

    @PostMapping("/{sessionId}/add-batch")
    public ResponseEntity<?> addBatchToCart(@PathVariable String sessionId, @RequestBody java.util.List<String> productIds) {
        logger.info("POST /api/cart/{}/add-batch - Adding {} products", sessionId, productIds.size());
        try {
            Cart cart = cartService.addBatchToCart(sessionId, productIds);
            logger.info("Cart now has {} items", cart.getItems().size());
            return ResponseEntity.ok(cart);
        } catch (SupabaseConnectionException e) {
            logger.error("Supabase connection failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body("Service temporarily unavailable");
        }
    }
}
