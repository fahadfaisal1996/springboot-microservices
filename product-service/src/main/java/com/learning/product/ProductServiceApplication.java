package com.learning.product;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

// @SpringBootApplication initializes Spring Boot Product Microservice
@SpringBootApplication
// @EnableFeignClients scans for interfaces annotated with @FeignClient
@EnableFeignClients
public class ProductServiceApplication {

    public static void main(String[] args) {
        // Runs product-service on Port 8082
        SpringApplication.run(ProductServiceApplication.class, args);
    }
}
