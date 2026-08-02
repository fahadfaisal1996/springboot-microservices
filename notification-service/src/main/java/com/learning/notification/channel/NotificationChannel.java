package com.learning.notification.channel;

// Java 17 Sealed Interface permitting only EmailNotificationChannel and SmsNotificationChannel
public sealed interface NotificationChannel permits EmailNotificationChannel, SmsNotificationChannel {
    String getChannelName();
    String formatRecipient(String recipient);
}
