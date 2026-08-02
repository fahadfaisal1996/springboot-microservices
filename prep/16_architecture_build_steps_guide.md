# Topic 16: Step-by-Step Architecture & End-to-End Build Guide

---

## 📚 Overview

This document provides a high-level, step-by-step blueprint of how this entire microservices platform was architected and built from scratch. It documents **every architectural design decision**, **database strategy**, **service creation order**, **security & messaging choices**, and **Angular 18 frontend implementation steps**.

---

## 🏗️ High-Level Build Roadmap

```
+-----------------------------------------------------------------------------------+
| PHASE 1: Domain Boundaries & Technology Stack Decisions                           |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 2: Multi-Module Maven Workspace (`pom.xml` Parent)                          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 3: Service Discovery (`discovery-server` @ Port 8761)                       |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 4: API Gateway & Centralized CORS (`api-gateway` @ Port 8080)               |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 5: Auth Microservice & Kafka Producer (`auth-service` @ Port 8081)          |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 6: Product Microservice, Feign & Circuit Breaker (`product-service` @ 8082) |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 7: Notification Service & Kafka Consumer (`notification-service` @ 8083)   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 8: Angular 18 Standalone Frontend & RxJS Signals (`angular-frontend` @ 4200)|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| PHASE 9: Production Docker Containers & 1-Click Launch Scripts                     |
+-----------------------------------------------------------------------------------+
```

---

## 🛠️ Step-by-Step Implementation Breakdown

### Phase 1: Architectural Design & Tech Stack Decisions
- **Decision 1: Microservices over Monolith**: Separated domain responsibilities into standalone microservices (`Auth`, `Product`, `Notification`) so each service can scale independently.
- **Decision 2: Control-Plane Registry & Single Edge Gateway**: Used **Eureka Discovery Server** for dynamic IP resolution and **Spring Cloud API Gateway** as a single edge entry point to eliminate client-side cross-service URL configuration.
- **Decision 3: Asynchronous Event-Driven Messaging**: Used **Apache Kafka** for registration welcome notifications to decouple `auth-service` from `notification-service`.
- **Decision 4: Java 17+ Modern Feature Adoption**: Adopted Java 17 **Records** for immutable DTOs and **Sealed Classes** with pattern matching `switch` for type safety.

---

