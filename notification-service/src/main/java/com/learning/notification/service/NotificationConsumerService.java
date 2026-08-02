package com.learning.notification.service;

import com.learning.notification.channel.EmailNotificationChannel;
import com.learning.notification.channel.NotificationChannel;
import com.learning.notification.channel.SmsNotificationChannel;
import com.learning.notification.dto.NotificationRecord;
import com.learning.notification.dto.UserRegisteredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class NotificationConsumerService {

    private static final Logger log = LoggerFactory.getLogger(NotificationConsumerService.class);
    private final List<NotificationRecord> notifications = Collections.synchronizedList(new ArrayList<>());

    public NotificationConsumerService() {
        notifications.add(new NotificationRecord(
                "mailto:admin@cloudstore.com",
                "Welcome to CloudStore Microservices platform!",
                "EMAIL"
        ));
    }

    @KafkaListener(topics = "user-registration-events", groupId = "notification-group")
    public void consumeUserRegistrationEvent(UserRegisteredEvent event) {
        log.info("Received Kafka UserRegisteredEvent for username: {}, email: {}", event.username(), event.email());

        // Java 17 Pattern Matching switch with Sealed Interfaces
        NotificationChannel channel = new EmailNotificationChannel();
        String formattedRecipient = processChannel(channel, event.email());

        String message = String.format("Welcome %s! Your account with role [%s] was created successfully.",
                event.username(), event.role());

        NotificationRecord notification = new NotificationRecord(formattedRecipient, message, channel.getChannelName());
        notifications.add(notification);

        log.info("Successfully dispatched notification ID: {} via channel [{}] to {}",
                notification.id(), channel.getChannelName(), formattedRecipient);
    }

    // Pattern matching switch expression on Java 17 Sealed Interface
    private String processChannel(NotificationChannel channel, String recipient) {
        return switch (channel) {
            case EmailNotificationChannel email -> email.formatRecipient(recipient);
            case SmsNotificationChannel sms -> sms.formatRecipient(recipient);
        };
    }

    public List<NotificationRecord> getAllNotifications() {
        return new ArrayList<>(notifications);
    }
}
