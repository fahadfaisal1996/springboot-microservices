# Production Readiness & Deployment Guide

This document details the complete step-by-step roadmap to take this **Spring Boot 4.1.0 Microservices + Apache Kafka + OpenFeign + Resilience4j + MySQL / PostgreSQL + Angular 18** platform into an enterprise **100% Production-Ready** deployment.

---

## 🗄️ 1. Database Migration & Schemas (MySQL & PostgreSQL)

While in-memory H2 databases are available for zero-setup local dev testing, production environments run dedicated transactional database instances (**MySQL 8.0** or **PostgreSQL 16**).

### A. Database Driver & Flyway Dependencies (`pom.xml`)
In `auth-service/pom.xml` and `product-service/pom.xml`:
```xml
<!-- MySQL Production Driver -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Flyway Database Versioning -->
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-mysql</artifactId>
</dependency>
```

### B. Production MySQL Datasource Properties (`application-prod.yml`)
```yaml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST:localhost}:3306/${DB_NAME:authdb}?useSSL=true&serverTimezone=UTC
    username: ${DB_USER:prod_user}
    password: ${DB_PASSWORD:secret_production_password}
  jpa:
    database-platform: org.hibernate.dialect.MySQLDialect
    hibernate:
      ddl-auto: validate # Do NOT use update or create-drop in production environments
  flyway:
    enabled: true
    baseline-on-migrate: true
```

### C. Flyway Versioned Migration Scripts
Versioned SQL DDL scripts created in `src/main/resources/db/migration/`:
- [`auth-service/src/main/resources/db/migration/V1__create_users_table.sql`](file:///c:/SpringBoot/auth-service/src/main/resources/db/migration/V1__create_users_table.sql)
- [`product-service/src/main/resources/db/migration/V1__create_products_table.sql`](file:///c:/SpringBoot/product-service/src/main/resources/db/migration/V1__create_products_table.sql)

---

## 🐳 2. Containerization & Docker Orchestration

Every component includes a multi-stage production `Dockerfile`.

### A. Production Multi-Container Orchestration ([`docker-compose.yml`](file:///c:/SpringBoot/docker-compose.yml))
To launch all services (Databases, Kafka, Zookeeper, Eureka, Gateway, Microservices, Nginx Frontend) in Docker:

```bash
docker-compose up -d --build
```

### B. Local MySQL Dev Server ([`docker-compose-mysql.yml`](file:///c:/SpringBoot/docker-compose-mysql.yml))
To launch a dedicated local MySQL 8.0 server on Port `3306`:
```bash
docker-compose -f docker-compose-mysql.yml up -d
```

---

## 🛡️ 3. Fault Tolerance & Inter-Service Communication

1. **Spring Cloud OpenFeign**:
   - Declarative inter-service REST calls between `product-service` and `auth-service` via [`AuthServiceClient.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClient.java).

2. **Resilience4j Circuit Breakers & Fallbacks**:
   - Circuit breakers protect inter-service calls using [`AuthServiceClientFallback.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClientFallback.java).
   - Configured failure rate thresholds (50%), sliding window sizes (10 calls), and wait durations (10s) to prevent cascading failures.

---

## 📢 4. Event-Driven Messaging (Apache Kafka)

1. **Kafka Producer (`auth-service`)**:
   - Publishes `UserRegisteredEvent` records to topic `user-registration-events`.
2. **Kafka Consumer (`notification-service`)**:
   - Subscribes via `@KafkaListener` using consumer group `notification-group`.
3. **Production Tuning**:
   - Set topic replication factor > 1 (`KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 3`) across a multi-broker Kafka cluster.

---

## 🔒 5. Production Security Hardening

1. **Secret & Key Injection**:
   - Never commit JWT secret strings or DB passwords to source code.
   - Inject via Environment Variables (`APP_JWT_SECRET`, `SPRING_DATASOURCE_PASSWORD`) or **Kubernetes Secrets** / **HashiCorp Vault**.

2. **HTTPS / TLS Termination**:
   - Terminate SSL/TLS certificates at the API Gateway or Nginx layer.

3. **Short-Lived JWT & Refresh Tokens**:
   - Limit JWT access token expiration to 15 minutes and issue `HttpOnly` refresh token cookies.

---

## 📊 6. Observability, Metrics & Distributed Tracing

1. **Spring Boot Actuator Endpoints**:
   - Production readiness/liveness checks at `/actuator/health` and `/actuator/metrics`.

2. **Distributed Tracing (Micrometer + Zipkin / Jaeger)**:
   - Assigns a correlation `TraceId` at the API Gateway to track requests across Gateway ➔ Microservice ➔ Kafka.

3. **Metrics & Logging**:
   - Scraped by Prometheus & Grafana. Logs aggregated via ELK Stack or Grafana Loki.

---

## 🚀 7. Kubernetes Manifests & GitHub Actions CI/CD

### A. Kubernetes Deployment Sample (`auth-service.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: auth-service
        image: myregistry.com/auth-service:v4.1.0
        ports:
        - containerPort: 8081
        envFrom:
        - secretRef:
            name: auth-service-secrets
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 20
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8081
          initialDelaySeconds: 30
```

### B. CI/CD Automated Workflow (`.github/workflows/deploy.yml`)
1. Automated unit & integration testing (`./mvnw test`).
2. Trivy security container vulnerability scanning.
3. Automated push to Amazon ECR / DockerHub.
4. Blue-Green / Rolling update deployment to Kubernetes.
