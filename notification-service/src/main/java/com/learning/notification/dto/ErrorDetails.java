package com.learning.notification.dto;

import java.time.LocalDateTime;

// Standardized Java 17 Record for API error details
public record ErrorDetails(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path
) {
    public ErrorDetails(int status, String error, String message, String path) {
        this(LocalDateTime.now(), status, error, message, path);
    }
}
