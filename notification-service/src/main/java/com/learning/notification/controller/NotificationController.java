package com.learning.notification.controller;

import com.learning.notification.dto.NotificationRecord;
import com.learning.notification.service.NotificationConsumerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationConsumerService notificationService;

    public NotificationController(NotificationConsumerService notificationService) {
        this.notificationService = notificationService;
    }

    // Endpoint returning list of processed notifications
    @GetMapping
    public ResponseEntity<List<NotificationRecord>> getNotifications() {
        return ResponseEntity.ok(notificationService.getAllNotifications());
    }
}
