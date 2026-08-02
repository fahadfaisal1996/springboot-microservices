# Topic 15: Production Microservices & API Troubleshooting Guide

---

## 📚 Overview & Diagnostic Methodology

In a multi-instance production microservices environment running on Kubernetes / AWS ECS with Spring Boot, Apache Kafka, and Angular, issues can occur at the **Gateway**, **Service Discovery**, **Database**, **Inter-Service REST**, **Kafka Consumer**, or **Frontend** layers.

This guide provides a structured troubleshooting playbook for the top 10 heavy production failure scenarios, complete with diagnostic commands, log outputs, Root Cause Analysis (RCA), and exact mitigation steps.

---

## 🛠️ Master Diagnostic Toolkit Checklist

```bash
# 1. Kubernetes Pod & Log Inspection
kubectl get pods -n production -o wide
kubectl logs -f deployment/auth-service -n production --tail=200
kubectl describe pod <pod-name> -n production

# 2. JVM & Heap Memory Diagnostics
jcmd <pid> GC.heap_info
jmap -histo:live <pid> | head -n 20
jstack <pid> > thread_dump.txt

# 3. Spring Boot Actuator Telemetry
curl http://localhost:8082/actuator/health
curl http://localhost:8082/actuator/metrics/resilience4j.circuitbreaker.calls
curl http://localhost:8082/actuator/prometheus | grep hikaricp

# 4. Kafka Partition & Consumer Group Lag
kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group notification-group
```

---

## 🚨 Top 10 Production Failure Scenarios & Troubleshooting

### Scenario 1: Eureka Heartbeat Timeout & HTTP 503 Service Unavailable

#### 🔴 Symptom:
API Gateway returns `503 Service Unavailable` or `504 Gateway Timeout` when client calls `GET /api/v1/products`.

#### 🔍 Diagnostic Steps:
1. Access Eureka Dashboard (`http://localhost:8761`) or query Eureka API:
   ```bash
   curl -H "Accept: application/json" http://localhost:8761/eureka/apps/PRODUCT-SERVICE
   ```
2. Check API Gateway logs:
   ```text
   org.springframework.cloud.gateway.support.NotFoundException: Unable to find instance for PRODUCT-SERVICE
   ```

#### 🔬 Root Cause (RCA):
- `product-service` pods missed 3 consecutive heartbeat pings (90 seconds) due to a heavy Garbage Collection (GC) pause or pod crash, causing Eureka Server to evict `PRODUCT-SERVICE` from its active registry.

