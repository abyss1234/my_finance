package com.myfinance.notifier.ui

import com.myfinance.notifier.model.AppSettings
import com.myfinance.notifier.model.DeliveryStatus
import com.myfinance.notifier.model.MonitoredApp

data class MainUiState(
    val isLoading: Boolean = true,
    val isBusy: Boolean = false,
    val endpointUrl: String = AppSettings.DEFAULT_ENDPOINT_URL,
    val apiKey: String = "",
    val enabledPackageNames: Set<String> = MonitoredApp.allPackageNames,
    val notificationAccessEnabled: Boolean = false,
    val hasUnsavedChanges: Boolean = false,
    val lastDelivery: DeliveryStatus = DeliveryStatus(),
    val message: UiMessage? = null,
)

data class UiMessage(
    val text: String,
    val kind: UiMessageKind,
)

enum class UiMessageKind {
    INFO,
    SUCCESS,
    ERROR,
}
