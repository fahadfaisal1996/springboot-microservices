package com.learning.product.config;

import com.learning.product.entity.Product;
import com.learning.product.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final ProductRepository productRepository;

    public DataInitializer(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) {
        if (productRepository.count() == 0) {
            List<Product> sampleProducts = List.of(
                new Product("UltraBook Pro 15", "High performance laptop with M3 chip and Retina display", new BigDecimal("1299.99"), 25, "Electronics"),
                new Product("Noise Cancelling Headphones", "Wireless over-ear headphones with 30hr battery life", new BigDecimal("249.50"), 50, "Audio"),
                new Product("Mechanical Gaming Keyboard", "RGB backlit keyboard with tactile blue switches", new BigDecimal("89.99"), 40, "Peripherals"),
                new Product("Smart Fitness Watch", "Water resistant smartwatch with heart rate & GPS tracker", new BigDecimal("179.99"), 30, "Wearables"),
                new Product("Ergonomic Desk Chair", "Breathable mesh office chair with lumbar support", new BigDecimal("299.00"), 15, "Furniture")
            );
            productRepository.saveAll(sampleProducts);
        }
    }
}
