package com.learning.notification.channel;

// Final class permitted by sealed interface NotificationChannel
public final class SmsNotificationChannel implements NotificationChannel {
    @Override
    public String getChannelName() {
        return "SMS";
    }

    @Override
    public String formatRecipient(String recipient) {
        return "tel:" + recipient;
    }
}
