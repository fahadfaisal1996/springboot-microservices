# Topic 6: Global Exception Handling (`@RestControllerAdvice`)

---

## ❓ What Problem Does Global Exception Handling Solve?

Without centralized exception handling:
1. Unhandled exceptions return raw Java stack traces or generic 500 HTML error pages.
2. Microservices return inconsistent error formats (e.g. Auth Service returns `{ "err": "msg" }`, while Product Service returns `{ "message": "error" }`).
3. Sensitive internal database schema details can leak to clients.

**Global Exception Handling** with **`@RestControllerAdvice`** intercepts exceptions across all controllers and formats them into a unified, consistent JSON schema.

---

## 📐 Standardized Error Schema (`ErrorDetails`)

All API microservices in our project return errors adhering to this JSON contract:

```json
{
  "timestamp": "2026-08-01T20:45:00",
  "status": 400,
  "error": "Validation Error",
  "message": "Input validation failed",
  "path": "/api/v1/products",
  "fieldErrors": {
    "name": "Product name is required",
    "price": "Price must be greater than 0"
  }
}
```

---

## 💻 Code Implementation in Our Project

### 1. Global Exception Handler (`product-service`)

In [`GlobalExceptionHandler.java`](file:///c:/SpringBoot/product-service/src/main/java/com/learning/product/exception/GlobalExceptionHandler.java):

```java
package com.learning.product.exception;

import com.learning.product.dto.ErrorDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

// @RestControllerAdvice: Globally intercepts exceptions thrown by any REST controller
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 1. Intercepts ResourceNotFoundException -> Returns 404 NOT_FOUND
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorDetails> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        ErrorDetails error = new ErrorDetails(
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(), // Exception message (e.g., "Product not found with id: 99")
                request.getRequestURI() // Request URI path
        );
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    // 2. Intercepts AccessDeniedException -> Returns 403 FORBIDDEN
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorDetails> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        ErrorDetails error = new ErrorDetails(
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "Access denied: You do not have permission to access this resource",
                request.getRequestURI()
        );
        return new ResponseEntity<>(error, HttpStatus.FORBIDDEN);
    }

    // 3. Intercepts @Valid DTO Validation Failures -> Returns 400 BAD_REQUEST with field error map
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorDetails> handleValidationErrors(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new HashMap<>();
        
        // Extract all validation field errors and populate field -> message map
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }

        ErrorDetails error = new ErrorDetails(
                HttpStatus.BAD_REQUEST.value(),
                "Validation Error",
                "Input validation failed",
                request.getRequestURI(),
                errors // Contains field-specific validation errors
        );
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // 4. Catch-all Generic Fallback Exception Handler -> Returns 500 INTERNAL_SERVER_ERROR
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorDetails> handleGenericException(Exception ex, HttpServletRequest request) {
        ErrorDetails error = new ErrorDetails(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                ex.getMessage(),
                request.getRequestURI()
        );
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

---

## 🔍 Key Concepts & Takeaways

1. **`@RestControllerAdvice`**: Combines `@ControllerAdvice` and `@ResponseBody`. Every returned `ResponseEntity<ErrorDetails>` is automatically serialized to JSON.
2. **`@ExceptionHandler(TargetException.class)`**: Specifies exactly which exception type a method handles (e.g. `ResourceNotFoundException.class`, `MethodArgumentNotValidException.class`).
3. **Clean Controller Code**: Controllers do not need verbose `try-catch` blocks. Controllers simply throw exceptions (`throw new ResourceNotFoundException(...)`), and Spring automatically routes them to the `@RestControllerAdvice`.
