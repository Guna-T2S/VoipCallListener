package com.call2pos

import android.util.Log
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.UnknownHostException

/**
 * Performs the webhook GET with retry/backoff.
 *
 * The native webhook fires the instant a call rings, from a background thread.
 * In that window DNS resolution frequently fails transiently:
 *   - packet data is suspended during a voice call on 2G/3G or non-VoLTE 4G,
 *   - a just-spawned / Doze-idle process hasn't warmed its network stack,
 *   - Private DNS (DoT) occasionally misses on the first lookup.
 * All of these recover within a second or two, so a single synchronous attempt
 * loses the race even though the same URL works fine in a browser.
 *
 * UnknownHostException / IOException are retried; other errors bubble up.
 */
object WebhookSender {
    private const val TAG = "WebhookSender"

    /**
     * @return the HTTP status code, or -1 if every attempt failed.
     */
    fun get(
        url: String,
        connectTimeoutMs: Int,
        readTimeoutMs: Int,
        maxAttempts: Int,
        retryDelayMs: Long,
    ): Int {
        var lastError: Exception? = null
        for (attempt in 1..maxAttempts) {
            try {
                val conn = (URL(url).openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = connectTimeoutMs
                    readTimeout = readTimeoutMs
                }
                try {
                    val code = conn.responseCode
                    Log.d(TAG, "Webhook response: $code (attempt $attempt/$maxAttempts)")
                    return code
                } finally {
                    conn.disconnect()
                }
            } catch (e: UnknownHostException) {
                lastError = e
                Log.w(TAG, "DNS not resolvable (attempt $attempt/$maxAttempts): ${e.message}")
            } catch (e: IOException) {
                lastError = e
                Log.w(TAG, "Webhook I/O failure (attempt $attempt/$maxAttempts): ${e.message}")
            }

            if (attempt < maxAttempts) {
                try {
                    Thread.sleep(retryDelayMs * attempt) // linear backoff
                } catch (ie: InterruptedException) {
                    Thread.currentThread().interrupt()
                    break
                }
            }
        }
        Log.e(TAG, "Webhook failed after $maxAttempts attempts: ${lastError?.message}")
        return -1
    }
}
