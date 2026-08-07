# Topic 17: Spring Boot Microservices + Angular Containerization Mastery Guide

---

## 📚 Overview & Architectural Importance

Containerization is the foundation of modern cloud-native software architecture. In an enterprise system comprising multiple microservices (`discovery-server`, `auth-service`, `product-service`, `notification-service`, `api-gateway`), event brokers (Apache Kafka), databases (MySQL), and a Single Page Application frontend (Angular), containerization guarantees **environment consistency** across local development, testing, and production environments.

This guide documents the step-by-step architectural principles, multi-stage Dockerfile patterns, Nginx SPA serving, Docker Compose orchestration, and real-world production gotchas for containerizing this platform from scratch.

---

## 🧩 1. Core Docker Architecture & Concepts

### A. Image vs Container vs Process

```
┌────────────────────────────────────────────────────────┐
│  Writable Container Layer (App logs, temp files)       │ ◄── Read-Write (Ephemeral)
├────────────────────────────────────────────────────────┤
│  Layer 4: Copy application.jar                        │ ◄── Immutable (Read-Only)
├────────────────────────────────────────────────────────┤
│  Layer 3: Run Maven package / npm build                │ ◄── Immutable (Read-Only)
├────────────────────────────────────────────────────────┤
│  Layer 2: Copy pom.xml / package.json                  │ ◄── Immutable (Read-Only)
├────────────────────────────────────────────────────────┤
│  Layer 1: Base Alpine Runtime (JRE 17 / Nginx)         │ ◄── Immutable (Read-Only)
└────────────────────────────────────────────────────────┘
```

* **Docker Image**: An immutable, read-only template composed of stacked filesystem layers.
* **Docker Container**: A runnable, isolated process instantiated from an Image with a thin read-write layer on top.
* **Layer Caching**: Docker caches every instruction layer based on SHA-256 checksums. Copying configuration files (`pom.xml`, `package.json`) *before* source code ensures dependencies are cached and builds finish in seconds.

---

## 🏭 2. Multi-Stage Dockerfile Patterns

### Why Multi-Stage Builds are Mandatory in Production

A naive single-stage build bundles JDK compilers, Maven/Node tooling, and raw source code into the production container, producing bloated images (~800MB) with severe security vulnerabilities.

A **Multi-Stage Build** uses a heavy build stage to compile code, and copies **only the compiled artifact** into a minimal runtime image (~118MB for JRE, ~20MB for Nginx).

```
[ STAGE 1: BUILD ]                             [ STAGE 2: RUNTIME ]
maven:3.9.6-eclipse-temurin-17-alpine          eclipse-temurin:17-jre-alpine (~118MB)
  │                                               │
  ├── Copy pom.xml & src                          │
  └── RUN mvn clean package ──────────────────────┼──► COPY --from=builder /app/target/*.jar app.jar
                                                  └── ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 📦 3. Module Dockerfile Reference

### A. Spring Boot Microservices (`discovery-server`, `auth-service`, etc.)

```dockerfile
# STAGE 1: Build Stage (JDK 17 + Maven)
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder
WORKDIR /app

# Copy parent POM and all module POMs for Maven dependency caching
COPY pom.xml .
COPY discovery-server/pom.xml discovery-server/
COPY auth-service/pom.xml auth-service/
COPY api-gateway/pom.xml api-gateway/
COPY product-service/pom.xml product-service/
COPY notification-service/pom.xml notification-service/

# Copy module source code
COPY discovery-server/src discovery-server/src

# Package only target module
RUN mvn clean package -pl discovery-server -am -DskipTests

# STAGE 2: Lightweight Runtime Stage (JRE 17)
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/discovery-server/target/*.jar app.jar
EXPOSE 8761
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### B. Angular 18 Frontend + Nginx Web Server

```dockerfile
# STAGE 1: Build Stage (Node.js 20)
FROM node:20-alpine AS builder
WORKDIR /app
COPY angular-frontend/package.json angular-frontend/package-lock.json ./
RUN npm ci

COPY angular-frontend/ .
RUN npm run build

# STAGE 2: Production Web Server (Nginx Alpine)
FROM nginx:alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
COPY angular-frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🌐 4. Angular SPA Routing & Nginx Configuration

In Single Page Applications (SPAs), routing is performed client-side by Angular's JavaScript router. When a user navigates to `/products` or refreshes the page, Nginx must be configured with `try_files $uri $uri/ /index.html;` to prevent returning a `404 Not Found`.

### `angular-frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;   # SPA fallback to index.html
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 🎼 5. Multi-Container Orchestration (`docker-compose.yml`)

`docker-compose.yml` orchestrates all 9 containers on a private virtual bridge network (`microservices-network`).

```yaml
version: '3.8'

services:
  # Infrastructure
  mysql:
    image: mysql:8.0
    container_name: mysql-db
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: authdb
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 10

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    ports:
      - "9092:9092"
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092

  # Service Discovery
  discovery-server:
    build:
      context: .
      dockerfile: discovery-server/Dockerfile
    container_name: discovery-server
    ports:
      - "8761:8761"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8761/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Microservices
  auth-service:
    build:
      context: .
      dockerfile: auth-service/Dockerfile
    container_name: auth-service
    ports:
      - "8081:8081"
    environment:
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://discovery-server:8761/eureka/
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    depends_on:
      discovery-server:
        condition: service_healthy

  product-service:
    build:
      context: .
      dockerfile: product-service/Dockerfile
    container_name: product-service
    ports:
      - "8082:8082"
    environment:
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      discovery-server:
        condition: service_healthy

  notification-service:
    build:
      context: .
      dockerfile: notification-service/Dockerfile
    container_name: notification-service
    ports:
      - "8083:8083"
    environment:
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      kafka:
        condition: service_started
      discovery-server:
        condition: service_healthy

  # Gateway & Frontend
  api-gateway:
    build:
      context: .
      dockerfile: api-gateway/Dockerfile
    container_name: api-gateway
    ports:
      - "8080:8080"
    environment:
      EUREKA_CLIENT_SERVICEURL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      discovery-server:
        condition: service_healthy

  angular-frontend:
    build:
      context: .
      dockerfile: angular-frontend/Dockerfile
    container_name: angular-frontend
    ports:
      - "80:80"
    depends_on:
      - api-gateway

volumes:
  mysql_data:
```

---

## ⚡ 6. Real-World Production Gotchas & Pitfalls

| Scenario / Challenge | Cause | Resolution |
|---|---|---|
| **Maven Multi-Module Build Failure** | `COPY discovery-server/pom.xml` without other module POMs causes parent POM `<modules>` check to fail. | Copy all module `pom.xml` files in Stage 1 before running `mvn clean package`. |
| **Containers cannot talk to `localhost`** | `localhost` inside a container refers to the container itself. | Use Docker Compose service names (`http://discovery-server:8761/eureka/`, `kafka:9092`). |
| **CORS Policy Rejection** | Frontend served on `http://localhost` (port 80), but Gateway CORS allowedOrigins only lists `http://localhost:4200`. | Add `http://localhost` and `http://localhost:80` to Gateway CORS `allowedOrigins`. |
| **503 Service Unavailable on Gateway Boot** | Eureka Client syncs registry on a 30-second interval cycle. | Gateway load balancer discovers instances as soon as the first 30s heartbeat cycle completes. |
| **`depends_on` Race Condition** | `depends_on` only waits for container creation, not database readiness. | Use `healthcheck` with `condition: service_healthy`. |
