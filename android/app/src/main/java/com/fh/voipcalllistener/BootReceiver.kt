package com.fh.voipcalllistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Re-starts the foreground service after device reboot so call detection
 * resumes without the user having to open the app.
 *
 * Only acts if a takeaway number was previously saved, which means the user
 * had an active store configured before the reboot.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED &&
            intent.action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        if (CallListenerStorage.getTakeawayNumber(context) == null) return

        ContextCompat.startForegroundService(
            context,
            Intent(context, CallListenerForegroundService::class.java),
        )
    }
}