#### 💡 Resolution & Fix:
- Enable self-preservation mode in Eureka Server [`discovery-server/src/main/resources/application.yml`](file:///c:/SpringBoot/discovery-server/src/main/resources/application.yml):
  ```yaml
  eureka:
    server:
      enable-self-preservation: true
      eviction-interval-timer-in-ms: 5000
  ```
- Increase pod memory limits in Kubernetes deployment to eliminate GC pauses.

---

### Scenario 2: Resilience4j Circuit Breaker OPEN & OpenFeign Fallback Execution

#### 🔴 Symptom:
`product-service` calls `auth-service` via OpenFeign client to validate JWT token, but receives fallback responses (`"valid": false`).

#### 🔍 Diagnostic Steps:
1. Query Resilience4j Actuator metrics on `product-service`:
   ```bash
   curl http://localhost:8082/actuator/metrics/resilience4j.circuitbreaker.state?tag=name:authServiceClient
   ```
   *Response*: `"VALUE": ["OPEN"]`

2. Check `product-service` application logs:
   ```text
   WARN com.learning.product.client.AuthServiceClientFallback - Resilience4j Circuit Breaker Fallback executed: Auth Service is unreachable.
   ```

#### 🔬 Root Cause (RCA):
- Over 50% of recent HTTP calls from `product-service` to `auth-service` failed or timed out, triggering Resilience4j to open the circuit and execute [`AuthServiceClientFallback.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClientFallback.java).

#### 💡 Resolution & Fix:
- Inspect `auth-service` health and thread pools.
- Once `auth-service` recovers, Resilience4j transitions from `OPEN` ➔ `HALF-OPEN` ➔ `CLOSED` automatically after the configured `wait-duration-in-open-state` (10s).

---

### Scenario 3: Database Connection Pool Exhaustion (HikariCP Timeout)

#### 🔴 Symptom:
API endpoints return `HTTP 500 Internal Server Error` with slow response latency (>30 seconds).

#### 🔍 Diagnostic Steps:
1. Inspect microservice log trace:
   ```text
   java.sql.SQLTransientConnectionException: HikariPool-1 - Connection is not available, request timed out after 30000ms.
   ```
2. Check HikariCP Actuator metrics:
   ```bash
   curl http://localhost:8081/actuator/metrics/hikaricp.connections.pending
   ```

#### 🔬 Root Cause (RCA):
- Database connection leaks caused by uncommitted `@Transactional` methods or long-running external HTTP API calls inside database transactions.

#### 💡 Resolution & Fix:
- Configure HikariCP maximum pool size and connection leak detection in [`application.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application.yml):
  ```yaml
  spring:
    datasource:
      hikari:
        maximum-pool-size: 20
        connection-timeout: 20000
        leak-detection-threshold: 5000 # Logs warning if connection held > 5s
  ```
- Ensure no external REST/Kafka calls are executed inside `@Transactional` blocks.

---

### Scenario 4: Kafka Consumer Group Rebalancing & Partition Lag

#### 🔴 Symptom:
User registers successfully, but welcome email notifications are delayed by minutes or hours.

#### 🔍 Diagnostic Steps:
1. Run Kafka consumer group CLI tool:
   ```bash
   kafka-consumer-groups.sh --bootstrap-server kafka:9092 --describe --group notification-group
   ```
   *Output*:
   ```text
   TOPIC                     PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
   user-registration-events  0          12050           18490           6440
   ```
2. Check `notification-service` logs for rebalancing warnings:
   ```text
   org.apache.kafka.clients.consumer.CommitFailedException: Commit cannot be completed! Attempt to heartbeat failed since member is not part of the group.
   ```

#### 🔬 Root Cause (RCA):
- `NotificationConsumerService` takes longer than `max.poll.interval.ms` (default 5 minutes) to process a batch of events, causing the Kafka coordinator to assume the consumer died and trigger repeated group rebalancing.

#### 💡 Resolution & Fix:
- Increase partition count on `user-registration-events` topic to 6 and scale out `notification-service` pods to match partition count.
- Lower `max.poll.records` in [`application.yml`](file:///c:/SpringBoot/notification-service/src/main/resources/application.yml):
  ```yaml
  spring:
    kafka:
      consumer:
        max-poll-records: 50
  ```

---

### Scenario 5: JWT Key Mismatch & CORS Preflight (`OPTIONS 403`) Failures

#### 🔴 Symptom:
Angular frontend requests fail in browser console with `Access to XMLHttpRequest at 'http://localhost:8080/api/v1/products' from origin 'http://localhost:4200' has been blocked by CORS policy`.

#### 🔍 Diagnostic Steps:
1. Inspect Network Tab in Chrome DevTools: `OPTIONS /api/v1/products` returns `403 Forbidden` or missing `Access-Control-Allow-Origin` header.

#### 🔬 Root Cause (RCA):
- API Gateway `globalcors` configuration missing `OPTIONS` in `allowedMethods` or microservices re-declaring conflicting CORS policies.

#### 💡 Resolution & Fix:
- Ensure CORS is handled **exclusively at API Gateway** in [`api-gateway/src/main/resources/application.yml`](file:///c:/SpringBoot/api-gateway/src/main/resources/application.yml):
  ```yaml
  spring:
    cloud:
      gateway:
        globalcors:
          cors-configurations:
            '[/**]':
              allowedOrigins: "http://localhost:4200"
              allowedMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
              allowedHeaders: "*"
  ```

---

### Scenario 6: Out-Of-Memory Error (`java.lang.OutOfMemoryError`)

#### 🔴 Symptom:
Microservice container restarts repeatedly (Kubernetes `CrashLoopBackOff`).

#### 🔍 Diagnostic Steps:
1. Check Kubernetes pod exit code: `Exit Code 137` (OOMKilled by OS Linux Kernel).
2. Generate heap dump on OOM:
   ```bash
   jcmd <pid> GC.heap_info
   ```

#### 🔬 Root Cause (RCA):
- JVM heap allocation exceeds Docker container memory limit (`-Xmx` set higher than Docker container RAM limit).

#### 💡 Resolution & Fix:
- Configure JVM RAM percentage flags in [`Dockerfile`](file:///c:/SpringBoot/auth-service/Dockerfile):
  ```dockerfile
  ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
  ```

---

### Scenario 7: Slow Database Queries & High CPU Spikes

#### 🔴 Symptom:
Database CPU utilization reaches 100%; HTTP request latency degrades significantly.

#### 🔍 Diagnostic Steps:
1. Check active database queries:
   ```sql
   -- PostgreSQL
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' ORDER BY duration DESC;

   -- MySQL
   SHOW FULL PROCESSLIST;
   ```

#### 🔬 Root Cause (RCA):
- Missing SQL database indexes on foreign keys (`user_id`, `category`, `username`).

#### 💡 Resolution & Fix:
- Add database indexes in Flyway migration script [`V1__create_users_table.sql`](file:///c:/SpringBoot/auth-service/src/main/resources/db/migration/V1__create_users_table.sql):
  ```sql
  CREATE INDEX idx_users_username ON users(username);
  CREATE INDEX idx_products_category ON products(category);
  ```

---

### Scenario 8: API Gateway Reactor Netty EventLoop Thread Starvation

#### 🔴 Symptom:
API Gateway hangs and stops routing requests to all downstream microservices.

#### 🔍 Diagnostic Steps:
1. Take JVM thread dump of API Gateway:
   ```bash
   jstack <gateway-pid> | grep "reactor-http-nio"
   ```
   *Output*: `"reactor-http-nio-2" WAITING on java.util.concurrent.CountDownLatch`

#### 🔬 Root Cause (RCA):
- A custom Gateway filter executed a blocking I/O operation (e.g. `restTemplate.getForObject()` or `Thread.sleep()`) on a non-blocking Reactor Netty EventLoop thread.

#### 💡 Resolution & Fix:
- Never invoke blocking operations inside Spring Cloud Gateway. Use reactive `WebClient` or execute blocking calls on `Schedulers.boundedElastic()`.

---

### Scenario 9: Angular Client Chunk Load Failure (`Loading chunk X failed`)

#### 🔴 Symptom:
Users get a blank white screen when navigating Angular routes after a new production deployment.

#### 🔍 Diagnostic Steps:
1. Open Browser Console:
   ```text
   Uncaught (in promise): Error: Loading chunk src_app_components_product-list_component_ts.js failed.
   ```

#### 🔬 Root Cause (RCA):
- A new Angular deployment replaced static JavaScript bundle filenames on Nginx, while active user browser sessions attempted to download old cached lazy-loaded `@defer` chunk files.

#### 💡 Resolution & Fix:
- Catch chunk load errors globally in [`global-error.handler.ts`](file:///c:/SpringBoot/angular-frontend/src/app/handlers/global-error.handler.ts) and prompt page refresh:
  ```typescript
  if (error.message && error.message.includes('Loading chunk')) {
    window.location.reload();
  }
  ```

---

### Scenario 10: Kubernetes Pod CrashLoopBackOff & Failed Health Probes

#### 🔴 Symptom:
Kubernetes continuously kills and restarts microservice pods (`CrashLoopBackOff`).

#### 🔍 Diagnostic Steps:
1. Run `kubectl describe pod`:
   ```text
   Warning  Unhealthy  Liveness probe failed: HTTP probe failed with statuscode 500
   ```

#### 🔬 Root Cause (RCA):
- Liveness probe configured to hit `/actuator/health`, but database connection failed during startup, causing `/actuator/health` to return `500 DOWN` and Kubernetes to kill the pod in an infinite restart loop.

#### 💡 Resolution & Fix:
- Separate **Liveness** (is container process alive?) from **Readiness** (is database ready?) in `application.yml`:
  ```yaml
  management:
    endpoint:
      health:
        probes:
          enabled: true # Exposes /actuator/health/liveness and /actuator/health/readiness
  ```
- Configure Kubernetes probes:
  - **Liveness Probe**: `httpGet: path: /actuator/health/liveness`
  - **Readiness Probe**: `httpGet: path: /actuator/health/readiness`
