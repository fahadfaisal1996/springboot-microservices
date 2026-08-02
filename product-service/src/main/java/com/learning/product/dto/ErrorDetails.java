package com.learning.product.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ErrorDetails(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> fieldErrors
) {
    public ErrorDetails(int status, String error, String message, String path) {
        this(LocalDateTime.now(), status, error, message, path, null);
    }

    public ErrorDetails(int status, String error, String message, String path, Map<String, String> fieldErrors) {
        this(LocalDateTime.now(), status, error, message, path, fieldErrors);
    }
}
