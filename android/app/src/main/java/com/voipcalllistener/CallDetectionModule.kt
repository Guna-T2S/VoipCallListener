package com.voipcalllistener

import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference

/**
 * React Native native module.
 *
 * For iOS: JS calls startListening() to begin CXCallObserver.
 * For Android: used only as a static bridge so CallBroadcastReceiver can
 *   emit 'onIncomingCall' to the live JS context without a foreground service.
 */
class CallDetectionModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        // Keep a weak reference so CallBroadcastReceiver can emit events
        // without holding a strong ref that would prevent GC.
        instanceRef = WeakReference(this)
    }

    companion object {
        @Volatile private var instanceRef: WeakReference<CallDetectionModule>? = null

        /** True while the JS call-listener screen is mounted and ready to receive events. */
        @Volatile var jsListenerActive = false

        fun canDeliverToJs(): Boolean = jsListenerActive && instanceRef?.get() != null

        /**
         * Called by CallBroadcastReceiver to push an incoming-call event into
         * the running JS layer. Returns true if the bridge was available and
         * the event was emitted; false means the app is killed / bridge not ready.
         */
        fun emitIncomingCall(phoneNumber: String): Boolean {
            val module = instanceRef?.get() ?: return false
            return try {
                val params = Arguments.createMap().apply {
                    putString("phoneNumber", phoneNumber)
                }
                module.reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
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
    // On Android the static BroadcastReceiver in the manifest handles detection.

    @ReactMethod
    fun startListening() {
        // iOS implementation is in CallDetectionModule.swift.
        // No-op on Android — manifest receiver is always active.
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
        CallListenerStorage.setTakeawayNumber(reactContext, number)
        ContextCompat.startForegroundService(
            reactContext,
            Intent(reactContext, CallListenerForegroundService::class.java),
        )
    }

    @ReactMethod
    fun clearTakeawayNumber() {
        CallListenerStorage.clearTakeawayNumber(reactContext)
        reactContext.stopService(
            Intent(reactContext, CallListenerForegroundService::class.java),
        )
    }

    @ReactMethod
    fun setCountryIso(iso: String) {
        CallListenerStorage.setCountryIso(reactContext, iso)
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
