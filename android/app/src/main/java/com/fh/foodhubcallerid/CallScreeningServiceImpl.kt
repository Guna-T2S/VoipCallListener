package com.fh.foodhubcallerid

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import android.util.Log
import androidx.annotation.RequiresApi
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Caller-ID via the supported CallScreeningService API.
 *
 * Once the user grants this app the call-screening role (RoleManager
 * .ROLE_CALL_SCREENING — requested from CallDetectionModule.requestCallScreeningRole),
 * the OS Telecom framework binds this service for EVERY incoming call and starts
 * the app process if it was killed. We receive the caller's number directly from
 * Call.Details.getHandle() — with NO READ_CALL_LOG / READ_PHONE_STATE permissions.
 *
 * We never block or silence the call: respondToCall() is called with an empty,
 * "allow" response so call behaviour is completely unchanged. The number is used
 * only to (a) show the incoming-call banner overlay and (b) notify the takeaway
 * webhook, exactly as the old PHONE_STATE receiver did.
 */
@RequiresApi(Build.VERSION_CODES.N)
class CallScreeningServiceImpl : CallScreeningService() {

    companion object {
        private const val TAG = "CallScreeningSvc"
        private const val WEBHOOK_BASE_URL = "https://falcon-direct.t2sonline.com/event/hook"
        private const val DEDUPE_MS = 3_000L

        @Volatile private var lastCaller = ""
        @Volatile private var lastWebhookAt = 0L
    }

    override fun onScreenCall(callDetails: Call.Details) {
        // 1. Always allow the call through unchanged. Empty builder = no block,
        //    no reject, no silence, no skipping notification.
        respondToCall(callDetails, CallResponse.Builder().build())

        // 2. Only act on incoming calls (callDirection is API 29+; the role that
        //    triggers this service is also API 29+, so this is safe).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
            callDetails.callDirection != Call.Details.DIRECTION_INCOMING
        ) {
            return
        }

        val phoneNumber = callDetails.handle?.schemeSpecificPart?.trim().orEmpty()
        if (phoneNumber.isEmpty()) {
            Log.d(TAG, "Incoming call with no caller number (withheld / unknown)")
            return
        }

        val now = System.currentTimeMillis()
        if (phoneNumber == lastCaller && now - lastWebhookAt < DEDUPE_MS) return
        lastCaller = phoneNumber
        lastWebhookAt = now

        Log.d(TAG, "Incoming call from: $phoneNumber (jsListener=${CallDetectionModule.jsListenerActive})")

        // 3. Show the floating caller-ID banner over whatever is on screen.
        showOverlay(phoneNumber)

        // 4. Deliver to the live JS layer if the app is open; otherwise fire the
        //    webhook natively. The service process is kept alive by the bind, so
        //    a short HTTP GET on a worker thread completes reliably.
        if (CallDetectionModule.canDeliverToJs() &&
            CallDetectionModule.emitIncomingCall(phoneNumber)
        ) {
            Log.d(TAG, "Delivered to JS listener")
            return
        }

        Log.d(TAG, "App killed / no JS listener — sending webhook natively")
        sendWebhookAsync(phoneNumber)
    }

    private fun showOverlay(phoneNumber: String) {
        startService(
            android.content.Intent(this, CallOverlayService::class.java).apply {
                action = CallOverlayService.ACTION_SHOW
                putExtra(CallOverlayService.EXTRA_PHONE_NUMBER, phoneNumber)
            },
        )
    }

    private fun sendWebhookAsync(phoneNumber: String) {
        val takeawayNumber = CallListenerStorage.getTakeawayNumber(this)
        if (takeawayNumber == null) {
            Log.w(TAG, "No takeaway number configured — open the app once after login")
            return
        }
        Thread {
            try {
                val from = sanitizePhone(phoneNumber)
                val to = sanitizePhone(takeawayNumber)
                val webhookUrl =
                    "$WEBHOOK_BASE_URL?from=${URLEncoder.encode(from, "UTF-8")}" +
                        "&to=${URLEncoder.encode(to, "UTF-8")}"
                val conn = (URL(webhookUrl).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 4_000
                    readTimeout = 4_000
                }
                val code = conn.responseCode
                conn.disconnect()
                Log.d(TAG, "Webhook response: $code")
            } catch (e: Exception) {
                Log.e(TAG, "Webhook failed: ${e.message}")
            }
        }.start()
    }

    private fun sanitizePhone(value: String): String =
        value.replace(Regex("[\\s+\\-()]"), "")
}
