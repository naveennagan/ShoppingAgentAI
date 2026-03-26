package com.shoppingagent.exception;

import org.springframework.http.HttpStatus;

public class BroadbandAiException extends RuntimeException {

    private final HttpStatus status;

    public BroadbandAiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public BroadbandAiException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
