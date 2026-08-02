# Spring Boot Microservices + Apache Kafka + Angular Study & Master Reference Guide

Welcome to the comprehensive reference and interview prep guide for this microservices architecture. Each guide breaks down key concepts, problem statements, diagrams, code implementations, and key takeaways.

---

## 🌟 Master Reference & Interview Assets

- 🏆 **[Master Technical Interview Guide (`MASTER_INTERVIEW_GUIDE.md`)](file:///c:/SpringBoot/prep/MASTER_INTERVIEW_GUIDE.md)**: Real-world senior interview questions, Point of View (POV) architectural answers, exact code examples from this project, and common follow-up pitfalls across all 11 core architecture domains.
- ⚙️ **[Configuration Specification Guide (`CONFIGURATION_SPECIFICATION.md`)](file:///c:/SpringBoot/prep/CONFIGURATION_SPECIFICATION.md)**: Line-by-line commented reference for all configurations (Dev vs Prod), property management locations, architectural importance, and production maintenance strategies.

---

## 📚 Detailed Topic Guides Table of Contents

| Topic # | Guide | Description |
|---|---|---|
| **01** | [Service Discovery (Eureka Server & Client)](file:///c:/SpringBoot/prep/01_service_discovery.md) | Dynamic service registry, self-registration, heartbeats, Eureka server configuration. |
| **02** | [API Gateway & Dynamic Routing](file:///c:/SpringBoot/prep/02_api_gateway_and_routing.md) | Reverse proxy, dynamic `lb://` load-balanced routing, and global CORS setup for Angular. |
| **03** | [Stateless Auth & JWT (Spring Security 6)](file:///c:/SpringBoot/prep/03_jwt_and_spring_security6.md) | Stateless security filter chain, JJWT 0.12.6, token issuance, and bearer verification. |
| **04** | [Role-Based Access Control (RBAC)](file:///c:/SpringBoot/prep/04_role_based_access_control.md) | `ROLE_USER` vs `ROLE_ADMIN`, path authorization rules, and method security. |
| **05** | [Modern Java 17 Records for DTOs](file:///c:/SpringBoot/prep/05_java17_records_dtos.md) | Immutable DTO data carriers, zero boilerplate, bean validation, and record constructors. |
| **06** | [Global Exception Handling](file:///c:/SpringBoot/prep/06_global_exception_handling.md) | `@RestControllerAdvice`, `@ExceptionHandler`, unified `ErrorDetails` JSON contracts. |
| **07** | [Angular Frontend Integration](file:///c:/SpringBoot/prep/07_angular_frontend_integration.md) | Angular 18 standalone components, `jwtInterceptor`, `authGuard`, and RxJS signals. |
| **08** | [Kafka & Event-Driven Architecture](file:///c:/SpringBoot/prep/08_kafka_and_event_driven_architecture.md) | Apache Kafka, `@KafkaListener`, `KafkaTemplate`, asynchronous event-driven notifications. |
| **09** | [Declarative REST Calls (OpenFeign)](file:///c:/SpringBoot/prep/09_openfeign_interservice_communication.md) | `@FeignClient`, declarative inter-service HTTP communication, Eureka load balancing. |
| **10** | [Circuit Breakers & Fallbacks (Resilience4j)](file:///c:/SpringBoot/prep/10_resilience4j_circuit_breaker_and_fallbacks.md) | Resilience4j circuit breakers, sliding window metrics, failure thresholds, and fallbacks. |
| **11** | [Actuator, Sealed Classes & Angular Defer](file:///c:/SpringBoot/prep/11_actuator_observability_and_sealed_classes.md) | Actuator `/actuator/health`, Java 17 sealed classes, pattern matching, `@defer` views. |
| **12** | [Production Readiness & Docker Deployment](file:///c:/SpringBoot/prep/12_production_readiness_and_deployment.md) | PostgreSQL migration, Flyway, multi-stage Dockerfiles, docker-compose, Kubernetes. |
| **13** | [Local MySQL Database Integration](file:///c:/SpringBoot/prep/13_local_mysql_database_integration.md) | Docker local MySQL 8.0 setup, `application-mysql.yml` profile, DBeaver/CLI queries. |
