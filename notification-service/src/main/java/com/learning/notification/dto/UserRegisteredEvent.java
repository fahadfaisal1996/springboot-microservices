package com.learning.notification.dto;

import java.time.LocalDateTime;

// Java 17 Record matching incoming Kafka UserRegisteredEvent payload
public record UserRegisteredEvent(
        String username,
        String email,
        String role,
        LocalDateTime timestamp
) {}
