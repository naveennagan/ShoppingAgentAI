package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SummaryCard {
    private String type;
    private String id;
    private String name;
    private Double price;
    private String brand;
    private Double rating;
    private String downloadSpeed;
    private String uploadSpeed;
    private Double monthlyPrice;
    private String contractLength;
    private String promotionalLabel;
}
