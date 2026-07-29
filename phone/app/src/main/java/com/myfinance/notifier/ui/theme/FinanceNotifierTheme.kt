package com.myfinance.notifier.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Color(0xFF111827),
    onPrimary = Color.White,
    secondary = Color(0xFF087F5B),
    background = Color(0xFFF4F5F7),
    surface = Color.White,
    onSurface = Color(0xFF171717),
    error = Color(0xFFB42318),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFF3F4F6),
    onPrimary = Color(0xFF111827),
    secondary = Color(0xFF63D3A9),
    background = Color(0xFF111315),
    surface = Color(0xFF1A1D20),
    onSurface = Color(0xFFF3F4F6),
    error = Color(0xFFFFB4AB),
)

@Composable
fun FinanceNotifierTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors,
        content = content,
    )
}
