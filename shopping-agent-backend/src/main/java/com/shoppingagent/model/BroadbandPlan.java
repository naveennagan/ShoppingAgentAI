package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BroadbandPlan {
    private String planId;
    private String name;
    private int downloadSpeedMbps;
    private int uploadSpeedMbps;
    private String technologyType;
    private int contractLengthMonths;
    private double monthlyPrice;
    private String promotionalLabel; // nullable
}
