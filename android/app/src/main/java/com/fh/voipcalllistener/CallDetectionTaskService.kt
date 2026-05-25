package com.fh.voipcalllistener

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * HeadlessJS task service that invokes the JS "CallDetectionTask" background task.
 * The JS task receives the caller phone number and dispatches to the Redux store/Saga.
 *
 * Uses foregroundServiceType="dataSync" (declared in the manifest).
 * "phoneCall" type is restricted to default-dialer apps on Android 14+ and must not be used.
 */
class CallDetectionTaskService : HeadlessJsTaskService() {

    companion object {
        private const val CHANNEL_ID = "call_detection_channel"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        val notification = buildNotification()

        // Android 10+ (API 29): startForeground must include the service type to match
        // the foregroundServiceType declared in the manifest.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val phoneNumber = intent?.getStringExtra("phoneNumber")
            ?.takeIf { it.isNotBlank() } ?: return null

        // Read the persisted takeaway number so the JS task can call sendCallToWebhook.
        val takeawayNumber = CallListenerStorage.getTakeawayNumber(this) ?: return null

        val taskData = Arguments.createMap().apply {
            putString("phoneNumber", phoneNumber)
            putString("takeawayNumber", takeawayNumber)
        }

        return HeadlessJsTaskConfig(
            "CallDetectionTask", // matches AppRegistry.registerHeadlessTask in index.js
            taskData,
            10_000, // 10 s — enough for the axios call in sendCallToWebhook
            true,   // allowed while app is in foreground too
        )
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Call Detection",
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Monitors incoming calls"
                setSound(null, null)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Call Listener Active")
            .setContentText("Monitoring for incoming calls")
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .build()
    }
}
