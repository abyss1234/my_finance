package com.myfinance.notifier.config

import java.net.URI

sealed interface ConfigurationValidation {
    data object Valid : ConfigurationValidation

    data class Invalid(val message: String) : ConfigurationValidation
}

object ConfigurationValidator {
    fun validate(
        endpointUrl: String,
        apiKey: String,
        allowHttp: Boolean,
    ): ConfigurationValidation {
        if (endpointUrl.isBlank()) {
            return ConfigurationValidation.Invalid("Enter the API URL.")
        }

        val uri = try {
            URI(endpointUrl.trim())
        } catch (_: Exception) {
            return ConfigurationValidation.Invalid("The API URL is not valid.")
        }

        val scheme = uri.scheme?.lowercase()
        if (uri.host.isNullOrBlank() || scheme !in setOf("https", "http")) {
            return ConfigurationValidation.Invalid(
                "Use a complete URL such as https://example.com/api/macrodroid."
            )
        }

        if (scheme == "http" && !allowHttp) {
            return ConfigurationValidation.Invalid(
                "Release builds require an HTTPS API URL."
            )
        }

        if (uri.fragment != null) {
            return ConfigurationValidation.Invalid("Remove the # fragment from the API URL.")
        }

        if (apiKey.isBlank()) {
            return ConfigurationValidation.Invalid("Enter the MacroDroid API key.")
        }

        return ConfigurationValidation.Valid
    }
}
