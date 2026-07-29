package com.myfinance.notifier.notification

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.myfinance.notifier.data.SettingsRepository
import com.myfinance.notifier.model.DeliveryState
import com.myfinance.notifier.model.DeliveryStatus
import com.myfinance.notifier.model.MonitoredApp
import com.myfinance.notifier.model.NotificationPayload
import com.myfinance.notifier.network.NotificationUploadWorker
import java.security.MessageDigest

class FinanceNotificationListener : NotificationListenerService() {
    private val settingsRepository by lazy {
        SettingsRepository(applicationContext)
    }

    override fun onNotificationPosted(statusBarNotification: StatusBarNotification?) {
        if (statusBarNotification == null) return

        val monitoredApp = MonitoredApp.fromPackageName(statusBarNotification.packageName)
            ?: return
        if (statusBarNotification.notification.isGroupSummary()) return

        val enabledPackages = settingsRepository.loadEnabledPackageNames()
            .getOrElse { error ->
                recordListenerError(
                    "Could not read monitored apps: ${error.safeMessage()}"
                )
                return
            }
        if (monitoredApp.packageName !in enabledPackages) return

        val title = statusBarNotification.notification.readTitle()
        val text = statusBarNotification.notification.readText()
        if (text.isBlank()) return

        val payload = NotificationPayload(
            app = monitoredApp.displayName,
            title = title.take(MAX_TITLE_LENGTH),
            text = text.take(MAX_TEXT_LENGTH),
            time = statusBarNotification.postTime.toString(),
            eventId = createEventId(
                packageName = monitoredApp.packageName,
                notificationKey = statusBarNotification.key,
                postTime = statusBarNotification.postTime,
                title = title,
                text = text,
            ),
        )

        NotificationUploadWorker.enqueue(applicationContext, payload)
            .onFailure { error ->
                recordListenerError(
                    "Could not queue the notification: ${error.safeMessage()}"
                )
            }
    }

    private fun Notification.readTitle(): String {
        val bigTitle = extras.getCharSequence(Notification.EXTRA_TITLE_BIG)
        val normalTitle = extras.getCharSequence(Notification.EXTRA_TITLE)
        return (bigTitle ?: normalTitle)?.toString()?.trim().orEmpty()
    }

    private fun Notification.readText(): String {
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
            ?.toString()
            ?.trim()
            .orEmpty()
        if (bigText.isNotEmpty()) return bigText

        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
            ?.map { it.toString().trim() }
            ?.filter { it.isNotEmpty() }
            ?.joinToString("\n")
            .orEmpty()
        if (textLines.isNotEmpty()) return textLines

        return extras.getCharSequence(Notification.EXTRA_TEXT)
            ?.toString()
            ?.trim()
            ?.takeIf { it.isNotEmpty() }
            ?: tickerText?.toString()?.trim().orEmpty()
    }

    private fun Notification.isGroupSummary(): Boolean =
        flags and Notification.FLAG_GROUP_SUMMARY != 0

    private fun createEventId(
        packageName: String,
        notificationKey: String,
        postTime: Long,
        title: String,
        text: String,
    ): String {
        val source = "$packageName|$notificationKey|$postTime|$title|$text"
        return MessageDigest.getInstance("SHA-256")
            .digest(source.toByteArray(Charsets.UTF_8))
            .joinToString("") { byte -> "%02x".format(byte) }
    }

    private fun recordListenerError(message: String) {
        settingsRepository.recordDeliveryStatus(
            DeliveryStatus(
                state = DeliveryState.ERROR,
                message = message,
                timestampMillis = System.currentTimeMillis(),
            )
        )
    }

    private fun Throwable.safeMessage(): String =
        message?.take(160)?.takeIf { it.isNotBlank() } ?: javaClass.simpleName

    private companion object {
        const val MAX_TITLE_LENGTH = 500
        const val MAX_TEXT_LENGTH = 5_000
    }
}
