package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
public class ChatRequest {
    private String message;
    private List<ChatMessage> history;
    private List<CartItem> cartItems;
    private String appliedCouponCode;
    private String appliedDeviceCoupon;
    private String appliedBroadbandCoupon;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChatMessage {
        private String role;
        private String text;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItem {
        private String productId;
        private String name;
        private double price;
        private int quantity;
        private String itemType;
    }
}
