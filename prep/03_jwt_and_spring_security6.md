# Topic 3: Stateless Authentication & JWT (Spring Security 6)

---

## ❓ Why Stateless JWT in Microservices?

In traditional monoliths, authentication relies on **HTTP Sessions** stored in server memory (e.g. `JSESSIONID`).

In a **Microservices Architecture**:
- Requests travel through the Gateway to multiple independent services (`auth-service`, `product-service`, `order-service`).
- Sharing HTTP sessions across independent microservices requires complex centralized session stores (like Redis).

**JSON Web Tokens (JWT)** solve this by making authentication **Stateless**:
- The `auth-service` verifies user credentials and issues a digitally signed JWT token.
- The client (Angular) stores this token and sends it in the `Authorization: Bearer <token>` header with every HTTP request.
- Downstream microservices (`product-service`) validate the cryptographic signature locally without calling `auth-service` or querying a database on every request.

---

## 🔑 JWT Token Structure

A JWT consists of 3 Base64URL-encoded strings separated by dots (`.`):
1. **Header**: Algorithm (`HS256`) and Token Type (`JWT`).
2. **Payload (Claims)**: Data such as `subject` (username), `role` (`ROLE_ADMIN`), and `expiration` timestamp.
3. **Signature**: Cryptographic signature calculated using a secret key (`HMAC-SHA`).

---

## 💻 Code Implementation in Our Project

### 1. JWT Generation (`auth-service`)

In [`JwtTokenProvider.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/security/JwtTokenProvider.java):

```java
package com.learning.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtTokenProvider {

    // Inject secret key string from application.yml (app.jwt.secret)
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    // Inject token expiration duration in milliseconds (e.g., 24 hours = 86400000 ms)
    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    // Decodes Base64 secret string into an HMAC-SHA SecretKey object
    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    // Generates a signed JWT token containing username, role, issue time, and expiration time
    public String generateToken(Authentication authentication) {
        String username = authentication.getName(); // Extract authenticated username
        
        // Extract granted role (e.g., ROLE_ADMIN or ROLE_USER)
        String role = authentication.getAuthorities().stream()
                .findFirst()
                .map(GrantedAuthority::getAuthority)
                .orElse("ROLE_USER");

        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

        // Build and sign the JWT payload using JJWT fluent builder
        return Jwts.builder()
                .subject(username) // Subject claim: username
                .claim("role", role) // Custom claim: user role
                .issuedAt(now) // iat claim: issued timestamp
                .expiration(expiryDate) // exp claim: expiration timestamp
                .signWith(key()) // Cryptographically sign with HMAC SecretKey
                .compact(); // Serialize to URL-safe JWT string
    }
}
```

---

### 2. Spring Security 6 Stateless Filter Chain (`auth-service`)

In [`SecurityConfig.java`](file:///c:/SpringBoot/auth-service/src/main/java/com/learning/auth/security/SecurityConfig.java):

```java
package com.learning.auth.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity // Enables Spring Security web protection
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF because authentication is stateless and uses Bearer tokens
            .csrf(AbstractHttpConfigurer::disable)
            
            // Set session creation policy to STATELESS (no HTTP session will be created or used)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // Configure endpoint authorization rules
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**", "/h2-console/**").permitAll() // Permit auth endpoints
                .anyRequest().authenticated() // Require authentication for all other endpoints
            );

        return http.build();
    }
}
```

---

### 3. JWT Verification Filter in Resource Service (`product-service`)

In [`JwtAuthenticationFilter.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/security/JwtAuthenticationFilter.java):

```java
package com.learning.product.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.util.Collections;

// Intercepts every incoming HTTP request once to validate the JWT token header
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(jwtSecret));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = parseJwt(request); // Extract token from "Authorization: Bearer <jwt>"
            
            if (jwt != null) {
                // Parse signed claims using secret key. Throws exception if signature is invalid or expired
                Claims claims = Jwts.parser()
                        .verifyWith(key())
                        .build()
                        .parseSignedClaims(jwt)
                        .getPayload();

                String username = claims.getSubject();
                String role = claims.get("role", String.class);

                // If user is valid and not already authenticated in current context
                if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                    SimpleGrantedAuthority authority = new SimpleGrantedAuthority(role != null ? role : "ROLE_USER");
                    
                    // Create Authentication object containing username and GrantedAuthority
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(username, null, Collections.singletonList(authority));
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                    // Store Authentication in SecurityContext for Spring Security authorization checks
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e);
        }

        filterChain.doFilter(request, response); // Pass request along the filter chain
    }

    // Utility method to extract token from "Authorization: Bearer <token>"
    private String parseJwt(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7); // Omit "Bearer " prefix
        }
        return null;
    }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **Stateless Security (`STATELESS`)**: Spring Security disables HTTP Sessions (`HttpSession`), ensuring every incoming request is evaluated exclusively by its Bearer token.
2. **Decoupled Verification**: `product-service` shares the exact same secret key (`app.jwt.secret`), enabling it to verify tokens locally without sending requests back to `auth-service`.
3. **Security Context**: Once verified, the filter populates `SecurityContextHolder.getContext().setAuthentication(...)`, allowing Spring Security annotations and path matchers to enforce access rules.
