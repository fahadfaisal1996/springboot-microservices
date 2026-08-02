# Spring Boot Microservices + Kafka + Angular Learning Platform

A comprehensive reference implementation for learning modern microservices development with Spring Boot 4.1.0, Spring Cloud (Eureka & API Gateway), Apache Kafka Event-Driven Messaging, OpenFeign Inter-Service REST, Resilience4j Circuit Breakers, Spring Security 6, Java 17 Records, JWT Authentication, REST APIs, Global Exception Handling, Local MySQL Server, and Angular 18+.

---

## 🏛️ Microservices Architecture & Communication Diagram

```
+-----------------------------------------------------------------------------------+
|                                Angular 18 Frontend                                |
|                               (http://localhost:4200)                             |
+-----------------------------------------+-----------------------------------------+
                                          | HTTP REST Requests
                                          v
+-----------------------------------------------------------------------------------+
|                              Spring Cloud API Gateway                             |
|                               (http://localhost:8080)                             |
+---------------------+---------------------------------------+---------------------+
                      |                                       |
    1. Service Lookup | Dynamic Routing                       | 1. Service Lookup
       & Resolution   | (lb://AUTH-SERVICE, etc.)             |    & Resolution
                      v                                       v
+---------------------+---------------------------------------+---------------------+
|                          Eureka Discovery Server (Registry)                       |
|                               (http://localhost:8761)                             |
+---------------------+-----------------------+---------------+---------------------+
                      ^                       ^               ^
     Registers &      |                       |               | Registers &
     Heartbeats       |                       |               | Heartbeats
          +-----------+                       |               +-----------+
          |                                   |                           |
          v                                   v                           v
+-------------------+ OpenFeign REST Call +---------------+       +---------------+
|   Auth Service    |<--------------------|Product Service|       | Notification  |
|  (Security/JWT)   | (with Resilience4j) | (RBAC/Catalog)|       |    Service    |
|    (Port 8081)    |                     |  (Port 8082)  |       |  (Port 8083)  |
+---------+---------+                     +-------+-------+       +-------+-------+
          |                                       |                       ^
          | MySQL Server                          | MySQL Server          | 2. Consume Event
          v                                       v                       |    (@KafkaListener)
+-------------------+                     +---------------+       +-------+-------+
| Local MySQL Server|                     |Local MySQL Svr|       |  Apache Kafka |
|   (authdb DB)     |                     | (productdb DB)|       |  Broker (9092)|
+-------------------+                     +---------------+       +---------------+
```

---

## 🐬 Local MySQL Server Setup for Development

You can run a real **MySQL Server** on your machine for development so you can connect via **MySQL Workbench**, **DBeaver**, **IntelliJ Database Tool**, or **MySQL CLI** to query and update data directly.

### 1. Launch Local MySQL Server (Port 3306)
Run this single command from `c:\SpringBoot`:
```bash
docker-compose -f docker-compose-mysql.yml up -d
```

### 2. MySQL Connection Credentials
| Parameter | Value |
|---|---|
| **Host** | `localhost` / `127.0.0.1` |
| **Port** | `3306` |
| **Username** | `root` |
| **Password** | `password` |
| **Databases** | `authdb` (Auth Service), `productdb` (Product Service) |

### 3. Running Microservices with MySQL Profile
To start microservices connected to your real local MySQL server instead of H2, pass `-Dspring.profiles.active=mysql` when running:

```powershell
# Run Auth Service with MySQL
cd c:\SpringBoot\auth-service
mvn spring-boot:run -Dspring-boot.run.profiles=mysql

# Run Product Service with MySQL
cd c:\SpringBoot\product-service
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

### 4. Querying & Updating Data in MySQL CLI / GUI
```sql
-- Connect via MySQL CLI:
-- mysql -h localhost -P 3306 -u root -ppassword

-- Query Auth Users:
USE authdb;
SELECT * FROM users;

-- Query Product Catalog:
USE productdb;
SELECT * FROM products;
```

---

## 🚀 Services Overview & Key Features

### 1. **Discovery Server (`discovery-server`)** — Port `8761`
- **Control-Plane Service Registry**: Sits alongside the API Gateway.
- All microservices register their IP addresses and ports on boot. The Gateway queries Eureka to dynamically resolve microservice addresses before routing HTTP traffic.

### 2. **API Gateway (`api-gateway`)** — Port `8080`
- Spring Cloud Gateway reverse proxy.
- Queries Eureka Server for `lb://` load-balanced service instances.
- Dynamic routes (`/api/v1/auth/**`, `/api/v1/products/**`, `/api/v1/notifications/**`).
- Global CORS configuration for Angular frontend (`http://localhost:4200`).

