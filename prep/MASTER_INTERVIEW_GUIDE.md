# Master Technical Interview Reference Guide (Spring Boot, Kafka & Angular)

This guide provides a comprehensive **Interview POV (Point of View)** reference. It contains real-world technical questions, senior-level architectural explanations, exact code examples directly from this project, and common follow-up pitfalls.

---

## 📚 Table of Contents

1. [Microservices & Service Discovery (Eureka)](#1-microservices--service-discovery-eureka)
2. [API Gateway & Dynamic Routing (Spring Cloud Gateway)](#2-api-gateway--dynamic-routing-spring-cloud-gateway)
3. [Stateless Security & JWT (Spring Security 6)](#3-stateless-security--jwt-spring-security-6)
4. [Role-Based Access Control (RBAC)](#4-role-based-access-control-rbac)
5. [Java 17 Records, Sealed Classes & Pattern Matching](#5-java-17-records-sealed-classes--pattern-matching)
6. [Global Exception Handling & API Contracts](#6-global-exception-handling--api-contracts)
7. [Event-Driven Messaging & Apache Kafka](#7-event-driven-messaging--apache-kafka)
8. [Inter-Service REST & Fault Tolerance (OpenFeign & Resilience4j)](#8-inter-service-rest--fault-tolerance-openfeign--resilience4j)
9. [Database Persistence & Flyway Migrations](#9-database-persistence--flyway-migrations)
10. [Angular 18 Frontend Architecture](#10-angular-18-frontend-architecture)
11. [Production Readiness, Docker & Observability](#11-production-readiness-docker--observability)

---

## 1. Microservices & Service Discovery (Eureka)

### ❓ Q1: How does Service Discovery work in Spring Cloud, and why isn't it sufficient to just use static IP addresses?

#### 🎯 Interviewer POV (How to Answer):
> "In cloud-native or containerized environments (Kubernetes, AWS ECS), microservice instances dynamically scale up and down, receiving ephemeral IP addresses. Hardcoding IP addresses causes system fragility. Service Discovery acts as a central registry where microservices register their network locations upon startup and query registry locations dynamically."

#### 💻 Project Code Example:
In [`DiscoveryServerApplication.java`](file:///c:/SpringBoot/discovery-server/src/main/java/com/learning/discovery/DiscoveryServerApplication.java):
```java
@SpringBootApplication
@EnableEurekaServer // Activates Eureka Service Registry on Port 8761
public class DiscoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

In [`auth-service/src/main/resources/application.yml`](file:///c:/SpringBoot/auth-service/src/main/resources/application.yml):
```yaml
spring:
  application:
    name: auth-service # Service ID registered in Eureka

eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka/ # Registers client with Eureka
  instance:
    prefer-ip-address: true
```

#### ⚠️ Pitfall / Follow-Up Question:
- **Follow-Up**: *What happens if the Eureka Server crashes?*
- **Answer**: Eureka Clients cache the registry locally on each client instance. If Eureka Server temporarily goes down, microservices continue communicating using their local cached IP tables.

---

## 2. API Gateway & Dynamic Routing (Spring Cloud Gateway)

### 开启 Q2: How does Spring Cloud Gateway route traffic dynamically using Eureka service names?

#### 🎯 Interviewer POV (How to Answer):
> "Spring Cloud Gateway uses the `lb://` protocol (Load Balanced URI format). Instead of forwarding requests to hardcoded URLs, the Gateway extracts the logical service name (e.g. `lb://AUTH-SERVICE`), queries the Eureka client registry for live instance IP addresses, and load balances incoming requests across available nodes using Reactor Netty."

#### 💻 Project Code Example:
In [`api-gateway/src/main/resources/application.yml`](file:///c:/SpringBoot/api-gateway/src/main/resources/application.yml):
```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: auth-service
          uri: lb://AUTH-SERVICE # Dynamic Eureka load balancing
          predicates:
            - Path=/api/v1/auth/**

        - id: product-service
          uri: lb://PRODUCT-SERVICE
          predicates:
            - Path=/api/v1/products/**
```

#### ⚠️ Pitfall / Follow-Up Question:
- **Follow-Up**: *Why place CORS configuration at the API Gateway level rather than in individual microservices?*
- **Answer**: Handling CORS globally at the API Gateway eliminates duplicate CORS logic across microservices and prevents pre-flight `OPTIONS` request blocking before traffic reaches downstream services.

---

## 3. Stateless Security & JWT (Spring Security 6)

### ❓ Q3: How do you configure Spring Security 6 for stateless JWT authentication in microservices?

#### 🎯 Interviewer POV (How to Answer):
> "In Spring Security 6, we define a `SecurityFilterChain` bean, explicitly disable CSRF (since requests use Bearer tokens rather than cookies), set `SessionCreationPolicy.STATELESS`, and register a custom `OncePerRequestFilter` (`JwtAuthenticationFilter`) before `UsernamePasswordAuthenticationFilter` to validate JWT signatures and populate `SecurityContextHolder`."

#### 💻 Project Code Example:
In [`SecurityConfig.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/security/SecurityConfig.java):
```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasAuthority("ROLE_ADMIN")
                .anyRequest().authenticated()
            );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
```

In [`JwtAuthenticationFilter.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/security/JwtAuthenticationFilter.java):
```java
String jwt = parseJwt(request);
if (jwt != null) {
    Claims claims = Jwts.parser().verifyWith(key()).build().parseSignedClaims(jwt).getPayload();
    String username = claims.getSubject();
    String role = claims.get("role", String.class);

    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role);
    UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken(username, null, Collections.singletonList(authority));
    
    SecurityContextHolder.getContext().setAuthentication(authentication);
}
```

---

## 4. Role-Based Access Control (RBAC)

### ❓ Q4: How is authority hierarchy and role protection enforced in REST controllers?

#### 🎯 Interviewer POV (How to Answer):
> "We combine path-level security in `SecurityConfig` (`hasAuthority("ROLE_ADMIN")`) with method-level annotations (`@EnableMethodSecurity`). Roles are encoded directly into JWT token claims upon login (`auth-service`) and decoded into Spring Security `GrantedAuthority` objects in downstream resource services (`product-service`)."

#### 💻 Project Code Example:
In [`AuthController.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/controller/AuthController.java):
```java
String role = authentication.getAuthorities().stream()
        .findFirst()
        .map(GrantedAuthority::getAuthority)
        .orElse("ROLE_USER");

String token = Jwts.builder()
        .subject(username)
        .claim("role", role) // Encodes role into JWT Payload
        .signWith(key())
        .compact();
```

---

## 5. Java 17 Records, Sealed Classes & Pattern Matching

### ❓ Q5: What benefits do Java 17 Records and Sealed Classes bring to Spring Boot microservices?

#### 🎯 Interviewer POV (How to Answer):
> "Java 17 Records serve as transparent, immutable DTO data carriers, eliminating hundreds of lines of boilerplate getters, setters, and constructors while integrating natively with Jackson and Jakarta Bean Validation (`@NotBlank`, `@Valid`). Sealed Classes (`sealed interface`) restrict subtyping to permitted implementations, allowing pattern matching `switch` expressions to achieve compile-time pattern completeness."

#### 💻 Project Code Example (Records & Bean Validation):
In [`RegisterRequest.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/dto/RegisterRequest.java):
```java
public record RegisterRequest(
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30)
        String username,

        @NotBlank(message = "Email is required")
        @Email
        String email,

        @NotBlank(message = "Password is required")
        @Size(min = 6)
        String password,

        String role
) {}
```

#### 💻 Project Code Example (Sealed Classes & Pattern Matching):
In [`NotificationChannel.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/channel/NotificationChannel.java):
```java
public sealed interface NotificationChannel permits EmailNotificationChannel, SmsNotificationChannel {
    String getChannelName();
    String formatRecipient(String recipient);
}
```

In [`NotificationConsumerService.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/service/NotificationConsumerService.java):
```java
private String processChannel(NotificationChannel channel, String recipient) {
    return switch (channel) { // Java 17 Pattern Matching switch
        case EmailNotificationChannel email -> email.formatRecipient(recipient);
        case SmsNotificationChannel sms -> sms.formatRecipient(recipient);
    };
}
```

---

## 6. Global Exception Handling & API Contracts

### ❓ Q6: How do you prevent leaking raw stack traces and maintain uniform API error contracts across microservices?

#### 🎯 Interviewer POV (How to Answer):
> "We use `@RestControllerAdvice` to globally intercept exceptions thrown by controllers (`ResourceNotFoundException`, `AccessDeniedException`, `MethodArgumentNotValidException`). The advisor formats exceptions into a standardized `ErrorDetails` DTO JSON structure returning appropriate HTTP status codes (400, 403, 404, 500)."

#### 💻 Project Code Example:
In [`GlobalExceptionHandler.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/exception/GlobalExceptionHandler.java):
```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        ErrorDetails error = new ErrorDetails(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getRequestURI()
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetails> handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ErrorDetails error = new ErrorDetails(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Error",
                "Input validation failed",
                request.getRequestURI(),
                errors
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
}
```

---

## 7. Event-Driven Messaging & Apache Kafka

### ❓ Q7: Why use Apache Kafka over synchronous REST for user registration notifications?

#### 🎯 Interviewer POV (How to Answer):
> "Synchronous HTTP REST calls between `auth-service` and `notification-service` introduce tight coupling and latency. If the notification service is slow or down, user registration fails. With Kafka, `auth-service` asynchronously publishes a `UserRegisteredEvent` message to a Kafka topic and returns `201 Created` instantly. `notification-service` consumes events asynchronously via `@KafkaListener`, providing temporal decoupling and consumer resilience."

#### 💻 Project Code Example (Producer & Consumer):
In [`AuthController.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/controller/AuthController.java):
```java
UserRegisteredEvent event = new UserRegisteredEvent(user.getUsername(), user.getEmail(), user.getRole().name());
kafkaTemplate.send("user-registration-events", user.getUsername(), event);
```

In [`NotificationConsumerService.java`](file:///c:/SpringBoot/notification-service/src/main/java/com/learning/notification/service/NotificationConsumerService.java):
```java
@KafkaListener(topics = "user-registration-events", groupId = "notification-group")
public void consumeUserRegistrationEvent(UserRegisteredEvent event) {
    log.info("Received Kafka event for username: {}", event.username());
    NotificationRecord notification = new NotificationRecord(event.email(), "Welcome!", "EMAIL");
    notifications.add(notification);
}
```

---

## 8. Inter-Service REST & Fault Tolerance (OpenFeign & Resilience4j)

### ❓ Q8: How does OpenFeign integrate with Resilience4j Circuit Breakers to prevent cascading failures?

#### 🎯 Interviewer POV (How to Answer):
> "Spring Cloud OpenFeign provides declarative HTTP client interfaces. By enabling Resilience4j circuit breakers (`feign.circuitbreaker.enabled=true`), OpenFeign automatically monitors call failure rates. If a target microservice experiences high error rates (>50%), the circuit opens, immediately routing traffic to a local fallback class (`AuthServiceClientFallback`) without causing thread starvation."

#### 💻 Project Code Example:
In [`AuthServiceClient.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClient.java):
```java
@FeignClient(name = "auth-service", fallback = AuthServiceClientFallback.class)
public interface AuthServiceClient {

    @GetMapping("/api/v1/auth/validate")
    Map<String, Object> validateToken(@RequestParam("token") String token);
}
```

In [`AuthServiceClientFallback.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/client/AuthServiceClientFallback.java):
```java
@Component
public class AuthServiceClientFallback implements AuthServiceClient {

    @Override
    public Map<String, Object> validateToken(String token) {
        log.warn("Resilience4j Circuit Breaker Fallback executed: Auth Service is unreachable.");
        return Map.of("valid", false, "reason", "Auth Service circuit breaker open");
    }
}
```

---

## 9. Database Persistence & Flyway Migrations

### ❓ Q9: How do you manage database schemas across environments (Dev H2 / Local MySQL / Production PostgreSQL)?

#### 🎯 Interviewer POV (How to Answer):
> "We separate database configurations using Spring Profiles (`default` H2 in-memory vs `mysql` profile for local dev server vs `prod` PostgreSQL). In production, JPA `ddl-auto` is set to `validate`, and schema changes are managed via versioned SQL migration scripts executed by Flyway (`src/main/resources/db/migration/V1__*.sql`)."

#### 💻 Project Code Example:
In [`auth-service/src/main/resources/db/migration/V1__create_users_table.sql`](file:///c:/SpringBoot/auth-service/src/main/resources/db/migration/V1__create_users_table.sql):
```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL
);
```

---

## 10. Angular 18 Frontend Architecture

### ❓ Q10: How does Angular 18 handle JWT header injection, route protection, and performance optimization?

#### 🎯 Interviewer POV (How to Answer):
> "Angular 18 uses functional HTTP Interceptors (`jwtInterceptor`) to clone outgoing HTTP requests and append `Authorization: Bearer <token>` headers. Route navigation is protected using functional guards (`authGuard` and `adminGuard`). Performance is optimized using RxJS Signals for state management and `@defer` deferrable views for lazy-loading heavy UI component blocks."

#### 💻 Project Code Example (Interceptor & Defer View):
In [`jwt.interceptor.ts`](file:///c:/SpringBoot/angular-frontend/src/app/interceptors/jwt.interceptor.ts):
```typescript
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (token) {
    return next(req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) }));
  }
  return next(req);
};
```

In [`product-list.component.ts`](file:///c:/SpringBoot/angular-frontend/src/app/components/product-list/product-list.component.ts):
```html
@defer (on timer(100ms)) {
  <div class="product-grid">
    @for (product of filteredProducts; track product.id) {
      <div class="glass-panel product-card"> ... </div>
    }
  </div>
} @placeholder {
  <div class="spinner"></div>
}
```

---

## 11. Production Readiness, Docker & Observability

### ❓ Q11: How do you containerize Angular and Spring Boot microservices for production?

#### 🎯 Interviewer POV (How to Answer):
> "We use multi-stage Dockerfiles. For Spring Boot, Stage 1 compiles Maven targets using OpenJDK, and Stage 2 runs the lightweight JAR inside JRE Alpine. For Angular, Stage 1 compiles the production bundle using Node.js, and Stage 2 serves compiled static assets using Nginx. Production health and metrics are exposed via Spring Boot Actuator `/actuator/health` and `/actuator/prometheus`."

#### 💻 Project Code Example (Angular Multi-Stage Dockerfile):
In [`angular-frontend/Dockerfile`](file:///c:/SpringBoot/angular-frontend/Dockerfile):
```dockerfile
# Stage 1: Build static distribution bundle
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve static production bundle via Nginx
FROM nginx:1.25-alpine
COPY --from=builder /app/dist/angular-microservices-frontend/browser /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```
