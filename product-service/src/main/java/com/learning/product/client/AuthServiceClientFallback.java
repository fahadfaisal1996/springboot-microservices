package com.learning.product.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

// Resilience4j Fallback implementation executed when Auth Service is offline or times out
@Component
public class AuthServiceClientFallback implements AuthServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceClientFallback.class);

    @Override
    public Map<String, Object> validateToken(String token) {
        log.warn("Resilience4j Circuit Breakers Fallback triggered: Auth Service is unreachable or timed out.");
        return Map.of(
                "valid", false,
                "reason", "Auth Service circuit breaker open / fallback executed"
        );
    }
}
