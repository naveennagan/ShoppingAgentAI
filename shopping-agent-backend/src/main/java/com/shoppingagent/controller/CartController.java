package com.shoppingagent.controller;

import com.shoppingagent.model.Cart;
import com.shoppingagent.service.CartService;
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
    public Cart getCart(@PathVariable String sessionId) {
        logger.info("GET /api/cart/{} - Fetching cart", sessionId);
        Cart cart = cartService.getCart(sessionId);
        logger.info("Cart has {} items", cart.getItems().size());
        return cart;
    }
    
    @PostMapping("/{sessionId}/add")
    public Cart addToCart(@PathVariable String sessionId, 
                         @RequestParam String productId,
                         @RequestParam(defaultValue = "1") int quantity) {
        logger.info("POST /api/cart/{}/add - Adding product: {} (qty: {})", sessionId, productId, quantity);
        Cart cart = cartService.addToCart(sessionId, productId, quantity);
        logger.info("Cart now has {} items", cart.getItems().size());
        return cart;
    }
    
    @DeleteMapping("/{sessionId}/remove/{productId}")
    public Cart removeFromCart(@PathVariable String sessionId, @PathVariable String productId) {
        logger.info("DELETE /api/cart/{}/remove/{} - Removing product", sessionId, productId);
        Cart cart = cartService.removeFromCart(sessionId, productId);
        logger.info("Cart now has {} items", cart.getItems().size());
        return cart;
    }
    
    @DeleteMapping("/{sessionId}/clear")
    public Cart clearCart(@PathVariable String sessionId) {
        logger.info("DELETE /api/cart/{}/clear - Clearing cart", sessionId);
        Cart cart = cartService.clearCart(sessionId);
        logger.info("Cart cleared");
        return cart;
    }
    
    @PutMapping("/{sessionId}/update")
    public Cart updateQuantity(@PathVariable String sessionId,
                              @RequestParam String productId,
                              @RequestParam int quantity) {
        logger.info("PUT /api/cart/{}/update - Updating product: {} to qty: {}", sessionId, productId, quantity);
        Cart cart = cartService.updateQuantity(sessionId, productId, quantity);
        return cart;
    }
}
