package com.myfinance.notifier.model

enum class MonitoredApp(
    val displayName: String,
    val packageName: String,
) {
    MAE(
        displayName = "MAE",
        packageName = "com.maybank2u.life",
    ),
    TNG_EWALLET(
        displayName = "TNG eWallet",
        packageName = "my.com.tngdigital.ewallet",
    ),
    CIMB_OCTO(
        displayName = "CIMB OCTO MY",
        packageName = "com.cimb.cimbocto",
    );

    companion object {
        val allPackageNames: Set<String> = entries.mapTo(mutableSetOf()) { it.packageName }

        fun fromPackageName(packageName: String): MonitoredApp? =
            entries.firstOrNull { it.packageName == packageName }
    }
}
