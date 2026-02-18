package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CouponValidationResult {
    private String promotionId;
    private String promotionName;
    private String discountType;
    private double discountValue;
    private List<String> applicableProductIds;
}
