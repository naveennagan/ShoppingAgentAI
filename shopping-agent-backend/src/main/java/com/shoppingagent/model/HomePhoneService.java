package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HomePhoneService {
    private String id;
    private String name;
    private String description;
    private double monthlyPrice;
    private String includesCallsTo;
}
