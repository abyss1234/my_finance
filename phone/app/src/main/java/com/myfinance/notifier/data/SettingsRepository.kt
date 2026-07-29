package com.myfinance.notifier.data

import android.content.Context
import android.content.SharedPreferences
import com.myfinance.notifier.model.AppSettings
import com.myfinance.notifier.model.DeliveryState
import com.myfinance.notifier.model.DeliveryStatus
import com.myfinance.notifier.model.MonitoredApp
import java.io.IOException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged

class SettingsRepository(context: Context) {
    private val preferences = context.applicationContext.getSharedPreferences(
        PREFERENCES_NAME,
        Context.MODE_PRIVATE,
    )
    private val apiKeyCipher by lazy { ApiKeyCipher() }

    fun observeSettings(): Flow<Result<AppSettings>> = callbackFlow {
        fun sendCurrentSettings() {
            trySend(loadSettings())
        }

        val listener = SharedPreferences.OnSharedPreferenceChangeListener { _, _ ->
            sendCurrentSettings()
        }

        preferences.registerOnSharedPreferenceChangeListener(listener)
        sendCurrentSettings()
        awaitClose {
            preferences.unregisterOnSharedPreferenceChangeListener(listener)
        }
    }.distinctUntilChanged()

    fun loadSettings(): Result<AppSettings> = runCatching {
        AppSettings(
            endpointUrl = preferences.getString(
                KEY_ENDPOINT_URL,
                AppSettings.DEFAULT_ENDPOINT_URL,
            ) ?: AppSettings.DEFAULT_ENDPOINT_URL,
            apiKey = loadApiKey(),
            enabledPackageNames = preferences.getStringSet(
                KEY_ENABLED_PACKAGES,
                MonitoredApp.allPackageNames,
            )?.toSet() ?: MonitoredApp.allPackageNames,
            lastDelivery = loadDeliveryStatus(),
        )
    }

    fun loadEnabledPackageNames(): Result<Set<String>> = runCatching {
        preferences.getStringSet(
            KEY_ENABLED_PACKAGES,
            MonitoredApp.allPackageNames,
        )?.toSet() ?: MonitoredApp.allPackageNames
    }

    fun saveConfiguration(
        endpointUrl: String,
        apiKey: String,
        enabledPackageNames: Set<String>,
    ): Result<Unit> = runCatching {
        val encryptedApiKey = apiKeyCipher.encrypt(apiKey.trim())
        val saved = preferences.edit()
            .putString(KEY_ENDPOINT_URL, endpointUrl.trim())
            .putString(KEY_API_KEY_CIPHERTEXT, encryptedApiKey.ciphertext)
            .putString(KEY_API_KEY_IV, encryptedApiKey.initializationVector)
            .putStringSet(KEY_ENABLED_PACKAGES, enabledPackageNames)
            .commit()

        if (!saved) throw IOException("Android could not save the app settings.")
    }

    fun recordDeliveryStatus(status: DeliveryStatus): Result<Unit> = runCatching {
        val saved = preferences.edit()
            .putString(KEY_DELIVERY_STATE, status.state.name)
            .putString(KEY_DELIVERY_MESSAGE, status.message)
            .apply {
                status.timestampMillis?.let {
                    putLong(KEY_DELIVERY_TIME, it)
                } ?: remove(KEY_DELIVERY_TIME)
            }
            .commit()

        if (!saved) throw IOException("Android could not save the delivery status.")
    }

    private fun loadApiKey(): String {
        val ciphertext = preferences.getString(KEY_API_KEY_CIPHERTEXT, null)
        val initializationVector = preferences.getString(KEY_API_KEY_IV, null)

        if (ciphertext == null && initializationVector == null) return ""
        if (ciphertext == null || initializationVector == null) {
            throw IllegalStateException("The saved API key is incomplete. Enter it again.")
        }

        return apiKeyCipher.decrypt(ciphertext, initializationVector)
    }

    private fun loadDeliveryStatus(): DeliveryStatus {
        val stateName = preferences.getString(KEY_DELIVERY_STATE, null)
        val state = stateName?.let {
            runCatching { DeliveryState.valueOf(it) }.getOrNull()
        } ?: DeliveryState.NEVER

        val defaultMessage = if (state == DeliveryState.NEVER) {
            "No notification has been sent yet."
        } else {
            "Delivery status is unavailable."
        }

        val timestamp = if (preferences.contains(KEY_DELIVERY_TIME)) {
            preferences.getLong(KEY_DELIVERY_TIME, 0L)
        } else {
            null
        }

        return DeliveryStatus(
            state = state,
            message = preferences.getString(KEY_DELIVERY_MESSAGE, defaultMessage)
                ?: defaultMessage,
            timestampMillis = timestamp,
        )
    }

    private companion object {
        const val PREFERENCES_NAME = "finance_notifier_settings"
        const val KEY_ENDPOINT_URL = "endpoint_url"
        const val KEY_API_KEY_CIPHERTEXT = "api_key_ciphertext"
        const val KEY_API_KEY_IV = "api_key_iv"
        const val KEY_ENABLED_PACKAGES = "enabled_packages"
        const val KEY_DELIVERY_STATE = "delivery_state"
        const val KEY_DELIVERY_MESSAGE = "delivery_message"
        const val KEY_DELIVERY_TIME = "delivery_time"
    }
}
