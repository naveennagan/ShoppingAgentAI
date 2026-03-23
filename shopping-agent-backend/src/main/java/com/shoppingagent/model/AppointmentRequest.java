package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentRequest {
    private String sessionId;
    private String preferredDate;     // ISO date string
    private String preferredTimeSlot; // "morning" | "afternoon"
    private String broadbandItemId;   // optional: identifies which broadband plan this appointment is for
    private Double discountedMonthlyTotal; // optional: voucher-discounted price from frontend
}
