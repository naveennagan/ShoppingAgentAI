package com.shoppingagent.exception;

public class EmbeddingException extends RuntimeException {

    private final int statusCode;
    private final String responseBody;

    public EmbeddingException(String message) {
        super(message);
        this.statusCode = 0;
        this.responseBody = null;
    }

    public EmbeddingException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = 0;
        this.responseBody = null;
    }

    public EmbeddingException(String message, int statusCode, String responseBody) {
        super(message);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }

    public boolean isRetryable() {
        return statusCode == 429 || (statusCode >= 500 && statusCode < 600);
    }
}
