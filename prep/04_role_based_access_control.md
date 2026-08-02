# Topic 4: Role-Based Access Control (RBAC) & Method/Path Security

---

## ❓ What is Role-Based Access Control (RBAC)?

**Role-Based Access Control (RBAC)** restricts system access based on the role assigned to an authenticated user.

In our project:
- **`ROLE_USER`**: Standard customers. Can view products (`GET /api/v1/products`). Cannot add or delete products.
- **`ROLE_ADMIN`**: Store administrators. Can view, create (`POST /api/v1/products`), and delete (`DELETE /api/v1/products/{id}`) products.

---

## 🏗️ RBAC Enforcement Flow

```
Client Request (HTTP GET/POST/DELETE + JWT Token)
                     |
                     v
   JwtAuthenticationFilter (extracts 'role' claim)
                     |
                     v
      Populates SecurityContextHolder
        (Authority: ROLE_USER or ROLE_ADMIN)
                     |
                     v
         Spring Security Filter Chain
                     |
        +------------+------------+
        |                         |
  Matches Path Rule         Matches Path Rule
  (e.g., GET /products)     (e.g., POST /products)
        |                         |
   Permit All /            Requires Authority:
   ROLE_USER / ADMIN           ROLE_ADMIN
        |                         |
    [200 OK]             +--------+--------+
                         |                 |
                   Has ROLE_ADMIN?   Lacks ROLE_ADMIN?
                         |                 |
                     [201 Created]    [403 Forbidden]
```

---

## 💻 Code Implementation in Our Project

### 1. User & Role Entities (`auth-service`)

In [`Role.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/entity/Role.java):
```java
package com.learning.auth.entity;

// Enum defining available security roles in the application
public enum Role {
    ROLE_USER,  // Standard user privileges
    ROLE_ADMIN  // Administrator privileges
}
```

In [`User.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/entity/User.java):
```java
package com.learning.auth.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    // Persist Role enum as STRING ("ROLE_USER" / "ROLE_ADMIN") in database
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // Constructors, Getters & Setters ...
}
```

---

### 2. Path Authorization Rules (`product-service`)

In [`SecurityConfig.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/security/SecurityConfig.java):

```java
package com.learning.product.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity // Enables method-level annotations (@PreAuthorize, @PostAuthorize)
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
                // Allow public access to H2 database console and health actuator
                .requestMatchers("/h2-console/**", "/actuator/**").permitAll()
                
                // 1. Allow any user (ROLE_USER or ROLE_ADMIN) to read product catalog
                .requestMatchers(HttpMethod.GET, "/api/v1/products/**").permitAll()
                
                // 2. Restrict product creation (POST) exclusively to ROLE_ADMIN
                .requestMatchers(HttpMethod.POST, "/api/v1/products/**").hasAuthority("ROLE_ADMIN")
                
                // 3. Restrict product deletion (DELETE) exclusively to ROLE_ADMIN
                .requestMatchers(HttpMethod.DELETE, "/api/v1/products/**").hasAuthority("ROLE_ADMIN")
                
                // Any other unmapped endpoint requires an authenticated request
                .anyRequest().authenticated()
            );

        // Register custom JWT authentication filter before standard UsernamePassword filter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

---

### 3. Controller Method Level Handling (`product-service`)

In [`ProductController.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/controller/ProductController.java):

```java
package com.learning.product.controller;

import com.learning.product.dto.ProductRequest;
import com.learning.product.dto.ProductResponse;
import com.learning.product.entity.Product;
import com.learning.product.repository.ProductRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductRepository productRepository;

    public ProductController(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    // Accessible to all users (GET /api/v1/products)
    @GetMapping
    public ResponseEntity<List<ProductResponse>> getAllProducts() { ... }

    // Enforced by SecurityConfig: Requires ROLE_ADMIN authority (POST /api/v1/products)
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest request) {
        Product product = new Product(
                request.name(),
                request.description(),
                request.price(),
                request.stockQuantity(),
                request.category()
        );
        Product savedProduct = productRepository.save(product);
        return new ResponseEntity<>(new ProductResponse(savedProduct), HttpStatus.CREATED);
    }

    // Enforced by SecurityConfig: Requires ROLE_ADMIN authority (DELETE /api/v1/products/{id})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **`hasAuthority("ROLE_ADMIN")` vs `hasRole("ADMIN")`**: In Spring Security, `hasAuthority` looks for exact granted authority strings (`ROLE_ADMIN`), whereas `hasRole` automatically prepends `ROLE_`.
2. **Stateless Enforcement**: Role check is performed directly on the authority extracted from the JWT token signature without database queries.
3. **Automatic 403 Forbidden Response**: If a user with `ROLE_USER` sends `POST /api/v1/products`, Spring Security blocks request execution before it reaches the controller and triggers a `403 Forbidden` response handled by `@RestControllerAdvice`.
