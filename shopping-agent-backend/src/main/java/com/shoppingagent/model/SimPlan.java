package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimPlan {
    private String id;
    private String name;
    private double monthlyPrice;
    private String maxSpeed;
    private String description;
    private boolean isUnlimited;
}
