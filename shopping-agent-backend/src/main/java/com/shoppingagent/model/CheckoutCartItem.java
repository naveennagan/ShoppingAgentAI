package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutCartItem {
    private String cartItemId;
    private String itemType;        // "device" | "broadband_service"
    private String fulfillmentType; // "shipping" | "installation"
    private String displayName;
    private String displaySummary;
    private double unitPrice;
    private int quantity;
}
