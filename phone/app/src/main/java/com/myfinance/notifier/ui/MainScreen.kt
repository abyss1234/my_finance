package com.myfinance.notifier.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.myfinance.notifier.model.DeliveryState
import com.myfinance.notifier.model.DeliveryStatus
import com.myfinance.notifier.model.MonitoredApp
import java.text.DateFormat
import java.util.Date

@Composable
fun MainScreen(
    state: MainUiState,
    onEndpointUrlChanged: (String) -> Unit,
    onApiKeyChanged: (String) -> Unit,
    onAppEnabledChanged: (String, Boolean) -> Unit,
    onOpenNotificationSettings: () -> Unit,
    onSaveSettings: () -> Unit,
    onSendTestRequest: () -> Unit,
) {
    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = { AppHeader() },
    ) { contentPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(contentPadding),
            contentAlignment = Alignment.TopCenter,
        ) {
            if (state.isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(top = 64.dp),
                )
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .widthIn(max = 720.dp)
                        .verticalScroll(rememberScrollState())
                        .imePadding()
                        .padding(horizontal = 16.dp, vertical = 20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    SetupStatus(state)

                    state.message?.let {
                        MessageBanner(it)
                    }

                    Section(title = "Notification access") {
                        NotificationAccessSection(
                            enabled = state.notificationAccessEnabled,
                            onOpenSettings = onOpenNotificationSettings,
                        )
                    }

                    Section(title = "Server settings") {
                        ServerSettingsSection(
                            endpointUrl = state.endpointUrl,
                            apiKey = state.apiKey,
                            enabled = !state.isBusy,
                            onEndpointUrlChanged = onEndpointUrlChanged,
                            onApiKeyChanged = onApiKeyChanged,
                        )
                    }

                    Section(title = "Monitored apps") {
                        MonitoredAppsSection(
                            enabledPackageNames = state.enabledPackageNames,
                            enabled = !state.isBusy,
                            onAppEnabledChanged = onAppEnabledChanged,
                        )
                    }

                    Section(title = "Last delivery") {
                        DeliveryStatusSection(state.lastDelivery)
                    }

                    if (state.hasUnsavedChanges) {
                        Text(
                            text = "Settings have unsaved changes.",
                            color = MaterialTheme.colorScheme.secondary,
                            style = MaterialTheme.typography.bodyMedium,
                        )
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                    ) {
                        Button(
                            onClick = onSaveSettings,
                            enabled = !state.isBusy,
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 48.dp),
                        ) {
                            Text(if (state.isBusy) "Working..." else "Save settings")
                        }

                        OutlinedButton(
                            onClick = onSendTestRequest,
                            enabled = !state.isBusy,
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 48.dp),
                        ) {
                            Text("Send test")
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                }
            }
        }
    }
}

@Composable
private fun AppHeader() {
    Surface(
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 1.dp,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 64.dp)
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.Center,
        ) {
            Text(
                text = "Finance Notifier",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "Notification forwarding",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

@Composable
private fun SetupStatus(state: MainUiState) {
    val ready = state.notificationAccessEnabled &&
        state.endpointUrl.isNotBlank() &&
        state.apiKey.isNotBlank()
    val statusColor = if (ready) {
        Color(0xFF087F5B)
    } else {
        Color(0xFFB54708)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                stateDescription = if (ready) "Ready" else "Setup required"
            },
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(statusColor, CircleShape),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = if (ready) "Ready to forward notifications" else "Setup required",
            color = statusColor,
            fontWeight = FontWeight.Medium,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
private fun Section(
    title: String,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(
            width = 1.dp,
            color = MaterialTheme.colorScheme.outlineVariant,
        ),
        shadowElevation = 1.dp,
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            content()
        }
    }
}

@Composable
private fun NotificationAccessSection(
    enabled: Boolean,
    onOpenSettings: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = if (enabled) "Enabled" else "Permission required",
                color = if (enabled) {
                    Color(0xFF087F5B)
                } else {
                    MaterialTheme.colorScheme.error
                },
                fontWeight = FontWeight.Medium,
            )
            Text(
                text = "Required to receive selected app notifications.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodySmall,
            )
        }

        OutlinedButton(
            onClick = onOpenSettings,
            modifier = Modifier.heightIn(min = 48.dp),
        ) {
            Text("Open settings")
        }
    }
}

