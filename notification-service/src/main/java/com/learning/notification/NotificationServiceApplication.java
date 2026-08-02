package com.learning.notification;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// @SpringBootApplication initializes Spring Boot Notification Microservice
@SpringBootApplication
public class NotificationServiceApplication {

    public static void main(String[] args) {
        // Runs notification-service on Port 8083
        SpringApplication.run(NotificationServiceApplication.class, args);
    }
}
