package com.learning.notification.channel;

// Final class permitted by sealed interface NotificationChannel
public final class EmailNotificationChannel implements NotificationChannel {
    @Override
    public String getChannelName() {
        return "EMAIL";
    }

    @Override
    public String formatRecipient(String recipient) {
        return "mailto:" + recipient.toLowerCase();
    }
}
