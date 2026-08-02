# Topic 12: Production Readiness, Docker & Kubernetes Deployment

---

## ❓ What Makes a Microservices Project "Production-Ready"?

Moving from local development (`localhost`) to an enterprise production environment requires 6 critical pillars:

1. **Database Persistence & Migrations**: Replacing in-memory H2 with PostgreSQL/MySQL and database versioning tools (**Flyway**).
2. **Containerization & Orchestration**: Packaging services into multi-stage **Docker** containers managed by **`docker-compose`** or **Kubernetes**.
3. **Secret & Config Management**: Moving passwords and JWT keys out of code into environment variables / Kubernetes Secrets / HashiCorp Vault.
4. **Security Hardening**: HTTPS/TLS termination, short-lived JWT access tokens, and HttpOnly refresh tokens.
5. **Observability & Tracing**: Prometheus, Grafana, Zipkin distributed tracing (`TraceId`), and centralized logging (ELK / Loki).
6. **Automated CI/CD**: GitHub Actions automated testing, vulnerability scanning, and zero-downtime deployment.

---

## 🏗️ Production Deployment Architecture

```
                                  HTTPS (Port 443)
                                          |
                                          v
                      +---------------------------------------+
                      |         Nginx / Cloud Load Balancer   |
                      +-------------------+-------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |      Spring Cloud API Gateway (k8s)   |
                      +-------------------+-------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+---------------+                 +---------------+                 +---------------+
| Auth Service  |                 |Product Service|                 | Notification  |
|  (3 Replicas) |                 | (3 Replicas)  |                 |  (2 Replicas) |
+-------+-------+                 +-------+-------+                 +-------+-------+
        |                                 |                                 ^
        |                                 |                                 |
        v                                 v                                 |
+---------------+                 +---------------+                 +-------+-------+
|  PostgreSQL   |                 |  PostgreSQL   |                 | Apache Kafka  |
|   Auth DB     |                 |  Product DB   |                 |    Cluster    |
+---------------+                 +---------------+                 +---------------+
```

---

## 💻 Code Implementation in Our Project

### 1. Production Containerization (`docker-compose.yml`)

In [`docker-compose.yml`](file:///c:/SpringBoot/docker-compose.yml):

```yaml
version: '3.8'

services:
  # PostgreSQL Production Databases
  postgres-auth:
    image: postgres:16-alpine
    container_name: postgres-auth
    environment:
      POSTGRES_DB: authdb
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: production_password
    ports:
      - "5432:5432"

  # Kafka Event Broker
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    container_name: kafka
    ports:
      - "9092:9092"

  # Eureka Discovery Server
  discovery-server:
    build:
      context: ./discovery-server
    ports:
      - "8761:8761"

  # Microservices
  auth-service:
    build:
      context: ./auth-service
    ports:
      - "8081:8081"
    depends_on:
      - discovery-server
      - postgres-auth
      - kafka

  # Nginx Frontend
  angular-frontend:
    build:
      context: ./angular-frontend
    ports:
      - "80:80"
```

---

### 2. Multi-Stage Production Dockerfile (`angular-frontend`)

In [`angular-frontend/Dockerfile`](file:///c:/SpringBoot/angular-frontend/Dockerfile):

```dockerfile
# Stage 1: Build Angular production bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static assets via high-performance Nginx web server
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔍 Key Concepts & Takeaways

1. **Multi-Stage Builds**: Reduces Docker image sizes from ~1GB down to ~50MB by separating build-time tools (Maven/Node) from runtime JRE/Nginx engines.
2. **Health Probes**: Kubernetes liveness and readiness probes query `/actuator/health` to automatically restart frozen containers.
3. **Zero Downtime Deployments**: Rolling updates and blue-green deployments ensure users experience zero downtime during software updates.
