package com.shoppingagent.exception;

public class InvalidCouponException extends RuntimeException {

    public enum Reason { NOT_FOUND, EXPIRED, INACTIVE, WRONG_ITEM_TYPE, INVALID_CONFIG }

    private final Reason reason;

    public InvalidCouponException(String message, Reason reason) {
        super(message);
        this.reason = reason;
    }

    public Reason getReason() {
        return reason;
    }
}
