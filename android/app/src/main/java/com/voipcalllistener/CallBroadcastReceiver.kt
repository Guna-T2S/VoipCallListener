package com.voipcalllistener

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log
import androidx.core.content.ContextCompat
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Static BroadcastReceiver declared in AndroidManifest.xml.
 * Fires on every PHONE_STATE change.
 *
 * RINGING  → send webhook + show overlay banner.
 * IDLE / OFFHOOK → dismiss overlay banner.
 *
 * Two-path webhook design:
 *  1. JS bridge running  → DeviceEventEmitter → Redux → Saga → webhook.
 *  2. App killed / no JS → native path (foreground service or goAsync() fallback).
 */
class CallBroadcastReceiver : BroadcastReceiver() {

    companion object {
        private const val TAG = "CallReceiver"
        private const val WEBHOOK_BASE_URL =
            "https://falcon-direct.t2sonline.com/event/hook"
        private const val DEDUPE_MS = 3_000L

        @Volatile
        private var lastWebhookAt = 0L

        @Volatile
        private var lastCaller = ""
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return

        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return

        // Dismiss the overlay when the call is answered or ended.
        if (state == TelephonyManager.EXTRA_STATE_IDLE ||
            state == TelephonyManager.EXTRA_STATE_OFFHOOK
        ) {
            context.startService(
                Intent(context, CallOverlayService::class.java).apply {
                    action = CallOverlayService.ACTION_DISMISS
                },
            )
            return
        }

        if (state != TelephonyManager.EXTRA_STATE_RINGING) return

        val phoneNumber =
            intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)?.trim().orEmpty()

        if (phoneNumber.isEmpty()) {
            // Android often sends RINGING twice: first without number, then with it.
            Log.d(TAG, "RINGING without caller number yet — waiting for follow-up broadcast")
            return
        }

        val now = System.currentTimeMillis()
        if (phoneNumber == lastCaller && now - lastWebhookAt < DEDUPE_MS) {
            return
        }

        Log.d(
            TAG,
            "Incoming call from: $phoneNumber (jsListener=${CallDetectionModule.jsListenerActive})",
        )

        // Show overlay banner over whatever is currently on screen.
        showOverlay(context, phoneNumber)

        // Path 1: JS listener is registered (app on Call Listener screen).
        if (CallDetectionModule.canDeliverToJs()) {
            val emitted = CallDetectionModule.emitIncomingCall(phoneNumber)
            if (emitted) {
                Log.d(TAG, "Delivered to JS listener")
                return
            }
            Log.w(TAG, "JS listener active but emit failed — falling back to native webhook")
        }

        // Path 2: app killed / no JS listener — native webhook.
        Log.d(TAG, "Sending webhook from native (killed / no JS listener)")

        if (CallListenerForegroundService.isRunning) {
            // The foreground service kept the process alive after the app was swiped away.
            // Delegate to it — no goAsync() needed because the process is already live.
            Log.d(TAG, "Delegating to running foreground service")
            context.startService(
                Intent(context, CallListenerForegroundService::class.java).apply {
                    action = CallListenerForegroundService.ACTION_SEND_WEBHOOK
                    putExtra(CallListenerForegroundService.EXTRA_PHONE_NUMBER, phoneNumber)
                },
            )
            lastCaller = phoneNumber
            lastWebhookAt = System.currentTimeMillis()
            return
        }

        // Cold start — launch HeadlessJS so the JS context runs sendCallToWebhook
        // exactly as callSaga does when the app is alive.
        // ACTION_PHONE_STATE_CHANGED (RINGING) is an Android-exempted broadcast that
        // allows starting a foreground service from the background on API 31+.
        Log.d(TAG, "Cold start — starting HeadlessJS task service")
        try {
            ContextCompat.startForegroundService(
                context,
                Intent(context, CallDetectionTaskService::class.java)
                    .putExtra("phoneNumber", phoneNumber),
            )
            lastCaller = phoneNumber
            lastWebhookAt = System.currentTimeMillis()
        } catch (e: Exception) {
            // Last-resort fallback on strict OEMs that block foreground service starts.
            Log.w(TAG, "HeadlessJS start failed (${e.message}) — using goAsync() fallback")
            val pendingResult = goAsync()
            Thread {
                try {
                    sendWebhook(context.applicationContext, phoneNumber)
                    lastCaller = phoneNumber
                    lastWebhookAt = System.currentTimeMillis()
                } finally {
                    pendingResult.finish()
                }
            }.start()
        }
    }

    private fun sendWebhook(context: Context, phoneNumber: String) {
        val takeawayNumber = CallListenerStorage.getTakeawayNumber(context)
        if (takeawayNumber == null) {
            Log.w(TAG, "No takeaway number configured — open Call Listener once after login")
            return
        }

        try {
            val from = sanitizePhone(phoneNumber)
            val to = sanitizePhone(takeawayNumber)
            val webhookUrl =
                "$WEBHOOK_BASE_URL?from=${URLEncoder.encode(from, "UTF-8")}" +
                    "&to=${URLEncoder.encode(to, "UTF-8")}"

            // 4 s each → 8 s worst-case, comfortably within goAsync()'s 10 s budget.
            val conn = (URL(webhookUrl).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 4_000
                readTimeout = 4_000
            }

            val code = conn.responseCode
            conn.disconnect()
            Log.d(TAG, "Direct webhook response: $code")
        } catch (e: Exception) {
            Log.e(TAG, "Direct webhook failed: ${e.message}")
        }
    }

    private fun sanitizePhone(value: String): String {
        return value.replace(Regex("[\\s+\\-()]"), "")
    }

    private fun showOverlay(context: Context, phoneNumber: String) {
        context.startService(
            Intent(context, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_SHOW
                putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            },
        )
    }
}
