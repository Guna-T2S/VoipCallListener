package com.fh.foodhubcallerid

import android.app.role.RoleManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * React Native native module.
 *
 * For iOS: JS calls startListening() to begin CXCallObserver.
 * For Android: a static bridge so CallScreeningServiceImpl can emit
 *   'onIncomingCall' to the live JS context, plus the JS-facing helpers to
 *   request and check the call-screening role.
 */
class CallDetectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        appContext = reactContext
    }

    companion object {
        // Strong reference — ReactApplicationContext is application-scoped so
        // holding it here does not cause a leak, and avoids the GC-under-pressure
        // problem a WeakReference would introduce.
        @Volatile private var appContext: ReactApplicationContext? = null

        /** True while the JS call-listener screen is mounted and ready to receive events. */
        @Volatile var jsListenerActive = false

        fun canDeliverToJs(): Boolean {
            val ready = jsListenerActive && appContext != null
            android.util.Log.d("CallDetectionModule", "canDeliverToJs: jsListenerActive=$jsListenerActive hasContext=${appContext != null} -> $ready")
            return ready
        }

        const val ROLE_REQUEST_CODE = 4711

        /**
         * Called by CallScreeningServiceImpl to push an incoming-call event into
         * the running JS layer. Returns true if the bridge was available and
         * the event was emitted; false means the app is killed / bridge not ready.
         */
        fun emitIncomingCall(phoneNumber: String): Boolean {
            val ctx = appContext ?: run {
                android.util.Log.w("CallDetectionModule", "emitIncomingCall: no context — bridge not ready")
                return false
            }
            return try {
                val params = Arguments.createMap().apply {
                    putString("phoneNumber", phoneNumber)
                }
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onIncomingCall", params)
                true
            } catch (e: Exception) {
                android.util.Log.w("CallDetectionModule", "Emit failed: ${e.message}")
                false
            }
        }
    }

    override fun getName(): String = "CallDetection"

    // startListening / stopListening are used only by iOS (CXCallObserver).
    // On Android, detection is handled by CallScreeningServiceImpl once the
    // user grants the call-screening role.

    @ReactMethod
    fun startListening() {
        // iOS implementation is in CallDetectionModule.swift.
        // No-op on Android — the OS binds CallScreeningServiceImpl automatically.
    }

    @ReactMethod
    fun stopListening() {
        // No-op on Android.
    }

    @ReactMethod
    fun registerJsListener() {
        jsListenerActive = true
    }

    @ReactMethod
    fun unregisterJsListener() {
        jsListenerActive = false
    }

    @ReactMethod
    fun setTakeawayNumber(number: String) {
        // Persist so CallScreeningServiceImpl can fire the webhook natively when
        // the app is killed. No foreground service is needed — the OS binds the
        // call-screening service (and starts the process) for every incoming call.
        CallListenerStorage.setTakeawayNumber(reactContext, number)
    }

    @ReactMethod
    fun clearTakeawayNumber() {
        CallListenerStorage.clearTakeawayNumber(reactContext)
    }

    @ReactMethod
    fun setCountryIso(iso: String) {
        CallListenerStorage.setCountryIso(reactContext, iso)
    }

    // ─── Call-screening role (Android 10+, the compliant caller-ID path) ───────

    /**
     * Resolves true if this app currently holds the call-screening role, i.e.
     * it is the user's selected Caller ID & spam app. Always false below API 29.
     */
    @ReactMethod
    fun isCallScreeningRoleHeld(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.resolve(false)
            return
        }
        val rm = reactContext.getSystemService(RoleManager::class.java)
        val held = rm != null &&
            rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) &&
            rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
        promise.resolve(held)
    }

    /**
     * Launches the system dialog asking the user to make this app the Caller ID
     * & spam app (the call-screening role). Resolves true if the request dialog
     * was shown. The screen polls isCallScreeningRoleHeld() afterwards to detect
     * the outcome. Rejects on unsupported OS versions or when no activity exists.
     */
    @ReactMethod
    fun requestCallScreeningRole(promise: Promise) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            promise.reject("UNSUPPORTED", "Call screening role requires Android 10 (API 29) or higher")
            return
        }
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No foreground activity to launch the role request")
            return
        }
        val rm = reactContext.getSystemService(RoleManager::class.java)
        if (rm == null || !rm.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
            promise.reject("ROLE_UNAVAILABLE", "Call screening role is not available on this device")
            return
        }
        if (rm.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
            promise.resolve(true)
            return
        }
        try {
            val intent = rm.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
            activity.startActivityForResult(intent, ROLE_REQUEST_CODE)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REQUEST_FAILED", e.message, e)
        }
    }

    /** Resolves true if SYSTEM_ALERT_WINDOW is already granted. */
    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            Settings.canDrawOverlays(reactContext)
        else
            true
        promise.resolve(granted)
    }

    /**
     * Opens the system settings screen where the user can toggle
     * "Display over other apps" for this app. No-op if already granted.
     */
    @ReactMethod
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return
        if (Settings.canDrawOverlays(reactContext)) return
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:${reactContext.packageName}"),
        ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }
        reactContext.startActivity(intent)
    }
}
