package com.shoppingagent.service;

import com.shoppingagent.model.Order;
import com.shoppingagent.model.Cart;
import com.shoppingagent.model.Product;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class OrderService {
    
    private final Map<String, List<Order>> userOrders = new ConcurrentHashMap<>();
    private final ProductService productService;
    private final CartService cartService;
    
    public OrderService(ProductService productService, CartService cartService) {
        this.productService = productService;
        this.cartService = cartService;
    }
    
    public Order createOrder(String sessionId, String shippingAddress, String paymentMethod) {
        Cart cart = cartService.getCart(sessionId);
        
        if (cart.getItems().isEmpty()) {
            throw new RuntimeException("Cannot create order with empty cart");
        }
        
        String orderId = "ORD-" + System.currentTimeMillis();
        List<Order.OrderItem> orderItems = new ArrayList<>();
        double totalAmount = 0.0;
        
        for (Cart.CartItem cartItem : cart.getItems()) {
            Optional<Product> product = productService.getProductById(cartItem.getProductId());
            if (product.isPresent()) {
                Product p = product.get();
                Order.OrderItem orderItem = new Order.OrderItem(
                    p.getId(),
                    p.getName(),
                    p.getPrice(),
                    cartItem.getQuantity(),
                    p.getImage()
                );
                orderItems.add(orderItem);
                totalAmount += p.getPrice() * cartItem.getQuantity();
            }
        }
        
        Order order = new Order(
            orderId,
            sessionId,
            orderItems,
            totalAmount,
            "CONFIRMED",
            LocalDateTime.now(),
            shippingAddress,
            paymentMethod
        );
        
        userOrders.computeIfAbsent(sessionId, k -> new ArrayList<>()).add(order);
        cartService.clearCart(sessionId);
        
        System.out.println("Order created: " + orderId + " for session: " + sessionId);
        System.out.println("Total orders in memory: " + userOrders.size());
        
        return order;
    }
    
    public List<Order> getOrdersBySession(String sessionId) {
        System.out.println("Getting orders for session: " + sessionId);
        System.out.println("Available sessions: " + userOrders.keySet());
        return userOrders.getOrDefault(sessionId, new ArrayList<>())
                .stream()
                .sorted((o1, o2) -> o2.getOrderDate().compareTo(o1.getOrderDate()))
                .collect(Collectors.toList());
    }
    
    public Optional<Order> getOrderById(String orderId) {
        return userOrders.values().stream()
                .flatMap(List::stream)
                .filter(order -> order.getOrderId().equals(orderId))
                .findFirst();
    }
}