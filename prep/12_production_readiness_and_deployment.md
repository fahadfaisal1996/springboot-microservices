# Topic 12: Production Readiness, Docker & Kubernetes Deployment Guide

---

## 📚 Overview & The 8 Pillars of Production Readiness

Moving a Spring Boot Microservices + Apache Kafka + Angular platform from local development (`localhost`) into an enterprise production environment requires a fundamental shift in architecture, reliability, and security.

Local prototypes often rely on in-memory databases, hardcoded secrets, single instance runners, and default configurations. An enterprise **Production-Ready** microservices deployment must satisfy **8 Core Pillars**:

```
+-----------------------------------------------------------------------------------+
|                            THE 8 PILLARS OF PRODUCTION READINESS                   |
+-----------------------------------------------------------------------------------+
| 1. Database Strategy     | PostgreSQL/MySQL 8 + Flyway Zero-Downtime Migrations    |
| 2. Containerization      | Optimized Multi-Stage Dockerfiles & Alpine Runtimes   |
| 3. Security Hardening    | Vault/K8s Secrets, TLS Termination, HttpOnly Tokens   |
| 4. Fault Tolerance       | Resilience4j Circuit Breakers, Retries & Fallbacks     |
| 5. Event Reliability     | HA Kafka Cluster, Min In-Sync Replicas & DLT           |
| 6. Observability & Logs  | Actuator Probes, Micrometer Tracing, Prometheus & ELK |
| 7. Orchestration         | Kubernetes Deployments, Ingress & Autoscaling (HPA)    |
| 8. Automated CI/CD       | GitHub Actions, Trivy Security Scans, Rolling Updates  |
+-----------------------------------------------------------------------------------+
```

---

## 🏗️ Production Architecture Blueprint

```
                                      HTTPS (Port 443)
                                              │
                                              ▼
                          ┌───────────────────────────────────────┐
                          │   Nginx Ingress / Cloud Load Balancer │
                          └───────────────────┬───────────────────┘
                                              │
                                              ▼
                          ┌───────────────────────────────────────┐
                          │     Spring Cloud API Gateway (Port 8080)│
                          └───────────────────┬───────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         │                                    │                                    │
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│   Auth Service   │                 │ Product Service  │                 │Notification Serv.│
│ (3 K8s Replicas) │                 │ (3 K8s Replicas) │                 │ (2 K8s Replicas) │
└────────┬─────────┘                 └────────┬─────────┘                 └────────┬─────────┘
         │                                    │                                    │
         │ (Flyway Managed)                   │ (Flyway Managed)                   │ (Kafka Listener)
         ▼                                    ▼                                    ▼
┌──────────────────┐                 ┌──────────────────┐                 ┌──────────────────┐
│ MySQL / Postgres │                 │ MySQL / Postgres │                 │  Apache Kafka    │
│  Auth DB Cluster │                 │Product DB Cluster│                 │  3-Broker Cluster │
└──────────────────┘                 └──────────────────┘                 └──────────────────┘
```

---

## 💻 1. Database Strategy & Zero-Downtime Schema Migrations

Production applications **must never use in-memory databases (H2)** or Spring JPA's auto-schema mutation (`hibernate.ddl-auto: update`).

### A. Production Database Configuration (`application-prod.yml`)
- Set `hibernate.ddl-auto` to `validate` (or `none`) so Hibernate never alters tables at runtime.
- Use **HikariCP** high-performance connection pooling with tuned limits.

```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:mysql-cluster.prod}:3306/${DB_NAME:authdb}?useSSL=true&requireSSL=true&serverTimezone=UTC&allowPublicKeyRetrieval=false
    username: ${DB_USER}
    password: ${DB_PASSWORD}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      max-lifetime: 1800000
      connection-timeout: 20000

  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
    hibernate:
      ddl-auto: validate # Do NOT use update or create-drop in production

  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration
```

### B. Versioned Flyway Migration Scripts
Place immutable versioned SQL scripts in `src/main/resources/db/migration/`:

