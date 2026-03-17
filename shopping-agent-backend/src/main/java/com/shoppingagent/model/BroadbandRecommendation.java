package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BroadbandRecommendation {
    private BroadbandPlan topPlan;
    private String topPlanReasoning;
    private List<AlternativePlan> alternatives; // max 2
}
