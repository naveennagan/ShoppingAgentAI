package com.shoppingagent.exception;

public class SupabaseConnectionException extends RuntimeException {

    public SupabaseConnectionException(String message) {
        super(message);
    }

    public SupabaseConnectionException(String message, Throwable cause) {
        super(message, cause);
    }
}
