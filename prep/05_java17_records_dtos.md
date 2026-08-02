# Topic 5: Modern Java 17 Records for DTOs

---

## ❓ What are Java 17 Records & Why Use Them for DTOs?

**Data Transfer Objects (DTOs)** are simple containers used to ship data between application layers or across network REST endpoints.

Traditionally, Java required developers to write verbose boilerplate for every DTO (fields, getters, setters, constructors, `equals()`, `hashCode()`, `toString()`).

Introduced in Java 16/17, **Records** are a modern language feature designed specifically to serve as **transparent, immutable data carriers**.

---

## 🚀 Key Advantages of Java 17 Records

1. **Massive Boilerplate Reduction**: Converts 50+ lines of traditional class boilerplate into a concise line or compact block.
2. **Immutable by Default**: All components are implicitly `final`. Prevents accidental state mutations when data passes through controllers or services.
3. **Jackson & Bean Validation Integration**: Spring Boot 3 natively serializes/deserializes JSON directly to/from Java Records and executes `@Valid` annotations.

---

## 💻 Code Implementation in Our Project

### 1. Simple Request DTO Record (`auth-service`)

In [`RegisterRequest.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/dto/RegisterRequest.java):

```java
package com.learning.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Record header defines all immutable components (username, email, password, role)
public record RegisterRequest(
        // Bean validation: Ensures username is not empty and between 3 and 30 characters
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
        String username,

        // Bean validation: Validates email format
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        String email,

        // Bean validation: Ensures minimum password length
        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters long")
        String password,

        // Optional role specification ("ROLE_USER" or "ROLE_ADMIN")
        String role
) {}
```

---

### 2. Record with Compact Constructor (`auth-service`)

In [`AuthResponse.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/dto/AuthResponse.java):

```java
package com.learning.auth.dto;

// Record representing successful JWT authentication response
public record AuthResponse(
        String token,       // The generated JWT token string
        String tokenType,   // Token type header (default: "Bearer")
        String username,    // Authenticated username
        String email,       // Authenticated user email
        String role         // Assigned role ("ROLE_USER" / "ROLE_ADMIN")
) {
    // Custom overloaded constructor supplying default "Bearer" tokenType
    public AuthResponse(String token, String username, String email, String role) {
        this(token, "Bearer", username, email, role);
    }
}
```

---

### 3. Record with Domain Model Mapping Constructor (`product-service`)

In [`ProductResponse.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/dto/ProductResponse.java):

```java
package com.learning.product.dto;

import com.learning.product.entity.Product;
import java.math.BigDecimal;

// Record returned by Product REST API endpoints
public record ProductResponse(
        Long id,
        String name,
        String description,
        BigDecimal price,
        Integer stockQuantity,
        String category
) {
    // Custom domain mapper constructor converting JPA Product Entity directly to DTO Record
    public ProductResponse(Product product) {
        this(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getStockQuantity(),
                product.getCategory()
        );
    }
}
```

---

## 🔍 Accessor Method Syntax Difference

Unlike traditional JavaBean getters (`user.getUsername()`), Java 17 Records generate **clean accessor methods matching component names** (`user.username()`):

```java
// Traditional JavaBean method invocation:
String u = request.getUsername();
BigDecimal p = response.getPrice();

// Java 17 Record accessor method invocation:
String u = request.username();
BigDecimal p = response.price();
```
