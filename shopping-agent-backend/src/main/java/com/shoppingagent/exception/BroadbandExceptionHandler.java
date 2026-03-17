package com.shoppingagent.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

@ControllerAdvice
public class BroadbandExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(BroadbandExceptionHandler.class);

    @ExceptionHandler(BroadbandApiException.class)
    public ResponseEntity<Map<String, Object>> handleBroadbandApiException(BroadbandApiException ex) {
        logger.error("BroadbandApiException: {}", ex.getMessage());
        int statusCode = ex.getStatus().value();
        return ResponseEntity.status(ex.getStatus())
                .body(Map.of("message", ex.getMessage(), "status", statusCode));
    }

    @ExceptionHandler(BroadbandAiException.class)
    public ResponseEntity<Map<String, Object>> handleBroadbandAiException(BroadbandAiException ex) {
        logger.error("BroadbandAiException: {}", ex.getMessage());
        if (ex.getStatus() == HttpStatus.GATEWAY_TIMEOUT) {
            return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT)
                    .body(Map.of("message", "AI recommendation timed out, please retry",
                                 "status", HttpStatus.GATEWAY_TIMEOUT.value()));
        }
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("message", "AI recommendations temporarily unavailable",
                             "status", HttpStatus.SERVICE_UNAVAILABLE.value()));
    }
}