@Composable
private fun ServerSettingsSection(
    endpointUrl: String,
    apiKey: String,
    enabled: Boolean,
    onEndpointUrlChanged: (String) -> Unit,
    onApiKeyChanged: (String) -> Unit,
) {
    OutlinedTextField(
        value = endpointUrl,
        onValueChange = onEndpointUrlChanged,
        label = { Text("API URL") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri),
        enabled = enabled,
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )

    OutlinedTextField(
        value = apiKey,
        onValueChange = onApiKeyChanged,
        label = { Text("API key") },
        supportingText = { Text("Stored encrypted on this phone.") },
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
        visualTransformation = PasswordVisualTransformation(),
        enabled = enabled,
        singleLine = true,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun MonitoredAppsSection(
    enabledPackageNames: Set<String>,
    enabled: Boolean,
    onAppEnabledChanged: (String, Boolean) -> Unit,
) {
    MonitoredApp.entries.forEachIndexed { index, app ->
        val checked = app.packageName in enabledPackageNames

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .toggleable(
                    value = checked,
                    enabled = enabled,
                    role = Role.Switch,
                    onValueChange = { selected ->
                        onAppEnabledChanged(app.packageName, selected)
                    },
                )
                .padding(vertical = 4.dp)
                .semantics {
                    stateDescription = if (checked) "Enabled" else "Disabled"
                },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = app.displayName,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = app.packageName,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Switch(
                checked = checked,
                onCheckedChange = null,
                enabled = enabled,
            )
        }

        if (index < MonitoredApp.entries.lastIndex) {
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
        }
    }
}

@Composable
private fun DeliveryStatusSection(status: DeliveryStatus) {
    val statusLabel = when (status.state) {
        DeliveryState.NEVER -> "Not sent"
        DeliveryState.QUEUED -> "Queued"
        DeliveryState.SUCCESS -> "Received"
        DeliveryState.ERROR -> "Failed"
    }
    val statusColor = when (status.state) {
        DeliveryState.NEVER -> MaterialTheme.colorScheme.onSurfaceVariant
        DeliveryState.QUEUED -> Color(0xFFB54708)
        DeliveryState.SUCCESS -> Color(0xFF087F5B)
        DeliveryState.ERROR -> MaterialTheme.colorScheme.error
    }
    val formattedTime = remember(status.timestampMillis) {
        status.timestampMillis?.let {
            DateFormat.getDateTimeInstance(
                DateFormat.MEDIUM,
                DateFormat.SHORT,
            ).format(Date(it))
        }
    }

    Row(
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(statusColor, CircleShape),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = statusLabel,
            color = statusColor,
            fontWeight = FontWeight.SemiBold,
        )
    }

    Text(
        text = status.message,
        style = MaterialTheme.typography.bodyMedium,
    )

    formattedTime?.let {
        Text(
            text = it,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            style = MaterialTheme.typography.bodySmall,
        )
    }
}

@Composable
private fun MessageBanner(message: UiMessage) {
    val backgroundColor = when (message.kind) {
        UiMessageKind.INFO -> MaterialTheme.colorScheme.secondaryContainer
        UiMessageKind.SUCCESS -> Color(0xFFE8F7F0)
        UiMessageKind.ERROR -> MaterialTheme.colorScheme.errorContainer
    }
    val contentColor = when (message.kind) {
        UiMessageKind.INFO -> MaterialTheme.colorScheme.onSecondaryContainer
        UiMessageKind.SUCCESS -> Color(0xFF075E45)
        UiMessageKind.ERROR -> MaterialTheme.colorScheme.onErrorContainer
    }

    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(8.dp),
        color = backgroundColor,
        border = BorderStroke(1.dp, contentColor.copy(alpha = 0.25f)),
    ) {
        Text(
            text = message.text,
            color = contentColor,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}
