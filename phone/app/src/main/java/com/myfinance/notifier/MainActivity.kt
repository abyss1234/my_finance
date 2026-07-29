package com.myfinance.notifier

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.myfinance.notifier.ui.MainScreen
import com.myfinance.notifier.ui.MainViewModel
import com.myfinance.notifier.ui.theme.FinanceNotifierTheme

class MainActivity : ComponentActivity() {
    private val viewModel: MainViewModel by viewModels {
        MainViewModel.Factory(applicationContext)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val uiState = viewModel.uiState.collectAsStateWithLifecycle().value

            FinanceNotifierTheme {
                MainScreen(
                    state = uiState,
                    onEndpointUrlChanged = viewModel::onEndpointUrlChanged,
                    onApiKeyChanged = viewModel::onApiKeyChanged,
                    onAppEnabledChanged = viewModel::onAppEnabledChanged,
                    onOpenNotificationSettings = ::openNotificationAccessSettings,
                    onSaveSettings = viewModel::saveSettings,
                    onSendTestRequest = viewModel::sendTestRequest,
                )
            }
        }
    }

    override fun onResume() {
        super.onResume()
        viewModel.refreshNotificationAccess()
    }

    private fun openNotificationAccessSettings() {
        try {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        } catch (_: ActivityNotFoundException) {
            viewModel.reportError(
                "Android could not open the notification access settings."
            )
        } catch (_: SecurityException) {
            viewModel.reportError(
                "Android blocked access to the notification settings."
            )
        }
    }
}
