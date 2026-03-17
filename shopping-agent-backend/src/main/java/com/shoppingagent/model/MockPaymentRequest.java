package com.shoppingagent.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Mock payment request — no real card processing.
 * Accepts any values and always succeeds for POC purposes.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MockPaymentRequest {
    private String sessionId;
    private String cardholderName;
    private String last4Digits;
}