### Phase 2: Multi-Module Maven Workspace Setup
Created the parent [`pom.xml`](file:///c:/SpringBoot/pom.xml) with `<packaging>pom</packaging>` to manage dependency versions centrally across all Spring Boot modules:
- Declared parent `spring-boot-starter-parent` (`4.1.0`).
- Managed dependency versions in `<dependencyManagement>` for Spring Cloud (`2023.0.3`) and JJWT (`0.12.6`).
- Registered submodules (`discovery-server`, `api-gateway`, `auth-service`, `product-service`, `notification-service`).

---

### Phase 3: Service Discovery Setup (`discovery-server`)
1. Created `discovery-server` module listening on Port `8761`.
2. Added `spring-cloud-starter-netflix-eureka-server` dependency.
3. Annotated [`DiscoveryServerApplication.java`](file:///c:/SpringBoot/discovery-server/src/main/java/com/learning/discovery/DiscoveryServerApplication.java) with `@EnableEurekaServer`.
4. Configured [`application.yml`](file:///c:/SpringBoot/discovery-server/src/main/resources/application.yml) setting `register-with-eureka: false` and `fetch-registry: false` (since this node IS the master registry).

---

### Phase 4: Edge API Gateway Setup (`api-gateway`)
1. Created `api-gateway` module listening on Port `8080`.
2. Added `spring-cloud-starter-gateway` and `spring-cloud-starter-netflix-eureka-client`.
3. Configured dynamic routing using Eureka service IDs (`lb://AUTH-SERVICE`, `lb://PRODUCT-SERVICE`, `lb://NOTIFICATION-SERVICE`) in [`application.yml`](file:///c:/SpringBoot/api-gateway/src/main/resources/application.yml).
4. Configured global CORS at the Gateway level to allow `http://localhost:4200` with `GET`, `POST`, `PUT`, `DELETE`, and `OPTIONS` verbs.

---

### Phase 5: Authentication & Identity Service (`auth-service`)
1. Created `auth-service` module listening on Port `8081`.
2. **Security**: Implemented Spring Security 6 stateless filter chain and `JwtTokenProvider` generating signed HS256 JWT tokens.
3. **Java 17 Records**: Created immutable DTO data carriers (`RegisterRequest`, `LoginRequest`, `AuthResponse`).
4. **Database Strategy**:
   - Configured dual database support: In-memory H2 for zero-setup dev, and local MySQL Server (`application-mysql.yml`).
   - Created versioned SQL migration script [`V1__create_users_table.sql`](file:///c:/SpringBoot/auth-service/src/main/resources/db/migration/V1__create_users_table.sql).
5. **Kafka Event Producer**: Configured `KafkaTemplate` in [`AuthController.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/controller/AuthController.java) to publish `UserRegisteredEvent` records to topic `user-registration-events`.

---

### Phase 6: Product Catalog Microservice (`product-service`)
1. Created `product-service` module listening on Port `8082`.
2. **RBAC Security**: Configured stateless `JwtAuthenticationFilter` populating Spring Security context. Enforced `ROLE_ADMIN` authority on `POST` and `DELETE` endpoints.
3. **Database Strategy**: Configured H2, MySQL, and Flyway SQL migration script [`V1__create_products_table.sql`](file:///c:/SpringBoot/product-service/src/main/resources/db/migration/V1__create_products_table.sql).
4. **Inter-Service REST & Circuit Breaker**:
   - Created OpenFeign client [`AuthServiceClient.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClient.java) (`@FeignClient(name = "auth-service")`).
   - Created Resilience4j fallback [`AuthServiceClientFallback.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClientFallback.java) to intercept failures.
5. **Observability**: Added `spring-boot-starter-actuator` exposing `/actuator/health` and `/actuator/metrics`.

---

### Phase 7: Event-Driven Notification Service (`notification-service`)
1. Created `notification-service` module listening on Port `8083`.
2. **Kafka Event Consumer**: Annotated [`NotificationConsumerService.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/service/NotificationConsumerService.java) with `@KafkaListener(topics = "user-registration-events", groupId = "notification-group")`.
3. **Java 17 Sealed Classes**: Created [`NotificationChannel.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/channel/NotificationChannel.java) (`sealed interface NotificationChannel permits EmailNotificationChannel, SmsNotificationChannel`) with pattern matching `switch` expression processing.

---

### Phase 8: Angular 18 Frontend Application (`angular-frontend`)
1. Generated Angular 18 application using standalone components (no `NgModule`).
2. **State Management**: Used RxJS Signals (`currentUser`, `isLoggedIn`, `isAdmin`) in [`auth.service.ts`](file:///c:/SpringBoot/angular-frontend/src/app/services/auth.service.ts).
3. **Http Interceptor**: Implemented functional `jwtInterceptor` automatically appending `Authorization: Bearer <token>` headers.
4. **Route Protection**: Implemented functional `authGuard` and `adminGuard`.
5. **UI & Performance**: Added glassmorphism dark theme, live Kafka notification dropdown, and Angular 18 `@defer (on timer(100ms))` views in [`product-list.component.ts`](file:///c:/SpringBoot/angular-frontend/src/app/components/product-list/product-list.component.ts).

---

### Phase 9: Production Containerization & Launchers
1. Created multi-stage `Dockerfile` manifests for all microservices (OpenJDK compile -> JRE Alpine runtime) and Angular (Node.js compile -> Nginx static server).
2. Created [`docker-compose.yml`](file:///c:/SpringBoot/docker-compose.yml) (full stack) and [`docker-compose-mysql.yml`](file:///c:/SpringBoot/docker-compose-mysql.yml) (local MySQL server).
3. Created one-click startup scripts: [`start-all.sh`](file:///c:/SpringBoot/start-all.sh), [`start-all.bat`](file:///c:/SpringBoot/start-all.bat), [`start-all.ps1`](file:///c:/SpringBoot/start-all.ps1).

---

### Phase 10: Documentation & GitHub Repository Versioning
1. Authored master documentation: [`README.md`](file:///c:/SpringBoot/README.md), [`PRODUCTION_DEPLOYMENT_GUIDE.md`](file:///c:/SpringBoot/PRODUCTION_DEPLOYMENT_GUIDE.md), and 16 prep guides in [`prep/`](file:///c:/SpringBoot/prep).
2. Created `.gitignore` excluding build targets and committed project to Git repository:
   **[https://github.com/fahadfaisal1996/springboot-microservices.git](https://github.com/fahadfaisal1996/springboot-microservices.git)**
