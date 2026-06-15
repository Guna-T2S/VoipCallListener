package com.fh.foodhubcallerid

import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import android.util.Log
import android.view.Gravity
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Draws a small floating banner over whatever is on screen (including the
 * system incoming-call UI) when a call is detected, then auto-removes it
 * when the call ends.
 *
 * Dismissal has two layers:
 *  1. TelephonyCallback.CallStateListener (API 31+, requires READ_BASIC_PHONE_STATE
 *     on API 33+ / READ_PHONE_STATE on API 31-32). Dismisses as soon as the
 *     call transitions to OFFHOOK (answered) or IDLE (rejected/missed).
 *  2. 30-second safety timer — fires if the state listener is unavailable or
 *     if the callback is never delivered.
 *
 * Requires SYSTEM_ALERT_WINDOW permission for the overlay window.
 *
 * Start with ACTION_SHOW to display or refresh the banner.
 * Start with ACTION_DISMISS to remove it immediately.
 */
class CallOverlayService : Service() {

    companion object {
        private const val TAG = "CallOverlay"

        const val ACTION_SHOW = "com.fh.foodhubcallerid.SHOW_OVERLAY"
        const val ACTION_DISMISS = "com.fh.foodhubcallerid.DISMISS_OVERLAY"
        const val EXTRA_PHONE_NUMBER = "phone_number"

        private const val AUTO_DISMISS_MS = 30_000L
    }

    private var windowManager: WindowManager? = null
    private var overlayView: LinearLayout? = null

    private val handler = Handler(Looper.getMainLooper())
    private val autoDismiss = Runnable { dismissOverlay() }

    // Stored as Any? so the field declaration itself doesn't reference
    // TelephonyCallback at the class level on API < 31.
    private var callStateCallback: Any? = null

    // ─── lifecycle ───────────────────────────────────────────────────────────

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val number = intent.getStringExtra(EXTRA_PHONE_NUMBER).orEmpty()
                // Update the overlay view WITHOUT stopping the service first.
                // (Calling the old dismissOverlay() here would invoke stopSelf(),
                // which triggered onDestroy() and removed the freshly-added view
                // before it could be seen — the second-call bug.)
                updateOverlayView(number)
                registerCallStateListener()
                handler.removeCallbacks(autoDismiss)
                handler.postDelayed(autoDismiss, AUTO_DISMISS_MS)
            }
            ACTION_DISMISS -> dismissOverlay()
        }
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        dismissOverlay()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ─── overlay ─────────────────────────────────────────────────────────────

    private fun updateOverlayView(phoneNumber: String) {
        if (!canDraw()) {
            Log.w(TAG, "SYSTEM_ALERT_WINDOW not granted — overlay skipped")
            return
        }
        // Remove any existing view without stopping the service.
        overlayView?.let {
            try { windowManager?.removeView(it) } catch (_: Exception) {}
            overlayView = null
        }

        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val takeawayNumber = CallListenerStorage.getTakeawayNumber(this)
        val bannerView = buildBanner(phoneNumber, takeawayNumber)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            overlayType(),
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
            y = 120
        }

        overlayView = bannerView
        windowManager?.addView(bannerView, params)
        Log.d(TAG, "Overlay shown for $phoneNumber")
    }

    private fun dismissOverlay() {
        // Idempotent: if already dismissed, do nothing.
        val view = overlayView ?: return
        handler.removeCallbacks(autoDismiss)
        unregisterCallStateListener()
        overlayView = null
        try { windowManager?.removeView(view) } catch (_: Exception) {}
        Log.d(TAG, "Overlay dismissed")
        stopSelf()
    }

    // ─── call-state listener (auto-dismiss when answered / rejected) ──────────

    private fun registerCallStateListener() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        if (callStateCallback != null) return // already registered for this call
        try {
            val tm = getSystemService(TelephonyManager::class.java) ?: return
            val cb = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                override fun onCallStateChanged(state: Int) {
                    Log.d(TAG, "callState=$state")
                    if (state == TelephonyManager.CALL_STATE_IDLE ||
                        state == TelephonyManager.CALL_STATE_OFFHOOK
                    ) {
                        dismissOverlay()
                    }
                }
            }
            callStateCallback = cb
            tm.registerTelephonyCallback(mainExecutor, cb)
            Log.d(TAG, "Call state listener registered")
        } catch (e: Exception) {
            // SecurityException on API 31-32 without READ_PHONE_STATE — the
            // 30-second timer acts as fallback.
            Log.w(TAG, "registerCallStateListener: ${e.message} — timer fallback active")
        }
    }

    private fun unregisterCallStateListener() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return
        val cb = callStateCallback as? TelephonyCallback ?: return
        try {
            getSystemService(TelephonyManager::class.java)?.unregisterTelephonyCallback(cb)
        } catch (_: Exception) {}
        callStateCallback = null
    }

    // ─── view construction ───────────────────────────────────────────────────

    private fun buildBanner(phoneNumber: String, takeawayNumber: String?): LinearLayout {
        val dp = resources.displayMetrics.density

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#E61565C0"))
            val pad = (14 * dp).toInt()
            setPadding(pad, (10 * dp).toInt(), pad, (10 * dp).toInt())
        }

        val title = TextView(this).apply {
            text = "Incoming Call"
            setTextColor(Color.WHITE)
            textSize = 11f
            setTypeface(typeface, Typeface.BOLD)
            letterSpacing = 0.1f
        }

        val number = TextView(this).apply {
            text = phoneNumber.ifEmpty { "Unknown number" }
            setTextColor(Color.WHITE)
            textSize = 16f
            setTypeface(typeface, Typeface.BOLD)
        }

        container.addView(title)
        container.addView(number)

        if (!takeawayNumber.isNullOrBlank()) {
            val store = TextView(this).apply {
                text = "Store: $takeawayNumber"
                setTextColor(Color.parseColor("#B3FFFFFF"))
                textSize = 12f
            }
            container.addView(store)
        }

        return container
    }

    // ─── utils ───────────────────────────────────────────────────────────────

    private fun canDraw(): Boolean =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(this)
        else true

    @Suppress("DEPRECATION")
    private fun overlayType(): Int =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else
            WindowManager.LayoutParams.TYPE_PHONE
}
