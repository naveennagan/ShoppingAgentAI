package com.shoppingagent.model;

import com.google.gson.annotations.SerializedName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Promotion {
    private String id;
    private String name;
    private String description;
    @SerializedName("discount_type")
    private String discountType;
    @SerializedName("discount_value")
    private double discountValue;
    @SerializedName("promo_code")
    private String promoCode;
    @SerializedName("start_date")
    private String startDate;
    @SerializedName("end_date")
    private String endDate;
    @SerializedName("promotional_label")
    private String promotionalLabel;
    @SerializedName("is_active")
    private boolean isActive;
    @SerializedName("created_at")
    private String createdAt;
}
