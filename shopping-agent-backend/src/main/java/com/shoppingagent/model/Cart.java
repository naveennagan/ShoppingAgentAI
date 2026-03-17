package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Cart {
    private String sessionId;
    private List<CartItem> items;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CartItem {
        private String productId;
        private int quantity;
        private String itemType;       // "device" | "broadband_service"
        private String displayName;
        private String displaySummary;
        private Double unitPrice;
    }
}
