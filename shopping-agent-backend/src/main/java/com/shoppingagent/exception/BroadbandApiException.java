package com.shoppingagent.exception;

import org.springframework.http.HttpStatus;

public class BroadbandApiException extends RuntimeException {

    private final HttpStatus status;

    public BroadbandApiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public BroadbandApiException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
