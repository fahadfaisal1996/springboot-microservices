package com.learning.auth.controller;

import com.learning.auth.dto.*;
import com.learning.auth.entity.Role;
import com.learning.auth.entity.User;
import com.learning.auth.exception.UserAlreadyExistsException;
import com.learning.auth.repository.UserRepository;
import com.learning.auth.security.JwtTokenProvider;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public AuthController(AuthenticationManager authenticationManager,
                          UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtTokenProvider tokenProvider,
                          KafkaTemplate<String, Object> kafkaTemplate) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
        this.kafkaTemplate = kafkaTemplate;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            throw new UserAlreadyExistsException("Username '" + request.username() + "' is already taken!");
        }

        if (userRepository.existsByEmail(request.email())) {
            throw new UserAlreadyExistsException("Email '" + request.email() + "' is already registered!");
        }

        Role role = Role.ROLE_USER;
        if (request.role() != null && request.role().equalsIgnoreCase("ROLE_ADMIN")) {
            role = Role.ROLE_ADMIN;
        }

        User user = new User(
                request.username(),
                request.email(),
                passwordEncoder.encode(request.password()),
                role
        );

        userRepository.save(user);

        // Publish UserRegisteredEvent to Apache Kafka topic 'user-registration-events'
        try {
            UserRegisteredEvent event = new UserRegisteredEvent(user.getUsername(), user.getEmail(), user.getRole().name());
            kafkaTemplate.send("user-registration-events", user.getUsername(), event);
            log.info("Published UserRegisteredEvent to Kafka for user: {}", user.getUsername());
        } catch (Exception e) {
            log.warn("Kafka event publishing skipped (Kafka broker offline): {}", e.getMessage());
        }

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        String token = tokenProvider.generateToken(authentication);

        return new ResponseEntity<>(
                new AuthResponse(token, user.getUsername(), user.getEmail(), user.getRole().name()),
                HttpStatus.CREATED
        );
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.usernameOrEmail(), request.password())
        );

        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(request.usernameOrEmail())
                .orElseGet(() -> userRepository.findByEmail(request.usernameOrEmail()).orElseThrow());

        return ResponseEntity.ok(new AuthResponse(token, user.getUsername(), user.getEmail(), user.getRole().name()));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestParam("token") String token) {
        boolean isValid = tokenProvider.validateToken(token);
        if (isValid) {
            String username = tokenProvider.getUsernameFromJWT(token);
            User user = userRepository.findByUsername(username).orElse(null);
            return ResponseEntity.ok(Map.of(
                    "valid", true,
                    "username", username,
                    "role", user != null ? user.getRole().name() : "ROLE_USER"
            ));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("valid", false));
        }
    }
}
