package com.myfinance.notifier.model

data class AppSettings(
    val endpointUrl: String = DEFAULT_ENDPOINT_URL,
    val apiKey: String = "",
    val enabledPackageNames: Set<String> = MonitoredApp.allPackageNames,
    val lastDelivery: DeliveryStatus = DeliveryStatus(),
) {
    companion object {
        const val DEFAULT_ENDPOINT_URL =
            "https://my-finance-sage.vercel.app/api/macrodroid"
    }
}

enum class DeliveryState {
    NEVER,
    QUEUED,
    SUCCESS,
    ERROR,
}

data class DeliveryStatus(
    val state: DeliveryState = DeliveryState.NEVER,
    val message: String = "No notification has been sent yet.",
    val timestampMillis: Long? = null,
)
