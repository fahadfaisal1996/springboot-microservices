# Microservices & Frontend Configuration Specification (Dev vs Prod)

This document provides a detailed, commented reference for all configuration properties used across the Spring Boot Microservices, Apache Kafka, and Angular Frontend architecture. It explains **Dev vs Prod configurations**, **where each property is managed**, **its architectural importance**, and **how to maintain it safely in Production**.

---

## 📚 Table of Contents
1. [Configuration Management Architecture](#1-configuration-management-architecture)
2. [Discovery Server (`discovery-server`)](#2-discovery-server-discovery-server)
3. [API Gateway (`api-gateway`)](#3-api-gateway-api-gateway)
4. [Auth Service (`auth-service`)](#4-auth-service-auth-service)
5. [Product Service (`product-service`)](#5-product-service-product-service)
6. [Notification Service (`notification-service`)](#6-notification-service-notification-service)
7. [Angular Frontend (`angular-frontend`)](#7-angular-frontend-angular-frontend)
8. [Master Dev vs Prod Comparison Table](#8-master-dev-vs-prod-comparison-table)

---

## 1. Configuration Management Architecture

### How Configuration is Managed in This Project:
- **Development Environment (`dev`)**: Uses `application.yml` and Spring Profile `application-mysql.yml` for local development. Embedded H2 or Dockerized local MySQL (3306) and local Kafka (9092) are used for zero-setup execution.
- **Production Environment (`prod`)**: Uses `application-prod.yml` or Docker/Kubernetes Environment Variables. Hardcoded secrets (like JWT secrets and DB passwords) are replaced by **Environment Variable Injections** (`${DB_PASSWORD}`, `${APP_JWT_SECRET}`).

### How to Maintain Configuration in Production:
1. **Spring Cloud Config Server / Vault**: Centralizes configuration properties in a secure Git repository or HashiCorp Vault.
2. **Kubernetes ConfigMaps & Secrets**: Mounts configuration properties as environment variables or volume mounts into container pods.
3. **Twelve-Factor App Methodology**: Keeps code completely decoupled from configuration; environment variables override default properties at runtime.

---

## 2. Discovery Server (`discovery-server`)

### File Location: [`discovery-server/src/main/resources/application.yml`](file:///c:/SpringBoot/discovery-server/src/main/resources/application.yml)

### 🛠️ Development Configuration (`application.yml`):
```yaml
server:
  # Port on which Eureka Server listens for client registrations and heartbeat pings
  port: 8761

spring:
  application:
    # Service ID used by Eureka and Spring Context
    name: discovery-server

eureka:
  instance:
    # Local hostname for single-node development
    hostname: localhost
  client:
    # Disables self-registration because this node IS the registry server
    register-with-eureka: false
    # Disables fetching registry entries because this node is the master registry
    fetch-registry: false
    # Eureka registry endpoint URL
    service-url:
      defaultZone: http://${eureka.instance.hostname}:${server.port}/eureka/
```

### 🏭 Production Configuration & Maintenance (`application-prod.yml`):
```yaml
server:
  port: 8761

spring:
  application:
    name: discovery-server

eureka:
  instance:
    # Uses container hostname or pod IP in production Kubernetes/ECS clusters
    hostname: ${EUREKA_HOST:discovery-server}
    prefer-ip-address: true
  client:
    # In a multi-node Eureka HA cluster, set to true to sync registry across peer nodes
    register-with-eureka: true
    fetch-registry: true
    service-url:
      # Peer awareness URL list for High Availability (HA) Eureka clustering
      defaultZone: http://eureka-node1:8761/eureka/,http://eureka-node2:8761/eureka/
```

- **Importance**: High. If Eureka goes down, API Gateway cannot resolve new microservice instances.
- **Production Maintenance**: Run at least 2 replica nodes across different availability zones (AZs) for high availability.

---

## 3. API Gateway (`api-gateway`)

### File Location: [`api-gateway/src/main/resources/application.yml`](file:///c:/SpringBoot/api-gateway/src/main/resources/application.yml)

### 🛠️ Development Configuration (`application.yml`):
```yaml
server:
  # Single public entry-point port for all external client API calls
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      discovery:
        locator:
          # Automatically registers Eureka services as gateway routes
          enabled: true
          # Normalizes service IDs to lowercase (e.g. AUTH-SERVICE -> auth-service)
          lower-case-service-id: true

      # Global CORS policy allowing Angular dev server (http://localhost:4200)
      globalcors:
        cors-configurations:
          '[/**]':
            allowedOrigins:
              - "http://localhost:4200"
              - "http://127.0.0.1:4200"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
              - PATCH
            allowedHeaders: "*"
            allowCredentials: true

      # Route definitions mapping path predicates to Eureka service names
      routes:
        # Route 1: Auth Microservice
        - id: auth-service
          uri: lb://AUTH-SERVICE # lb:// uses Eureka client load balancing
          predicates:
            - Path=/api/v1/auth/**

        # Route 2: Product Microservice
        - id: product-service
          uri: lb://PRODUCT-SERVICE
          predicates:
            - Path=/api/v1/products/**

        # Route 3: Notification Microservice
        - id: notification-service
          uri: lb://NOTIFICATION-SERVICE
          predicates:
            - Path=/api/v1/notifications/**

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
  instance:
    prefer-ip-address: true
```

### 🏭 Production Configuration & Maintenance (`application-prod.yml`):
```yaml
server:
  port: 8080

spring:
  application:
    name: api-gateway
  cloud:
    gateway:
      globalcors:
        cors-configurations:
          '[/**]':
            # Production domain origin restricted via Environment Variable
            allowedOrigins:
              - "${ALLOWED_ORIGIN:https://cloudstore.com}"
            allowedMethods:
              - GET
              - POST
              - PUT
              - DELETE
              - OPTIONS
            allowedHeaders: "*"
            allowCredentials: true

eureka:
  client:
    service-url:
      defaultZone: ${EUREKA_SERVER_URL:http://discovery-server:8761/eureka/}
```

- **Importance**: Critical. Fronts the entire backend.
- **Production Maintenance**: Place an SSL/TLS Load Balancer (AWS ALB / Nginx) in front of Gateway port 8080 to handle HTTPS termination and rate-limiting.

---

## 4. Auth Service (`auth-service`)

### File Location: [`auth-service/src/main/resources/application.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application.yml) & [`application-mysql.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application-mysql.yml)

### 🛠️ Development Configuration (`application.yml` & `application-mysql.yml`):
```yaml
server:
  port: 8081

spring:
  application:
    name: auth-service

  # Default H2 In-Memory Database for local zero-setup dev
  datasource:
    url: jdbc:h2:mem:authdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
    username: sa
    password: password
  h2:
    console:
      enabled: true # Enables H2 Web Console at http://localhost:8081/h2-console
      path: /h2-console
  jpa:
    database-platform: org.hibernate.dialect.H2Dialect
    hibernate:
      ddl-auto: update # Automatically creates/updates SQL schema in dev

  # Apache Kafka Producer Settings
  kafka:
    bootstrap-servers: localhost:9092 # Local Kafka broker
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
      properties:
        # Maps event type header to Java 17 Record class
        spring.json.type.mapping: event:com.learning.auth.dto.UserRegisteredEvent

app:
  jwt:
    # Base64 HMAC-SHA secret key used to sign JWT tokens
    secret: 404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
    # Token expiration time (86400000 ms = 24 hours)
    expiration-ms: 86400000
```

### 🏭 Production Configuration & Maintenance (`application-prod.yml`):
```yaml
server:
  port: 8081

spring:
  datasource:
    # Injects production PostgreSQL/MySQL connection details from secrets manager
    url: jdbc:postgresql://${DB_HOST:postgres-auth}:5432/authdb
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:secret_prod_password}
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: validate # Validates schema without modifying production tables
  flyway:
    enabled: true # Runs versioned SQL migration scripts (V1__create_users_table.sql)

  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:kafka:9092}

app:
  jwt:
    # MUST be injected securely from Kubernetes Secret / AWS Secrets Manager
    secret: ${APP_JWT_SECRET}
    # Shortened token expiration time for security (15 minutes = 900000 ms)
    expiration-ms: 900000
```

- **Importance**: Critical. Manages user identities and security tokens.
- **Production Maintenance**: Rotate `APP_JWT_SECRET` periodically and implement refresh tokens stored in `HttpOnly` secure cookies.

---

## 5. Product Service (`product-service`)

### File Location: [`product-service/src/main/resources/application.yml`](file:///c:/SpringBoot/product-service/src/main/resources/application.yml)

### 🛠️ Development Configuration (`application.yml`):
```yaml
server:
  port: 8082

spring:
  application:
    name: product-service

  # Enable Resilience4j Circuit Breaker for OpenFeign Clients
  cloud:
    openfeign:
      circuitbreaker:
        enabled: true

# Resilience4j Circuit Breaker Settings for AuthServiceClient
resilience4j:
  circuitbreaker:
    instances:
      authServiceClient:
        sliding-window-size: 10              # Evaluates failure rate over last 10 requests
        minimum-number-of-calls: 5           # Minimum requests required before calculating failure rate
        failure-rate-threshold: 50           # Opens circuit if 50% or more requests fail
        wait-duration-in-open-state: 10000ms # Remains OPEN for 10s before testing recovery

# Actuator Health & Metrics Monitoring Endpoints
management:
  endpoints:
    web:
      exposure:
        include: "health,info,metrics,prometheus"
  endpoint:
    health:
      show-details: always
```

### 🏭 Production Configuration & Maintenance (`application-prod.yml`):
```yaml
server:
  port: 8082

spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:postgres-product}:5432/productdb
    username: ${DB_USER:postgres}
    password: ${DB_PASSWORD:secret_prod_password}
  jpa:
    hibernate:
      ddl-auto: validate

# Production Resilience4j Tuning
resilience4j:
  circuitbreaker:
    instances:
      authServiceClient:
        sliding-window-size: 50
        minimum-number-of-calls: 20
        failure-rate-threshold: 50
        wait-duration-in-open-state: 15000ms

# Production Actuator Security Configuration
management:
  endpoints:
    web:
      exposure:
        include: "health,prometheus" # Hide sensitive endpoints like info or env in production
```

- **Importance**: High. Handles product domain logic and inter-service REST calls.
- **Production Maintenance**: Monitor Resilience4j circuit state via Grafana dashboards connected to `/actuator/prometheus`.

---

## 6. Notification Service (`notification-service`)

### File Location: [`notification-service/src/main/resources/application.yml`](file:///c:/SpringBoot/notification-service/src/main/resources/application.yml)

### 🛠️ Development & Production Configuration:
```yaml
server:
  port: 8083

spring:
  application:
    name: notification-service

  # Kafka Consumer Settings
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS:localhost:9092}
    consumer:
      group-id: notification-group # Consumer group for message offset management
      auto-offset-reset: earliest # Reads from beginning if offset is missing
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*" # Permits deserializing JSON to DTO event records
```

- **Importance**: Medium. Asynchronously processes Kafka events.
- **Production Maintenance**: Scale out replicas within `notification-group` to process high-volume Kafka partition traffic in parallel.

---

## 7. Angular Frontend (`angular-frontend`)

### File Location: [`angular-frontend/angular.json`](file:///c:/SpringBoot/angular-frontend/angular.json) & [`angular-frontend/Dockerfile`](file:///c:/SpringBoot/angular-frontend/Dockerfile)

### 🛠️ Development vs 🏭 Production Setup:
- **Development**: Managed via Angular CLI (`ng serve --port 4200`). Directly proxies requests to API Gateway at `http://localhost:8080`.
- **Production**: Multi-stage Docker build compiled into optimized static assets (`ng build --configuration production`) served via **Nginx** on Port `80`.

### Nginx Production Configuration (`angular-frontend/Dockerfile`):
```dockerfile
# Stage 1: Build Angular production distribution bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static production assets using lightweight Nginx container
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 8. Master Dev vs Prod Comparison Table

| Configuration Property | Managed In | Development Value | Production Value | Production Maintenance Strategy |
|---|---|---|---|---|
| **Eureka Server Port** | `discovery-server` | `8761` | `8761` | Run 2+ HA replica nodes across availability zones |
| **Eureka Client Registration** | `application.yml` | `http://localhost:8761/eureka/` | `http://eureka-node1:8761/eureka/` | Managed via DNS or Kubernetes Service names |
| **API Gateway Public Port** | `api-gateway` | `8080` | `8080` / `443 (HTTPS)` | Terminate SSL/TLS at ALB/Nginx layer |
| **CORS Allowed Origins** | `api-gateway` | `http://localhost:4200` | `${ALLOWED_ORIGIN}` | Restrict strictly to official production domain |
| **Database Datasource URL** | `auth-service` / `product-service` | `jdbc:h2:mem:authdb` / `jdbc:mysql://localhost:3306` | `jdbc:postgresql://postgres-db:5432` | Use Flyway migration scripts; inject host via ENV |
| **Database DDL Strategy** | `jpa.hibernate.ddl-auto` | `update` | `validate` | Never use `update` in Prod; rely on Flyway SQL scripts |
| **JWT Secret Key** | `app.jwt.secret` | Hardcoded Base64 string | `${APP_JWT_SECRET}` | Inject from AWS Secrets Manager / k8s Secrets |
| **JWT Expiration Time** | `app.jwt.expiration-ms` | `86400000` (24 Hours) | `900000` (15 Minutes) | Use short access tokens + HttpOnly refresh cookies |
| **Kafka Bootstrap Server** | `spring.kafka.bootstrap-servers` | `localhost:9092` | `${KAFKA_BOOTSTRAP_SERVERS}` | Multi-broker Kafka cluster with replication factor = 3 |
| **Feign Circuit Breaker** | `resilience4j.circuitbreaker` | 5 calls threshold | 20+ calls threshold | Monitor circuit state via Prometheus Grafana dashboards |
| **Actuator Endpoints** | `management.endpoints.web` | `health,info,metrics,prometheus` | `health,prometheus` | Restrict sensitive endpoints; integrate with k8s probes |
