package com.learning.product.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

// Declarative OpenFeign client calling AUTH-SERVICE registered in Eureka with Resilience4j fallback
@FeignClient(name = "auth-service", fallback = AuthServiceClientFallback.class)
public interface AuthServiceClient {

    // Calls Auth Service GET /api/v1/auth/validate?token=... endpoint via Eureka load balancing
    @GetMapping("/api/v1/auth/validate")
    Map<String, Object> validateToken(@RequestParam("token") String token);
}
