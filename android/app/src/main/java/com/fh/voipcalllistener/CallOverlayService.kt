package com.fh.voipcalllistener

import android.app.Service
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.os.Build
import android.os.IBinder
import android.provider.Settings
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
 * Requires SYSTEM_ALERT_WINDOW permission — the user must grant this once
 * through system Settings. If not granted, show/dismiss are no-ops.
 *
 * Start with ACTION_SHOW to display the banner.
 * Start with ACTION_DISMISS to remove it (call answered / hung up).
 */
class CallOverlayService : Service() {

    companion object {
        private const val TAG = "CallOverlay"

        const val ACTION_SHOW = "com.fh.voipcalllistener.SHOW_OVERLAY"
        const val ACTION_DISMISS = "com.fh.voipcalllistener.DISMISS_OVERLAY"
        const val EXTRA_PHONE_NUMBER = "phone_number"
    }

    private var windowManager: WindowManager? = null
    private var overlayView: LinearLayout? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_SHOW -> {
                val number = intent.getStringExtra(EXTRA_PHONE_NUMBER).orEmpty()
                showOverlay(number)
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

    // ─── overlay helpers ─────────────────────────────────────────────────────

    private fun showOverlay(phoneNumber: String) {
        if (!canDraw()) {
            Log.w(TAG, "SYSTEM_ALERT_WINDOW not granted — overlay skipped")
            return
        }
        if (overlayView != null) dismissOverlay()

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
        overlayView?.let {
            try {
                windowManager?.removeView(it)
            } catch (_: Exception) {}
            overlayView = null
            Log.d(TAG, "Overlay dismissed")
        }
        stopSelf()
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
