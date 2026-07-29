package com.myfinance.notifier.model

data class NotificationPayload(
    val app: String,
    val title: String,
    val text: String,
    val time: String,
    val eventId: String,
)
