package com.shoppingagent.model;

import com.google.gson.annotations.SerializedName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Bundle {
    private String id;
    private String name;
    private String description;
    @SerializedName("discount_type")
    private String discountType;
    @SerializedName("discount_value")
    private double discountValue;
    @SerializedName("is_active")
    private boolean isActive;
    @SerializedName("created_at")
    private String createdAt;
    @SerializedName("bundle_items")
    private List<BundleItem> items;
}