### 3. **Authentication Service (`auth-service`)** — Port `8081`
- Spring Security 6 with stateless session management.
- **MySQL / H2 Persistence**: Spring Data JPA repository managing SQL `users` table.
- **Apache Kafka Producer**: Publishes `UserRegisteredEvent` records to topic `user-registration-events` upon registration.
- **Java 17 Records** for DTOs (`RegisterRequest`, `LoginRequest`, `AuthResponse`, `ErrorDetails`).

### 4. **Product Microservice (`product-service`)** — Port `8082`
- **MySQL / H2 Persistence**: Spring Data JPA repository managing SQL `products` table.
- **Spring Cloud OpenFeign Inter-Service REST**: Declarative REST client (`AuthServiceClient`) calling `auth-service` with **Resilience4j Circuit Breaker** fallbacks.
- Stateless `JwtAuthenticationFilter` reading claims & setting `SecurityContextHolder`.
- Method / Path Security (`ROLE_ADMIN` required for `POST` and `DELETE`).
- **Java 17 Records** for DTOs (`ProductRequest`, `ProductResponse`, `ErrorDetails`).

### 5. **Notification Microservice (`notification-service`)** — Port `8083`
- **Apache Kafka Consumer**: Subscribes to `user-registration-events` via `@KafkaListener`.
- **Java 17 Sealed Classes & Pattern Matching**: `NotificationChannel` interface hierarchy.
- Processes welcome email notifications asynchronously and exposes `GET /api/v1/notifications` REST API.

### 6. **Angular Frontend (`angular-frontend`)** — Port `4200`
- Modern Angular 18 application with standalone components & RxJS signals.
- **`@defer` Deferrable Views**: High-performance lazy rendering for UI component cards.
- **Global `ErrorHandler`**: Centralized client-side exception handling.
- `JwtInterceptor`: Automatically appends `Authorization: Bearer <jwt-token>` header.
- **Kafka Notification Bell & Dropdown**: Displays live notifications consumed by `notification-service`.

---

## 🔑 Key API Endpoints

### Auth Service (`/api/v1/auth`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register user/admin & publish Kafka event |
| `POST` | `/api/v1/auth/login` | Public | Authenticate user & issue JWT |

### Product Service (`/api/v1/products`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/products` | Public / User | List all catalog products |
| `POST` | `/api/v1/products` | `ROLE_ADMIN` | Create new product |
| `DELETE` | `/api/v1/products/{id}` | `ROLE_ADMIN` | Delete product by ID |

### Notification Service (`/api/v1/notifications`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/v1/notifications` | Public / User | List Kafka-consumed notifications |

---

## 🛠️ Configuration Specification & Specs

- ⚙️ **[Configuration Specification Guide (`prep/CONFIGURATION_SPECIFICATION.md`)](file:///c:/SpringBoot/prep/CONFIGURATION_SPECIFICATION.md)**: Detailed breakdown of all microservice, Gateway, Security, Database, Kafka, and Angular configuration properties comparing **Dev vs Prod**, where properties are managed, line-by-line commented YAML/Docker configs, and production maintenance strategies.

---

## 🏃 Complete Project Start Steps

### Option A: Running via One-Click Shell Script (Linux / macOS / Git Bash)

Run the shell script [`start-all.sh`](file:///c:/SpringBoot/start-all.sh):

```bash
chmod +x start-all.sh
./start-all.sh
```

---

### Option B: Running via Windows Launcher Script (PowerShell / Command Prompt)

```cmd
start-all.bat
```

---

### Option C: Running via IDE (IntelliJ IDEA / Eclipse / VS Code)

Launch in sequence:
1. `DiscoveryServerApplication` (Port 8761)
2. `AuthServiceApplication` (Port 8081)
3. `ProductServiceApplication` (Port 8082)
4. `NotificationServiceApplication` (Port 8083)
5. `ApiGatewayApplication` (Port 8080)
6. Angular Frontend (`cd angular-frontend && npm start`) (Port 4200)

---

## ✅ Complete Verification Steps

### Verification 1: Service Discovery Dashboard Check
1. Open `http://localhost:8761`.
2. Verify all 4 registered instances appear: `API-GATEWAY`, `AUTH-SERVICE`, `PRODUCT-SERVICE`, `NOTIFICATION-SERVICE`.

### Verification 2: Kafka Event-Driven Messaging Verification
1. Send a POST request to register a new user:
   ```bash
   curl -X POST http://localhost:8080/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -d '{ "username": "kafkauser", "email": "kafka@example.com", "password": "password123", "role": "ROLE_USER" }'
   ```
2. Verify Notification Service consumed the Kafka event via API Gateway:
   ```bash
   curl -X GET http://localhost:8080/api/v1/notifications
   ```
   *Expected Response*: JSON array containing the processed welcome email notification record for `kafkauser`.

### Verification 3: Angular Frontend & Notifications Dropdown
1. Open `http://localhost:4200`.
2. Click the **Bell Icon** in the top navigation bar to view live Kafka event stream notifications!