- **[`V1__create_users_table.sql`](file:///c:/SpringBoot/auth-service/src/main/resources/db/migration/V1__create_users_table.sql)**:
  ```sql
  CREATE TABLE users (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) NOT NULL UNIQUE,
      email VARCHAR(100) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

- **[`V1__create_products_table.sql`](file:///c:/SpringBoot/product-service/src/main/resources/db/migration/V1__create_products_table.sql)**:
  ```sql
  CREATE TABLE products (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      stock_quantity INT NOT NULL DEFAULT 0,
      category VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  ```

---

## 🐳 2. Production Multi-Stage Containerization

To optimize Docker images for deployment speed and security:
- **Build Stage**: Compile application code using heavy SDKs (Maven / Node.js).
- **Runtime Stage**: Copy only compiled artifacts (JAR / static assets) into lightweight, secure Alpine Linux runtimes.

### A. Spring Boot Microservice Production Dockerfile
Created in each microservice root (e.g. `auth-service/Dockerfile`):

```dockerfile
# Stage 1: Build & Package application JAR
FROM eclipse-temurin:17-jdk-alpine AS builder
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN ./mvnw clean package -DskipTests

# Stage 2: Minimal Production JRE Runtime
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root security user
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copy built JAR artifact from builder stage
COPY --from=builder /app/target/*.jar app.jar

# JVM container memory tuning: Allocate 75% of container memory to heap
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

EXPOSE 8081
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

### B. Angular 18 Production Dockerfile & Custom Nginx Config
Created in [`angular-frontend/Dockerfile`](file:///c:/SpringBoot/angular-frontend/Dockerfile):

```dockerfile
# Stage 1: Compile Angular 18 Standalone App
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static files with high-performance Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/angular-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Created `angular-frontend/nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression for high performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Spring Cloud Gateway
    location /api/ {
        proxy_pass http://api-gateway:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### C. Complete Production Orchestration ([`docker-compose.yml`](file:///c:/SpringBoot/docker-compose.yml))

```yaml
version: '3.8'

services:
  # MySQL Database
  mysql-db:
    image: mysql:8.0
    container_name: mysql-db
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: cloudstore
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Apache Kafka Broker
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # Discovery Server
  discovery-server:
    build: ./discovery-server
    ports:
      - "8761:8761"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8761/actuator/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Auth Microservice
  auth-service:
    build: ./auth-service
    ports:
      - "8081:8081"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql-db:3306/cloudstore?useSSL=false
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: rootpassword
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      mysql-db:
        condition: service_healthy
      discovery-server:
        condition: service_healthy

  # Product Microservice
  product-service:
    build: ./product-service
    ports:
      - "8082:8082"
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql-db:3306/cloudstore?useSSL=false
      SPRING_DATASOURCE_USERNAME: root
      SPRING_DATASOURCE_PASSWORD: rootpassword
      EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      mysql-db:
        condition: service_healthy

  # API Gateway
  api-gateway:
    build: ./api-gateway
    ports:
      - "8080:8080"
    environment:
      EUREKA_CLIENT_SERVICE_URL_DEFAULTZONE: http://discovery-server:8761/eureka/
    depends_on:
      - discovery-server

  # Angular Web App
  angular-frontend:
    build: ./angular-frontend
    ports:
      - "80:80"
    depends_on:
      - api-gateway

volumes:
  mysql_data:
```

---

## 🔒 3. Production Security Hardening

1. **Secret & Key Management**:
   - **Never commit secrets to source code repository**.
   - Inject secrets via Environment Variables (`APP_JWT_SECRET`, `SPRING_DATASOURCE_PASSWORD`) or **Kubernetes Secrets** / **HashiCorp Vault**.

2. **CORS Lockdown**:
   - Restrict allowed origins strictly to your production domain:
     ```yaml
     spring:
       cloud:
         gateway:
           globalcors:
             cors-configurations:
               '[/**]':
                 allowedOrigins: "https://cloudstore.mydomain.com"
                 allowedMethods: ["GET", "POST", "PUT", "DELETE"]
                 allowedHeaders: ["Authorization", "Content-Type"]
                 allowCredentials: true
     ```

3. **API Gateway Rate Limiting**:
   - Use Spring Cloud Gateway's `RequestRateLimiter` filter with Redis to protect services against DDoS and brute-force attacks:
     ```yaml
     spring:
       cloud:
         gateway:
           routes:
             - id: auth-service
               uri: lb://AUTH-SERVICE
               predicates:
                 - Path=/api/v1/auth/**
               filters:
                 - name: RequestRateLimiter
                   args:
                     redis-rate-limiter.replenishRate: 10
                     redis-rate-limiter.burstCapacity: 20
     ```

---

## 📊 4. Observability, Health Probes & Distributed Tracing

### A. Kubernetes Health Probes (`spring-boot-starter-actuator`)
Spring Boot provides dedicated endpoints for Kubernetes **Liveness** (is container alive?) and **Readiness** (is container ready to handle traffic?):

In `application.yml`:
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, prometheus
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
```

- **Liveness Probe**: `GET /actuator/health/liveness`
- **Readiness Probe**: `GET /actuator/health/readiness`

### B. Distributed Tracing (Micrometer Tracing + Zipkin / Jaeger)
When a user request enters the API Gateway, Micrometer Tracing injects a unique **`TraceId`** and **`SpanId`** into the HTTP headers (`traceparent`) and MDC logs. This correlation ID travels across:
`Gateway ➔ Product Service ➔ Auth Service (Feign) ➔ Kafka Topic ➔ Notification Service`

Log format:
```text
2026-08-03 12:00:00.123 INFO [product-service,c68a4e12f001,4a1b02c4] 1234 --- [nio-8082-exec-1] c.l.p.c.ProductController : Fetching product ID: 10
```

---

## 🚀 5. Kubernetes Orchestration Blueprint

Below is an enterprise Kubernetes Deployment & Service manifest template (`auth-service-k8s.yaml`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: production
  labels:
    app: auth-service
spec:
  replicas: 3 # High Availability across nodes
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: mydockerregistry.com/cloudstore/auth-service:1.0.0
        ports:
        - containerPort: 8081
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1024Mi"
            cpu: "500m"
        envFrom:
        - secretRef:
            name: auth-service-secrets
        - configMapRef:
            name: auth-service-config
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8081
          initialDelaySeconds: 20
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8081
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: production
spec:
  type: ClusterIP
  ports:
  - port: 8081
    targetPort: 8081
  selector:
    app: auth-service
```

---

## ⚙️ 6. Automated CI/CD Pipeline (GitHub Actions)

Created `.github/workflows/ci-cd.yml` for automated compilation, testing, vulnerability scanning, and deployment:

```yaml
name: Production CI/CD Pipeline

on:
  push:
    branches: [ main ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Set up JDK 17
      uses: actions/setup-java@v4
      with:
        java-version: '17'
        distribution: 'temurin'

    - name: Build & Run Unit/Integration Tests
      run: ./mvnw clean test

  security-scan:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run Trivy Vulnerability Scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        ignore-unfixed: true
        severity: 'CRITICAL,HIGH'

  deploy-to-k8s:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Build & Push Docker Images
      run: |
        docker build -t myregistry.com/auth-service:${{ github.sha }} ./auth-service
        docker push myregistry.com/auth-service:${{ github.sha }}
    - name: Deploy to Kubernetes Cluster (Rolling Update)
      run: |
        kubectl set image deployment/auth-service auth-service=myregistry.com/auth-service:${{ github.sha }} -n production
```

---

## 🔍 Key Concepts & Takeaways

1. **Multi-Stage Builds**: Drastically shrinks container footprints (from >1GB build SDK down to ~50MB runtime JRE/Nginx) while eliminating security vulnerabilities.
2. **Zero-Downtime Migration**: Flyway manages schema evolution deterministically via versioned SQL scripts (`V1__...sql`).
3. **K8s Self-Healing**: Liveness probes detect deadlocks and restart frozen containers, while Readiness probes prevent traffic routing to booting services.
4. **Distributed Correlation**: Micrometer Tracing injects `TraceId` across Gateway, Microservices, OpenFeign, and Kafka events for end-to-end log aggregation.
