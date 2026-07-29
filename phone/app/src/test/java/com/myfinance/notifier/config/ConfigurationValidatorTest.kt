package com.myfinance.notifier.config

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class ConfigurationValidatorTest {
    @Test
    fun acceptsHttpsConfiguration() {
        val result = ConfigurationValidator.validate(
            endpointUrl = "https://example.com/api/macrodroid",
            apiKey = "long-random-api-key",
            allowHttp = false,
        )

        assertEquals(ConfigurationValidation.Valid, result)
    }

    @Test
    fun rejectsHttpForReleaseConfiguration() {
        val result = ConfigurationValidator.validate(
            endpointUrl = "http://192.168.1.10:3000/api/macrodroid",
            apiKey = "long-random-api-key",
            allowHttp = false,
        )

        assertTrue(result is ConfigurationValidation.Invalid)
    }

    @Test
    fun permitsHttpForDebugConfiguration() {
        val result = ConfigurationValidator.validate(
            endpointUrl = "http://192.168.1.10:3000/api/macrodroid",
            apiKey = "long-random-api-key",
            allowHttp = true,
        )

        assertEquals(ConfigurationValidation.Valid, result)
    }

    @Test
    fun rejectsMissingApiKey() {
        val result = ConfigurationValidator.validate(
            endpointUrl = "https://example.com/api/macrodroid",
            apiKey = "",
            allowHttp = false,
        )

        assertTrue(result is ConfigurationValidation.Invalid)
    }
}
