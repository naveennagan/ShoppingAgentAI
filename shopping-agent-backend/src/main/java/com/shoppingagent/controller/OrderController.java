package com.shoppingagent.controller;

import com.shoppingagent.model.Order;
import com.shoppingagent.service.OrderService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "http://localhost:3000")
public class OrderController {
    
    private final OrderService orderService;
    
    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }
    
    @PostMapping
    public Order createOrder(@RequestParam String sessionId,
                           @RequestParam String shippingAddress,
                           @RequestParam(defaultValue = "Credit Card") String paymentMethod) {
        return orderService.createOrder(sessionId, shippingAddress, paymentMethod);
    }
    
    @GetMapping
    public List<Order> getOrders(@RequestParam String sessionId) {
        return orderService.getOrdersBySession(sessionId);
    }
    
    @GetMapping("/{orderId}")
    public Optional<Order> getOrder(@PathVariable String orderId) {
        return orderService.getOrderById(orderId);
    }
}