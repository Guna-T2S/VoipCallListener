package com.voipcalllistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.telephony.PhoneNumberUtils
import android.telephony.TelephonyManager
import android.util.Log
import java.util.Locale
import androidx.core.app.NotificationCompat
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Persistent foreground service that keeps the process alive while call listening
 * is active. This is the primary fix for the "killed state" problem:
 *
 *  - On standard Android, swiping an app from recents does NOT kill foreground
 *    services. The process stays alive, so CallBroadcastReceiver fires inside the
 *    live process and can send the webhook via this service without needing goAsync().
 *
 *  - On OEM devices (Samsung, Xiaomi, etc.) that force-stop apps on swipe, this
 *    service keeps the process alive because foreground services are protected.
 *
 * Lifecycle:
 *   Start → CallDetectionModule.setTakeawayNumber() (when user selects a store)
 *   Stop  → CallDetectionModule.clearTakeawayNumber() (on logout / store removed)
 *   Auto-restart after boot → BootReceiver
 *
 * START_STICKY ensures Android restarts the service if it's killed by the OS
 * for memory pressure (intent will be null on restart — that's handled below).
 */
class CallListenerForegroundService : Service() {

    companion object {
        private const val TAG = "CallListenerService"
        private const val CHANNEL_ID = "call_listener_channel"
        private const val NOTIFICATION_ID = 1001
        private const val WEBHOOK_BASE_URL =
            "https://falcon-direct.t2sonline.com/event/hook"

        const val ACTION_SEND_WEBHOOK = "com.voipcalllistener.SEND_WEBHOOK"
        const val EXTRA_PHONE_NUMBER = "phone_number"

        /**
         * True while the service's onCreate() has run and onDestroy() has not.
         * CallBroadcastReceiver reads this to decide whether to delegate here
         * (process alive) or fall back to goAsync() (cold start).
         */
        @Volatile
        var isRunning = false
    }

    override fun onCreate() {
        super.onCreate()
        isRunning = true
        createNotificationChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        Log.d(TAG, "Service started — process will survive app swipe")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SEND_WEBHOOK -> {
                val phoneNumber = intent.getStringExtra(EXTRA_PHONE_NUMBER)
                if (!phoneNumber.isNullOrEmpty()) {
                    Thread { sendWebhook(applicationContext, phoneNumber) }.start()
                }
            }
            // null intent = system restarted the service after OOM kill; just keep running
        }
        return START_STICKY
    }

    override fun onDestroy() {
        isRunning = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun sendWebhook(context: Context, phoneNumber: String) {
        val takeawayNumber = CallListenerStorage.getTakeawayNumber(context)
        if (takeawayNumber == null) {
            Log.w(TAG, "No takeaway number configured — skipping webhook")
            return
        }
        try {
            val from = normalizeFromNumber(phoneNumber, context)
            val to = sanitizePhone(takeawayNumber)
            val url =
                "$WEBHOOK_BASE_URL?from=${URLEncoder.encode(from, "UTF-8")}" +
                    "&to=${URLEncoder.encode(to, "UTF-8")}"
            Log.d(TAG, "Calling webhook: $url")
            val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 8_000
                readTimeout = 8_000
            }
            val code = conn.responseCode
            conn.disconnect()
            Log.d(TAG, "Service webhook response: $code")
        } catch (e: Exception) {
            Log.e(TAG, "Service webhook failed: ${e.message}")
        }
    }

    /**
     * Expands a local-format number (leading 0) to E.164 international format
     * using the device's SIM country. Numbers already in international format
     * are returned as-is after sanitizing.
     *
     * Example (SIM country = AU):  0455988815  →  +61455988815
     * Example (SIM country = GB):  07911123456 →  +447911123456
     */
    private fun normalizeFromNumber(raw: String, context: Context): String {
        val cleaned = sanitizePhone(raw)
        if (!cleaned.startsWith("0")) return cleaned
        val countryIso = getBestCountryIso(context)
        return PhoneNumberUtils.formatNumberToE164(cleaned, countryIso) ?: cleaned
    }

    private fun getBestCountryIso(context: Context): String {
       val tm = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

        val simIso = tm?.simCountryIso
        simIso?.takeIf { it.isNotBlank() }?.let { return it.uppercase() }

        val storedIso = CallListenerStorage.getCountryIso(context)
        storedIso?.takeIf { it.isNotBlank() }?.let { return it.uppercase() }
        
        return "unknown"
    }

    private fun sanitizePhone(value: String): String =
        value.replace(Regex("[\\s+\\-()]"), "")

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Listener",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Monitors incoming calls"
                setSound(null, null)
            }
            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call Listener Active")
            .setContentText("Monitoring for incoming calls")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
}
