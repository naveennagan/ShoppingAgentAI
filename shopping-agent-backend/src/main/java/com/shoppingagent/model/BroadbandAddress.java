package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BroadbandAddress {
    private String uprn;
    private String formattedAddress;
    private String town;
    private String postcode;
}
