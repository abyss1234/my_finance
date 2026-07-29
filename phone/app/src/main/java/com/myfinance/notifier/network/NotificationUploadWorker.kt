package com.myfinance.notifier.network

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.myfinance.notifier.R
import com.myfinance.notifier.config.ConfigurationValidation
import com.myfinance.notifier.config.ConfigurationValidator
import com.myfinance.notifier.data.SettingsRepository
import com.myfinance.notifier.model.AppSettings
import com.myfinance.notifier.model.DeliveryState
import com.myfinance.notifier.model.DeliveryStatus
import com.myfinance.notifier.model.NotificationPayload
import java.io.IOException
import java.net.HttpURLConnection
import java.net.SocketTimeoutException
import java.net.URL
import java.util.concurrent.TimeUnit
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class NotificationUploadWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : CoroutineWorker(appContext, workerParameters) {
    private val settingsRepository = SettingsRepository(appContext)

    override suspend fun doWork(): Result {
        val payload = readPayload()
            ?: return failPermanently("The queued notification data is incomplete.")

        recordStatus(
            DeliveryStatus(
                state = DeliveryState.QUEUED,
                message = "Sending ${payload.app} notification.",
                timestampMillis = System.currentTimeMillis(),
            )
        )

        val settings = withContext(Dispatchers.IO) {
            settingsRepository.loadSettings()
        }.getOrElse { error ->
            return failPermanently(
                "Could not read the saved settings: ${error.safeMessage()}"
            )
        }

        val allowHttp = applicationContext.resources.getBoolean(R.bool.allow_http_endpoint)
        when (
            val validation = ConfigurationValidator.validate(
                endpointUrl = settings.endpointUrl,
                apiKey = settings.apiKey,
                allowHttp = allowHttp,
            )
        ) {
            ConfigurationValidation.Valid -> Unit
            is ConfigurationValidation.Invalid -> {
                return failPermanently(validation.message)
            }
        }

        return when (
            val attempt = withContext(Dispatchers.IO) {
                upload(settings, payload)
            }
        ) {
            is UploadAttempt.Success -> {
                recordStatus(
                    DeliveryStatus(
                        state = DeliveryState.SUCCESS,
                        message = attempt.message,
                        timestampMillis = System.currentTimeMillis(),
                    )
                )
                Result.success()
            }

            is UploadAttempt.PermanentFailure -> {
                failPermanently(attempt.message)
            }

            is UploadAttempt.RetryableFailure -> {
                retryOrFail(attempt.message)
            }
        }
    }

    private fun upload(
        settings: AppSettings,
        payload: NotificationPayload,
    ): UploadAttempt {
        val connection = try {
            URL(settings.endpointUrl).openConnection() as HttpURLConnection
        } catch (_: Exception) {
            return UploadAttempt.PermanentFailure("The saved API URL is not valid.")
        }

        return try {
            val requestBody = JSONObject()
                .put("app", payload.app)
                .put("title", payload.title)
                .put("text", payload.text)
                .put("time", payload.time)
                .put("eventId", payload.eventId)
                .toString()
                .toByteArray(Charsets.UTF_8)

            connection.requestMethod = "POST"
            connection.connectTimeout = CONNECT_TIMEOUT_MILLIS
            connection.readTimeout = READ_TIMEOUT_MILLIS
            connection.doOutput = true
            connection.setFixedLengthStreamingMode(requestBody.size)
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            connection.setRequestProperty("Accept", "application/json")
            connection.setRequestProperty("x-api-key", settings.apiKey)
            connection.setRequestProperty("x-notification-id", payload.eventId)
            connection.outputStream.use { output ->
                output.write(requestBody)
            }

            when (val responseCode = connection.responseCode) {
                in 200..299 -> {
                    UploadAttempt.Success("Server received the notification (HTTP $responseCode).")
                }

                401, 403 -> {
                    UploadAttempt.PermanentFailure(
                        "The server rejected the API key (HTTP $responseCode)."
                    )
                }

                408, 429 -> {
                    UploadAttempt.RetryableFailure(
                        "The server is temporarily unavailable (HTTP $responseCode)."
                    )
                }

                in 400..499 -> {
                    UploadAttempt.PermanentFailure(
                        "The server rejected the request (HTTP $responseCode)."
                    )
                }

                in 500..599 -> {
                    UploadAttempt.RetryableFailure(
                        "The server returned an error (HTTP $responseCode)."
                    )
                }

                else -> {
                    UploadAttempt.RetryableFailure(
                        "Unexpected server response (HTTP $responseCode)."
                    )
                }
            }
        } catch (_: SocketTimeoutException) {
            UploadAttempt.RetryableFailure("The connection timed out.")
        } catch (_: IOException) {
            UploadAttempt.RetryableFailure("The phone could not reach the server.")
        } catch (error: Exception) {
            UploadAttempt.PermanentFailure(
                "The request could not be prepared: ${error.safeMessage()}"
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun retryOrFail(message: String): Result {
        if (runAttemptCount >= MAX_RETRY_ATTEMPTS) {
            return failPermanently("$message Retry limit reached.")
        }

        recordStatus(
            DeliveryStatus(
                state = DeliveryState.QUEUED,
                message = "$message Android will retry.",
                timestampMillis = System.currentTimeMillis(),
            )
        )
        return Result.retry()
    }

    private fun failPermanently(message: String): Result {
        recordStatus(
            DeliveryStatus(
                state = DeliveryState.ERROR,
                message = message,
                timestampMillis = System.currentTimeMillis(),
            )
        )
        return Result.failure(workDataOf(KEY_OUTPUT_ERROR to message))
    }

    private fun recordStatus(status: DeliveryStatus) {
        settingsRepository.recordDeliveryStatus(status).onFailure { error ->
            Log.e(TAG, "Could not store the delivery status.", error)
        }
    }

    private fun readPayload(): NotificationPayload? {
        val app = inputData.getString(KEY_APP)?.takeIf { it.isNotBlank() } ?: return null
        val text = inputData.getString(KEY_TEXT)?.takeIf { it.isNotBlank() } ?: return null
        val time = inputData.getString(KEY_TIME)?.takeIf { it.isNotBlank() } ?: return null
        val eventId = inputData.getString(KEY_EVENT_ID)?.takeIf { it.isNotBlank() }
            ?: return null

        return NotificationPayload(
            app = app,
            title = inputData.getString(KEY_TITLE).orEmpty(),
            text = text,
            time = time,
            eventId = eventId,
        )
    }

    private fun Throwable.safeMessage(): String =
        message?.take(160)?.takeIf { it.isNotBlank() } ?: javaClass.simpleName

    private sealed interface UploadAttempt {
        data class Success(val message: String) : UploadAttempt
        data class PermanentFailure(val message: String) : UploadAttempt
        data class RetryableFailure(val message: String) : UploadAttempt
    }

    companion object {
        private const val TAG = "NotificationUpload"
        private const val KEY_APP = "app"
        private const val KEY_TITLE = "title"
        private const val KEY_TEXT = "text"
        private const val KEY_TIME = "time"
        private const val KEY_EVENT_ID = "event_id"
        private const val KEY_OUTPUT_ERROR = "error"
        private const val WORK_TAG = "finance_notification_upload"
        private const val CONNECT_TIMEOUT_MILLIS = 15_000
        private const val READ_TIMEOUT_MILLIS = 15_000
        private const val MAX_RETRY_ATTEMPTS = 4

        fun enqueue(
            context: Context,
            payload: NotificationPayload,
        ): kotlin.Result<Unit> = runCatching {
            val inputData: Data = workDataOf(
                KEY_APP to payload.app,
                KEY_TITLE to payload.title,
                KEY_TEXT to payload.text,
                KEY_TIME to payload.time,
                KEY_EVENT_ID to payload.eventId,
            )
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<NotificationUploadWorker>()
                .setInputData(inputData)
                .setConstraints(constraints)
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    30,
                    TimeUnit.SECONDS,
                )
                .addTag(WORK_TAG)
                .build()

            WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
                "finance-notification-${payload.eventId}",
                ExistingWorkPolicy.KEEP,
                request,
            )
        }
    }
}
