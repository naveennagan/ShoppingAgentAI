package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSelectionPayload {
    private String sessionId;
    private String postcodeId;
    private String addressId;
    private String selectedPlanId;
    private List<String> selectedAddonIds;
    private String selectedTvPackageId;
    private String selectedSimPlanId;
    private String selectedHomePhoneServiceId;
    private double totalMonthlyPrice;
}
