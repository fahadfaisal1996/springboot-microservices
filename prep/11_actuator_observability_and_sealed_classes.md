# Topic 11: Production Observability, Java 17 Sealed Classes & Angular 18 Defer

---

## ❓ What Problem Do These Enterprise Features Solve?

Production systems require:
1. **System Health & Observability**: Production DevOps teams need real-time HTTP metrics, JVM memory stats, and health checks without restarting microservices (**Spring Boot Actuator**).
2. **Domain Hierarchy Safety**: Restricted type hierarchies ensuring event channels cannot be subverted by invalid subclasses (**Java 17 Sealed Classes**).
3. **Frontend Performance & Error Resilience**: Lazy UI component rendering and global client error handling (**Angular 18 `@defer` & `ErrorHandler`**).

---

## 💻 Code Implementation in Our Project

### 1. Spring Boot Actuator Configuration (`product-service`)

In [`product-service/src/main/resources/application.yml`](file:///c:/SpringBoot/product-service/src/main/resources/application.yml):

```yaml
management:
  endpoints:
    web:
      exposure:
        include: "health,info,metrics,prometheus" # Expose production health & metric endpoints
  endpoint:
    health:
      show-details: always # Expose detailed status (DB connection, disk space, Eureka client)
```

Accessing `http://localhost:8082/actuator/health` returns real-time system health telemetry:
```json
{
  "status": "UP",
  "components": {
    "db": { "status": "UP", "details": { "database": "H2" } },
    "discoveryComposite": { "status": "UP" },
    "diskSpace": { "status": "UP" }
  }
}
```

---

### 2. Java 17 Sealed Classes & Pattern Matching (`notification-service`)

In [`NotificationChannel.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/channel/NotificationChannel.java):

```java
package com.learning.notification.channel;

// 'sealed' keyword restricts implementation strictly to permitted classes
public sealed interface NotificationChannel permits EmailNotificationChannel, SmsNotificationChannel {
    String getChannelName();
    String formatRecipient(String recipient);
}
```

In [`NotificationConsumerService.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/service/NotificationConsumerService.java):

```java
// Java 17 Pattern Matching switch expression on Sealed Interface
private String processChannel(NotificationChannel channel, String recipient) {
    return switch (channel) {
        case EmailNotificationChannel email -> email.formatRecipient(recipient);
        case SmsNotificationChannel sms -> sms.formatRecipient(recipient);
    };
}
```

---

### 3. Angular 18 Deferrable Views & Global ErrorHandler (`angular-frontend`)

In [`product-list.component.ts`](file:///c:/SpringBoot/angular-frontend/src/app/components/product-list/product-list.component.ts):

```html
<!-- Angular 18 @defer directive lazy-renders product grid cards -->
@defer (on timer(100ms)) {
  <div class="product-grid">
    @for (product of filteredProducts; track product.id) {
      <div class="glass-panel product-card">
        <!-- Render product details -->
      </div>
    }
  </div>
} @placeholder {
  <div class="loading-container">
    <div class="spinner"></div>
    <p>Loading Product Catalog...</p>
  </div>
}
```

In [`global-error.handler.ts`](file:///c:/SpringBoot/angular-frontend/src/app/handlers/global-error.handler.ts):

```typescript
import { ErrorHandler, Injectable } from '@angular/core';

// Global error handler catching unhandled exceptions across the entire Angular app
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const message = error.message ? error.message : error.toString();
    console.error('[Global ErrorHandler Caught Exception]:', message, error);
  }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **Production Health Auditing**: `/actuator/health` and `/actuator/metrics` allow Prometheus, Grafana, and Kubernetes readiness/liveness probes to monitor microservices.
2. **Compile-Time Domain Security**: Java 17 sealed classes ensure no rogue notification channel can be declared outside permitted bounds.
3. **Optimized Frontend Rendering**: `@defer` defers component initialization until triggered by timers, viewports, or user interaction, dramatically reducing initial page paint times.
