package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    private String subscriptionId;
    private String orderId;
    private String status;       // "inactive" | "active" | "cancelled"
    private double monthlyPrice;
    private String startDate;    // ISO date string, nullable until activated
    private String activatedAt;  // ISO datetime string, nullable
    private String planName;     // display name for bills table
}
