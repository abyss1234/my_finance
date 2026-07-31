package com.myfinance.notifier.notification

import android.content.Context
import java.io.IOException
import java.util.concurrent.TimeUnit

class RecentNotificationStore(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE,
    )

    fun markIfNew(
        eventId: String,
        timestampMillis: Long,
    ): Result<Boolean> = runCatching {
        synchronized(lock) {
            val preferenceKey = "$EVENT_PREFIX$eventId"
            val expiryTime = timestampMillis - RETENTION_MILLIS
            val previousTimestamp = preferences.getLong(
                preferenceKey,
                NO_TIMESTAMP,
            )

            if (previousTimestamp >= expiryTime) {
                return@synchronized false
            }

            val editor = preferences.edit()
                .putLong(preferenceKey, timestampMillis)

            preferences.all.forEach { (key, value) ->
                if (
                    key.startsWith(EVENT_PREFIX) &&
                    key != preferenceKey &&
                    value is Long &&
                    value < expiryTime
                ) {
                    editor.remove(key)
                }
            }

            if (!editor.commit()) {
                throw IOException("Android could not save notification history.")
            }

            true
        }
    }

    fun forget(eventId: String): Result<Unit> = runCatching {
        val saved = preferences.edit()
            .remove("$EVENT_PREFIX$eventId")
            .commit()

        if (!saved) {
            throw IOException("Android could not update notification history.")
        }
    }

    private companion object {
        const val PREFERENCES_NAME = "recent_finance_notifications"
        const val EVENT_PREFIX = "event_"
        const val NO_TIMESTAMP = Long.MIN_VALUE
        val RETENTION_MILLIS = TimeUnit.DAYS.toMillis(7)
        val lock = Any()
    }
}
