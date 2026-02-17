package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Order {
    private String orderId;
    private String sessionId;
    private List<OrderItem> items;
    private double totalAmount;
    private String status;
    private LocalDateTime orderDate;
    private String shippingAddress;
    private String paymentMethod;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrderItem {
        private String productId;
        private String productName;
        private double price;
        private int quantity;
        private String imageUrl;
    }
}