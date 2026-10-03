package com.call2pos

import java.security.MessageDigest

/**
 * Builds the webhook security key appended to the URL as &s_key=.
 *
 * Must stay byte-for-byte identical to the JS implementation in
 * src/services/webhookService.js:
 *
 *   s_key = sha256(`${id}|${host}|${contact_no}`) as a lowercase hex digest
 *
 * so that webhooks sent from the native killed/background path pass the same
 * signature validation as the ones sent from the JS (foreground) path.
 */
object WebhookSigner {
    fun buildSecurityKey(id: String?, host: String?, contactNo: String?): String {
        val payload = "${id.orEmpty()}|${host.orEmpty()}|${contactNo.orEmpty()}"
        val bytes = MessageDigest.getInstance("SHA-256")
            .digest(payload.toByteArray(Charsets.UTF_8))
        return bytes.joinToString("") { "%02x".format(it) }
    }
}
