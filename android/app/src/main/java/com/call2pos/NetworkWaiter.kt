package com.call2pos

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Blocks the calling (background) thread until Android reports a validated internet
 * network, or until a timeout elapses.
 *
 * The native webhook fires the instant a call rings, when the packet-data path is
 * momentarily unavailable (radio re-establishing data after the RINGING broadcast,
 * VoLTE data resuming, DNS warming). Rather than blindly retrying with fixed sleeps,
 * we wait for the OS to signal a usable network and then send immediately — adapting
 * to the real recovery time.
 *
 * Uses passive registerNetworkCallback (needs only ACCESS_NETWORK_STATE; works on
 * minSdk 24). Both callers already run on their own background Thread, so blocking
 * here is safe.
 */
object NetworkWaiter {
    private const val TAG = "NetworkWaiter"

    /**
     * @return true if a validated internet network is (or becomes) available within
     *   timeoutMs; false on timeout. Callers should still attempt the send on false
     *   as a last-ditch effort.
     */
    fun awaitValidatedInternet(context: Context, timeoutMs: Long): Boolean {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
            ?: return true // Can't check — don't block the send.

        if (hasValidatedInternet(cm)) {
            Log.d(TAG, "Network already validated — sending immediately")
            return true
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()

        val latch = CountDownLatch(1)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                if (hasValidatedInternet(cm)) latch.countDown()
            }

            override fun onCapabilitiesChanged(
                network: Network,
                capabilities: NetworkCapabilities,
            ) {
                if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
                    capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
                ) {
                    latch.countDown()
                }
            }
        }

        return try {
            cm.registerNetworkCallback(request, callback)
            // Re-check after registering to close the race where the network came up
            // between the initial check and callback registration.
            if (hasValidatedInternet(cm)) {
                Log.d(TAG, "Network validated (post-register) — sending")
                true
            } else {
                val available = latch.await(timeoutMs, TimeUnit.MILLISECONDS)
                Log.d(
                    TAG,
                    if (available) "Network became available — sending"
                    else "Timed out after ${timeoutMs}ms waiting for network — trying anyway",
                )
                available
            }
        } catch (e: Exception) {
            Log.w(TAG, "Network wait failed (${e.message}) — trying send anyway")
            true
        } finally {
            try {
                cm.unregisterNetworkCallback(callback)
            } catch (_: Exception) {
                // Already unregistered / never registered — ignore.
            }
        }
    }

    private fun hasValidatedInternet(cm: ConnectivityManager): Boolean {
        val network = cm.activeNetwork ?: return false
        val caps = cm.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
            caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
    }
}
