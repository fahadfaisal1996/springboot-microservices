# Topic 8: Apache Kafka & Event-Driven Microservices (`notification-service`)

---

## ❓ What Problem Does Event-Driven Architecture (Kafka) Solve?

In traditional synchronous microservices:
1. When a user registers (`auth-service`), if `auth-service` makes a direct HTTP REST call to `notification-service` to send an email, registration is **tightly coupled** to the notification service.
2. If `notification-service` is slow or temporarily down, user registration fails or hangs.
3. Adding new downstream consumers (e.g., `analytics-service`, `audit-service`) requires modifying `auth-service` code every time.

**Apache Kafka (Event-Driven Messaging)** solves this by making microservices **Asynchronously Decoupled**:
- `auth-service` publishes a `UserRegisteredEvent` message to a Kafka topic (`user-registration-events`) and returns immediately to the user (`201 Created`).
- `notification-service` listens to the topic asynchronously via `@KafkaListener` and processes welcome emails independently.
- New services can subscribe to `user-registration-events` without touching `auth-service` code.

---

## 🏗️ Event-Driven Architecture Diagram

```
           +---------------------------------------+
           |             Client / Angular          |
           +-------------------+-------------------+
                               | HTTP POST /register
                               v
           +---------------------------------------+
           |             Auth Service              |
           |             (Port 8081)               |
           +-------------------+-------------------+
                               |
                               | 1. Publish Event (KafkaTemplate)
                               v
           +---------------------------------------+
           |             Apache Kafka              |
           |  Topic: 'user-registration-events'   |
           +-------------------+-------------------+
                               |
                               | 2. Consume Event (@KafkaListener)
                               v
           +---------------------------------------+
           |          Notification Service         |
           |             (Port 8083)               |
           +---------------------------------------+
```

---

## 💻 Code Implementation in Our Project

### 1. Kafka Producer (`auth-service`)

In [`auth-service/src/main/resources/application.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application.yml):

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092 # Kafka broker address
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer # Serializes key as String
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer # Serializes DTO record to JSON
      properties:
        spring.json.type.mapping: event:com.learning.auth.dto.UserRegisteredEvent
```

In [`AuthController.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/controller/AuthController.java):

```java
package com.learning.auth.controller;

import com.learning.auth.dto.UserRegisteredEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AuthController(..., KafkaTemplate<String, Object> kafkaTemplate) {
        ...
        this.kafkaTemplate = kafkaTemplate;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        // Save user entity to database ...
        userRepository.save(user);

        // Publish UserRegisteredEvent to Apache Kafka topic 'user-registration-events'
        try {
            UserRegisteredEvent event = new UserRegisteredEvent(user.getUsername(), user.getEmail(), user.getRole().name());
            
            // Asynchronously send record to topic with username as partition key
            kafkaTemplate.send("user-registration-events", user.getUsername(), event);
            log.info("Published UserRegisteredEvent to Kafka for user: {}", user.getUsername());
        } catch (Exception e) {
            log.warn("Kafka event publishing skipped (Kafka broker offline): {}", e.getMessage());
        }

        return new ResponseEntity<>(..., HttpStatus.CREATED);
    }
}
```

---

### 2. Kafka Consumer & Listener (`notification-service`)

In [`notification-service/src/main/resources/application.yml`](file:///c:/SpringBoot/notification-service/src/main/resources/application.yml):

```yaml
server:
  port: 8083 # Notification service port

spring:
  application:
    name: notification-service # Registered in Eureka

  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: notification-group # Consumer group ID for offset management
      auto-offset-reset: earliest # Reads from beginning of topic if no offset exists
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "*" # Allows deserializing JSON to event DTOs

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/
```

In [`NotificationConsumerService.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/service/NotificationConsumerService.java):

```java
package com.learning.notification.service;

import com.learning.notification.dto.NotificationRecord;
import com.learning.notification.dto.UserRegisteredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class NotificationConsumerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumerService.class);
    private final List<NotificationRecord> notifications = Collections.synchronizedList(new ArrayList<>());

    // @KafkaListener subscribes to Kafka topic 'user-registration-events'
    @KafkaListener(topics = "user-registration-events", groupId = "notification-group")
    public void consumeUserRegistrationEvent(UserRegisteredEvent event) {
        log.info("Received Kafka UserRegisteredEvent for username: {}, email: {}", event.username(), event.email());
        
        String message = String.format("Welcome %s! Your account with role [%s] was created successfully.",
                event.username(), event.role());

        NotificationRecord notification = new NotificationRecord(event.email(), message, "EMAIL");
        notifications.add(notification); // Process notification
        
        log.info("Successfully dispatched notification ID: {} to {}", notification.id(), notification.recipient());
    }

    public List<NotificationRecord> getAllNotifications() {
        return new ArrayList<>(notifications);
    }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **Non-blocking Event Driven Messaging**: User registration API calls complete instantly (`201 Created`). Downstream email and SMS processing occur asynchronously in background microservices.
2. **Consumer Groups (`notification-group`)**: Kafka manages offset tracking per consumer group. If multiple instances of `notification-service` are launched, Kafka load balances topic partitions across them automatically.
3. **Resilience**: If `notification-service` is temporarily down when a user registers, Kafka stores the published events on disk. When `notification-service` boots back up, it resumes consuming unread events from where it left off.
