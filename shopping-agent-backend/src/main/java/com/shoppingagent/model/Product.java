package com.shoppingagent.model;

import com.google.gson.annotations.SerializedName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    private String id;
    private String name;
    private double price;
    private String description;
    private String category;
    @SerializedName("image_url")
    private String image;
    private Map<String, String> specs;
    private String brand;
    private int stock;
    private double rating;
    private List<String> tags;
}
