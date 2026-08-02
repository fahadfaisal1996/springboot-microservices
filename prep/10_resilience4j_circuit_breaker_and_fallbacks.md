# Topic 10: Circuit Breaker & Fallbacks (Resilience4j)

---

## ❓ What Problem Does a Circuit Breaker Solve?

In a distributed microservices network:
- If `auth-service` experiences high latency or crashes, requests from `product-service` will pile up, consuming threads and memory.
- This creates a **Cascading Failure**, causing `product-service`, `api-gateway`, and the entire platform to crash.

The **Circuit Breaker Pattern (Resilience4j)** isolates failing services:
- **CLOSED**: Normal operation. Requests flow to target microservice.
- **OPEN**: Target microservice is failing (e.g. failure rate > 50%). Requests are immediately redirected to a **Fallback Method** without making network calls.
- **HALF-OPEN**: After a wait period, a small number of trial requests are sent to check if target service has recovered.

---

## 🏗️ Resilience4j State Machine

```
              +-------------------------------------+
              |               CLOSED                |
              |   (All requests execute normally)   |
              +------------------+------------------+
                                 |
                                 | Failure Rate > 50%
                                 v
              +-------------------------------------+
              |                OPEN                 |
              | (Calls blocked; Fallbacks executed) |
              +------------------+------------------+
                                 |
                                 | Wait Duration Elapsed (10s)
                                 v
              +-------------------------------------+
              |              HALF-OPEN              |
              |  (Trial requests check recovery)    |
              +-------------------------------------+
```

---

## 💻 Code Implementation in Our Project

### 1. Fallback Implementation (`product-service`)

In [`AuthServiceClientFallback.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClientFallback.java):

```java
package com.learning.product.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Map;

// Executed automatically when Resilience4j detects Auth Service failures or timeouts
@Component
public class AuthServiceClientFallback implements AuthServiceClient {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceClientFallback.class);

    @Override
    public Map<String, Object> validateToken(String token) {
        log.warn("Resilience4j Circuit Breaker Fallback executed: Auth Service is unreachable.");
        
        // Return a graceful fallback response preventing cascading exception
        return Map.of(
                "valid", false,
                "reason", "Auth Service circuit breaker open / fallback executed"
        );
    }
}
```

---

### 2. Resilience4j Configuration (`product-service`)

In [`product-service/src/main/resources/application.yml`](file:///c:/SpringBoot/product-service/src/main/resources/application.yml):

```yaml
# Enable Resilience4j Circuit Breaker integration for OpenFeign
spring:
  cloud:
    openfeign:
      circuitbreaker:
        enabled: true

# Resilience4j Circuit Breaker Tuning
resilience4j:
  circuitbreaker:
    instances:
      authServiceClient:
        sliding-window-size: 10              # Evaluates failure rate over last 10 requests
        minimum-number-of-calls: 5           # Minimum requests required before calculating threshold
        failure-rate-threshold: 50           # Opens circuit if 50% or more requests fail
        wait-duration-in-open-state: 10000ms # Remains in OPEN state for 10 seconds before testing recovery
```

---

## 🔍 Key Concepts & Takeaways

1. **System Fault Tolerance**: If a dependency crashes, Resilience4j executes the fallback instantly in 0ms instead of waiting for TCP socket timeouts.
2. **Automated Recovery**: Once the wait duration elapses, Resilience4j transitions to `HALF-OPEN` and automatically closes the circuit if target health recovers.
3. **Production Metric Visibility**: Actuator exposes circuit breaker metrics at `/actuator/metrics/resilience4j.circuitbreaker.calls`.
