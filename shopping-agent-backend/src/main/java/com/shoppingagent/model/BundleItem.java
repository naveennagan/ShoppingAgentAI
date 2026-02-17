package com.shoppingagent.model;

import com.google.gson.annotations.SerializedName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BundleItem {
    private String id;
    @SerializedName("bundle_id")
    private String bundleId;
    @SerializedName("product_id")
    private String productId;
    @SerializedName("created_at")
    private String createdAt;
}
