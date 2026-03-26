package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {
    private String appointmentId;
    private String orderId;
    private String preferredDate;      // ISO date string
    private String preferredTimeSlot;  // e.g. "morning" | "afternoon"
    private String confirmedDate;      // nullable
    private String engineerName;       // nullable
    private String status;             // "pending" | "confirmed" | "completed" | "cancelled"
}
