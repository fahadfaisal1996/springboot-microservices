# Topic 9: Declarative Inter-Service REST Calls (Spring Cloud OpenFeign)

---

## ❓ What Problem Does OpenFeign Solve?

In microservices architectures, services often need to communicate with each other synchronously via HTTP REST (e.g. `product-service` calling `auth-service` to validate tokens or fetch user profile details).

Without OpenFeign, developers must write verbose `RestTemplate` or `WebClient` code:
```java
// Traditional verbose RestTemplate code:
String url = "http://AUTH-SERVICE/api/v1/auth/validate?token=" + token;
ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
```

**Spring Cloud OpenFeign** provides a **Declarative HTTP Client**:
- Developers write a simple Java interface annotated with `@FeignClient`.
- Spring automatically generates the implementation at runtime, handles URL resolution via Eureka Service Discovery, and deserializes JSON responses seamlessly.

---

## 🏗️ OpenFeign Inter-Service Call Architecture

```
Product Microservice                       Auth Microservice
   (Port 8082)                                (Port 8081)
       |                                           |
AuthServiceClient (Interface)                      |
       |                                           |
       | @GetMapping("/api/v1/auth/validate")      |
       +------------------------------------------>| Handles Request & Returns
       |      HTTP GET via Eureka Discovery        | Token Claims JSON
       |<------------------------------------------+
       |
  (Translates JSON to Map<String, Object>)
```

---

## 💻 Code Implementation in Our Project

### 1. Enable Feign Clients (`product-service`)

In [`ProductServiceApplication.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/ProductServiceApplication.java):

```java
package com.learning.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
// @EnableFeignClients scans for interfaces annotated with @FeignClient
@EnableFeignClients
public class ProductServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProductServiceApplication.class, args);
    }
}
```

---

### 2. Declarative Feign Client Interface (`product-service`)

In [`AuthServiceClient.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClient.java):

```java
package com.learning.product.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.Map;

// @FeignClient binds this interface to 'auth-service' registered in Eureka
// fallback specifies the Resilience4j class to invoke if auth-service fails
@FeignClient(name = "auth-service", fallback = AuthServiceClientFallback.class)
public interface AuthServiceClient {

    // Declarative GET endpoint mapping matching Auth Service REST controller signature
    @GetMapping("/api/v1/auth/validate")
    Map<String, Object> validateToken(@RequestParam("token") String token);
}
```

---

## 🔍 Key Concepts & Takeaways

1. **Eureka Integration**: OpenFeign automatically looks up `auth-service` in Eureka's registry and performs client-side load balancing across available instances.
2. **Zero Boilerplate**: No manual HTTP request creation, query string parsing, or response status handling required.
3. **Resilience Integration**: OpenFeign integrates natively with Resilience4j circuit breakers for automatic fallback handling.
