package com.learning.auth.dto;

import java.time.LocalDateTime;

// Java 17 Record representing the Kafka event payload published on user registration
public record UserRegisteredEvent(
        String username,
        String email,
        String role,
        LocalDateTime timestamp
) {
    public UserRegisteredEvent(String username, String email, String role) {
        this(username, email, role, LocalDateTime.now());
    }
}
