package com.shoppingagent.service;

import com.shoppingagent.model.Cart;
import org.springframework.stereotype.Service;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class CartService {
    private final Map<String, Cart> carts = new ConcurrentHashMap<>();
    
    public Cart getCart(String sessionId) {
        return carts.getOrDefault(sessionId, new Cart(sessionId, new ArrayList<>()));
    }
    
    public Cart addToCart(String sessionId, String productId, int quantity) {
        Cart cart = getCart(sessionId);
        
        Optional<Cart.CartItem> existing = cart.getItems().stream()
            .filter(item -> item.getProductId().equals(productId))
            .findFirst();
        
        if (existing.isPresent()) {
            existing.get().setQuantity(existing.get().getQuantity() + quantity);
        } else {
            cart.getItems().add(new Cart.CartItem(productId, quantity));
        }
        
        carts.put(sessionId, cart);
        return cart;
    }
    
    public Cart removeFromCart(String sessionId, String productId) {
        Cart cart = getCart(sessionId);
        cart.getItems().removeIf(item -> item.getProductId().equals(productId));
        carts.put(sessionId, cart);
        return cart;
    }
    
    public Cart clearCart(String sessionId) {
        Cart cart = new Cart(sessionId, new ArrayList<>());
        carts.put(sessionId, cart);
        return cart;
    }
    
    public Cart updateQuantity(String sessionId, String productId, int quantity) {
        Cart cart = getCart(sessionId);
        cart.getItems().stream()
            .filter(item -> item.getProductId().equals(productId))
            .findFirst()
            .ifPresent(item -> item.setQuantity(quantity));
        carts.put(sessionId, cart);
        return cart;
    }
    
    public Cart addBatchToCart(String sessionId, List<String> productIds) {
        Cart cart = getCart(sessionId);
        for (String productId : productIds) {
            Optional<Cart.CartItem> existing = cart.getItems().stream()
                .filter(item -> item.getProductId().equals(productId))
                .findFirst();
            if (existing.isPresent()) {
                existing.get().setQuantity(existing.get().getQuantity() + 1);
            } else {
                cart.getItems().add(new Cart.CartItem(productId, 1));
            }
        }
        carts.put(sessionId, cart);
        return cart;
    }
}
