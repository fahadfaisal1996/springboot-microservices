# Topic 2: API Gateway & Dynamic Routing (Spring Cloud Gateway)

---

## ❓ What Problem Does an API Gateway Solve?

Without an API Gateway, a frontend application (e.g. Angular at `http://localhost:4200`) would have to:
1. Make direct HTTP requests to separate ports (`http://localhost:8081/api/v1/auth`, `http://localhost:8082/api/v1/products`).
2. Manage CORS configurations across dozens of microservices individually.
3. Expose all internal microservice IP addresses to the public internet.

The **Spring Cloud API Gateway** acts as a **Single Entry Point (Reverse Proxy)** on port `8080`.

---

## 🏗️ Gateway Architecture & Flow

```
                      +-----------------------------+
                      |     Angular Frontend        |
                      |   (http://localhost:4200)   |
                      +--------------+--------------+
                                     |
                         HTTP Requests (Port 8080)
                                     v
                      +-----------------------------+
                      |   Spring Cloud API Gateway  |
                      |        (Port 8080)          |
                      +------+---------------+------+
                             |               |
       Path: /api/v1/auth/** |               | Path: /api/v1/products/**
             (lb://AUTH-SERVICE)             (lb://PRODUCT-SERVICE)
                             v               v
                   +------------------+     +--------------------+
                   |   Auth Service   |     |  Product Service   |
                   |   (Port 8081)    |     |    (Port 8082)     |
                   +------------------+     +--------------------+
```

---

## 💻 Code Implementation in Our Project

In [`api-gateway/src/main/resources/application.yml`](file:///c:/SpringBoot/api-gateway/src/main/resources/application.yml):

```yaml
server:
  port: 8080 # Single external port for all API traffic

spring:
  application:
    name: api-gateway # Registered in Eureka as API-GATEWAY
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true # Enables automatic route creation using Eureka registry
          lower-case-service-id: true # Converts service names (e.g., AUTH-SERVICE -> auth-service)
      
      # 1. Global CORS Configuration for Angular frontend
      globalcors:
        cors-configurations:
          '[/**]': # Apply CORS policy to all incoming route paths
            allowedOrigins:
              - "http://localhost:4200" # Permit Angular dev server origin
              - "http://127.0.0.1:4200"
            allowedMethods: # Permit standard HTTP methods
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
              - PATCH
            allowedHeaders: "*" # Allow all request headers (Authorization, Content-Type, etc.)
            allowCredentials: true # Allow sending credentials/cookies

      # 2. Dynamic Service Routing Definitions
      routes:
        # Route 1: Auth Service
        - id: auth-service
          uri: lb://AUTH-SERVICE # 'lb://' uses Eureka client to load balance across AUTH-SERVICE instances
          predicates:
            - Path=/api/v1/auth/** # Forward any request starting with /api/v1/auth/

        # Route 2: Product Service
        - id: product-service
          uri: lb://PRODUCT-SERVICE # Load balances across PRODUCT-SERVICE instances
          predicates:
            - Path=/api/v1/products/** # Forward any request starting with /api/v1/products/

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/ # Eureka server address for route discovery
```

In [`ApiGatewayApplication.java`](file:///c:/SpringBoot/api-gateway/src/main/java/com/learning/gateway/ApiGatewayApplication.java):

```java
package com.learning.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication initializes Spring Cloud Gateway reactive engine
@SpringBootApplication
public class ApiGatewayApplication {

    public static void main(String[] args) {
        // Launches API Gateway on port 8080
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **`lb://` Protocol (Load-Balanced Routing)**: Instead of pointing to `http://localhost:8081`, the gateway uses `lb://AUTH-SERVICE`. It queries Eureka for all instances registered under `AUTH-SERVICE` and load balances requests across available nodes.
2. **Centralized CORS Policy**: Frontends only talk to port `8080`. CORS is configured once at the Gateway level, preventing cross-origin blockages.
3. **Predicates & Filters**: Gateway predicates match request paths (`/api/v1/products/**`) and seamlessly forward headers, payloads, and tokens.
