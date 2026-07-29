package com.myfinance.notifier.ui

import android.content.Context
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.myfinance.notifier.R
import com.myfinance.notifier.config.ConfigurationValidation
import com.myfinance.notifier.config.ConfigurationValidator
import com.myfinance.notifier.data.SettingsRepository
import com.myfinance.notifier.model.NotificationPayload
import com.myfinance.notifier.network.NotificationUploadWorker
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainViewModel(
    private val applicationContext: Context,
) : ViewModel() {
    private val settingsRepository = SettingsRepository(applicationContext)
    private val _uiState = MutableStateFlow(MainUiState())
    val uiState: StateFlow<MainUiState> = _uiState.asStateFlow()

    init {
        observeSettings()
        refreshNotificationAccess()
    }

    fun onEndpointUrlChanged(value: String) {
        _uiState.update {
            it.copy(
                endpointUrl = value,
                hasUnsavedChanges = true,
                message = null,
            )
        }
    }

    fun onApiKeyChanged(value: String) {
        _uiState.update {
            it.copy(
                apiKey = value,
                hasUnsavedChanges = true,
                message = null,
            )
        }
    }

    fun onAppEnabledChanged(packageName: String, enabled: Boolean) {
        _uiState.update { current ->
            val updatedPackages = current.enabledPackageNames.toMutableSet().apply {
                if (enabled) add(packageName) else remove(packageName)
            }
            current.copy(
                enabledPackageNames = updatedPackages,
                hasUnsavedChanges = true,
                message = null,
            )
        }
    }

    fun saveSettings() {
        val snapshot = _uiState.value
        val validation = validate(snapshot)
        if (validation is ConfigurationValidation.Invalid) {
            showMessage(validation.message, UiMessageKind.ERROR)
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, message = null) }
            val result = saveConfiguration(snapshot)
            result.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            isBusy = false,
                            hasUnsavedChanges = false,
                            message = UiMessage(
                                text = "Settings saved.",
                                kind = UiMessageKind.SUCCESS,
                            ),
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isBusy = false,
                            message = UiMessage(
                                text = "Could not save settings: ${error.safeMessage()}",
                                kind = UiMessageKind.ERROR,
                            ),
                        )
                    }
                },
            )
        }
    }

    fun sendTestRequest() {
        val snapshot = _uiState.value
        val validation = validate(snapshot)
        if (validation is ConfigurationValidation.Invalid) {
            showMessage(validation.message, UiMessageKind.ERROR)
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isBusy = true, message = null) }
            val saveResult = saveConfiguration(snapshot)
            if (saveResult.isFailure) {
                val error = saveResult.exceptionOrNull()
                _uiState.update {
                    it.copy(
                        isBusy = false,
                        message = UiMessage(
                            text = "Could not save settings: ${error.safeMessage()}",
                            kind = UiMessageKind.ERROR,
                        ),
                    )
                }
                return@launch
            }

            val timestamp = System.currentTimeMillis()
            val payload = NotificationPayload(
                app = "Finance Notifier",
                title = "Connection Test",
                text = "Finance Notifier connection test.",
                time = timestamp.toString(),
                eventId = UUID.randomUUID().toString(),
            )
            val enqueueResult = NotificationUploadWorker.enqueue(
                applicationContext,
                payload,
            )

            enqueueResult.fold(
                onSuccess = {
                    _uiState.update {
                        it.copy(
                            isBusy = false,
                            hasUnsavedChanges = false,
                            message = UiMessage(
                                text = "Test request queued.",
                                kind = UiMessageKind.INFO,
                            ),
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isBusy = false,
                            message = UiMessage(
                                text = "Could not queue test request: ${error.safeMessage()}",
                                kind = UiMessageKind.ERROR,
                            ),
                        )
                    }
                },
            )
        }
    }

    fun refreshNotificationAccess() {
        val enabled = NotificationManagerCompat
            .getEnabledListenerPackages(applicationContext)
            .contains(applicationContext.packageName)

        _uiState.update {
            it.copy(notificationAccessEnabled = enabled)
        }
    }

    fun reportError(message: String) {
        showMessage(message, UiMessageKind.ERROR)
    }

    private fun observeSettings() {
        viewModelScope.launch {
            settingsRepository.observeSettings().collect { result ->
                result.fold(
                    onSuccess = { settings ->
                        _uiState.update { current ->
                            if (current.hasUnsavedChanges && !current.isLoading) {
                                current.copy(
                                    isLoading = false,
                                    lastDelivery = settings.lastDelivery,
                                )
                            } else {
                                current.copy(
                                    isLoading = false,
                                    endpointUrl = settings.endpointUrl,
                                    apiKey = settings.apiKey,
                                    enabledPackageNames = settings.enabledPackageNames,
                                    lastDelivery = settings.lastDelivery,
                                )
                            }
                        }
                    },
                    onFailure = { error ->
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                message = UiMessage(
                                    text = "Could not load settings: ${error.safeMessage()}",
                                    kind = UiMessageKind.ERROR,
                                ),
                            )
                        }
                    },
                )
            }
        }
    }

    private fun validate(state: MainUiState): ConfigurationValidation =
        ConfigurationValidator.validate(
            endpointUrl = state.endpointUrl,
            apiKey = state.apiKey,
            allowHttp = applicationContext.resources.getBoolean(R.bool.allow_http_endpoint),
        )

    private suspend fun saveConfiguration(state: MainUiState): Result<Unit> =
        withContext(Dispatchers.IO) {
            settingsRepository.saveConfiguration(
                endpointUrl = state.endpointUrl,
                apiKey = state.apiKey,
                enabledPackageNames = state.enabledPackageNames,
            )
        }

    private fun showMessage(text: String, kind: UiMessageKind) {
        _uiState.update {
            it.copy(message = UiMessage(text = text, kind = kind))
        }
    }

    private fun Throwable?.safeMessage(): String =
        this?.message?.take(160)?.takeIf { it.isNotBlank() }
            ?: this?.javaClass?.simpleName
            ?: "Unknown error"

    class Factory(
        private val applicationContext: Context,
    ) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(MainViewModel::class.java)) {
                return MainViewModel(applicationContext) as T
            }
            throw IllegalArgumentException("Unsupported ViewModel: ${modelClass.name}")
        }
    }
}
