# Topic 1: Service Discovery (Eureka Server & Client)

---

## ❓ What Problem Does Service Discovery Solve?

In a monolithic application, everything runs on a single server (e.g., `localhost:8080`).

In a **Microservices Architecture**, services are split into independent applications (`auth-service`, `product-service`, `payment-service`, etc.). In production environments (Docker, Kubernetes, AWS), these microservices run across different servers, IP addresses, and dynamic ports that scale up/down dynamically.

If microservices hardcode each other's IP addresses (e.g., `http://192.168.1.15:8081`), the system breaks whenever an IP changes or a new instance starts.

**Eureka Service Discovery** solves this by acting as a **Phonebook / Registry** for your microservices.

---

## 🏗️ How It Works Architecture Diagram

```
                     +---------------------------------------+
                     |    Eureka Server (Port 8761)          |
                     |  "Registry: AUTH-SERVICE @ 8081,     |
                     |             PRODUCT-SERVICE @ 8082"   |
                     +-------------------+-------------------+
                                         ^
                       Registers &       | Discovers
                       Sends Heartbeats  | Services
                                         |
     +--------------------------+--------+--------+--------------------------+
     |                                            |                          |
+----+-------------------+               +--------+-----------+     +--------+-----------+
|    AUTH-SERVICE        |               |   API-GATEWAY      |     |  PRODUCT-SERVICE   |
| (Register as Client)   |               |  (Discovers via    |     | (Register as       |
|    Port 8081           |               |   lb://AUTH-...)   |     |  Client) Port 8082 |
+------------------------+               +--------------------+     +--------------------+
```

---

## 💻 Code Implementation in Our Project

### 1. Server Configuration (`discovery-server`)
In [`DiscoveryServerApplication.java`](file:///c:/SpringBoot/discovery-server/src/main/java/com/learning/discovery/DiscoveryServerApplication.java):

```java
package com.learning.discovery;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

// @SpringBootApplication: Enables Spring Boot autoconfiguration and component scanning
@SpringBootApplication
// @EnableEurekaServer: Activates Spring Cloud Netflix Eureka Server registry logic
@EnableEurekaServer
public class DiscoveryServerApplication {

    public static void main(String[] args) {
        // Starts the Spring Boot application context on port 8761
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

In [`discovery-server/src/main/resources/application.yml`](file:///c:/SpringBoot/discovery-server/src/main/resources/application.yml):
```yaml
server:
  port: 8761 # Standard default port for Eureka Discovery Server

spring:
  application:
    name: discovery-server # Service identifier in Spring context

eureka:
  instance:
    hostname: localhost # Local environment hostname
  client:
    # Set to false because this IS the server; it should NOT register with itself
    register-with-eureka: false
    # Set to false because this server doesn't need to fetch registry from another node
    fetch-registry: false
```

---

### 2. Client Configuration (`auth-service`, `product-service`, `api-gateway`)

In [`auth-service/src/main/resources/application.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application.yml):

```yaml
server:
  port: 8081 # Port on which auth-service listens for HTTP traffic

spring:
  application:
    name: auth-service # Unique service name registered in Eureka (used in lb://AUTH-SERVICE)

eureka:
  client:
    service-url:
      # Location of the central Eureka Discovery Server endpoint
      defaultZone: http://localhost:8761/eureka/
  instance:
    # Registers using IP address rather than hostname for reliable network routing
    prefer-ip-address: true
```

---

## 🔍 Key Concepts & Takeaways

1. **Self-Registration**: On startup, every Eureka Client contacts the Eureka Server URL (`http://localhost:8761/eureka/`) and registers its IP, port, and application name.
2. **Heartbeats & Health Tracking**: Eureka Clients send a heartbeat ping every 30 seconds. If Eureka stops receiving pings from an instance, it automatically removes it from the registry.
3. **Eureka Web Dashboard**: Accessing `http://localhost:8761` lets developers inspect running instances, hostnames, ports, and status in real-time.
