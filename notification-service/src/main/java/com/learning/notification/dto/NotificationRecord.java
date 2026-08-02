package com.learning.notification.dto;

import java.time.LocalDateTime;

// Java 17 Record storing processed notification event details
public record NotificationRecord(
        String id,
        String recipient,
        String message,
        String channel,
        LocalDateTime timestamp
) {
    public NotificationRecord(String recipient, String message, String channel) {
        this(java.util.UUID.randomUUID().toString(), recipient, message, channel, LocalDateTime.now());
    }
}
