package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutSession {
    private String sessionId;
    private boolean hasDevices;
    private boolean hasBroadbandService;
    private boolean devicePaymentDone;
    private Map<String, String> broadbandBookingStatus; // cartItemId -> "unbooked" | appointmentId
    private double oneTimeTotal;
    private double monthlyTotal;
    private String status; // "open" | "device_paid" | "complete"
    private List<CheckoutCartItem> deviceItems;
    private List<CheckoutCartItem> serviceItems;
    private CustomerDetails customerDetails;
}
