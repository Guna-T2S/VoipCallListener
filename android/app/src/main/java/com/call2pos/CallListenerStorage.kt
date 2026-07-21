package com.call2pos

import android.content.Context

object CallListenerStorage {
    private const val PREFS_NAME = "call_listener_prefs"
    private const val KEY_STORE_ID = "store_id"
    private const val KEY_COUNTRY_ISO = "country_iso"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getStoreId(context: Context): String? =
        prefs(context).getString(KEY_STORE_ID, null)

    fun setStoreId(context: Context, storeId: String) {
        prefs(context).edit().putString(KEY_STORE_ID, storeId).apply()
    }

    fun clearStoreId(context: Context) {
        prefs(context).edit().remove(KEY_STORE_ID).apply()
    }

    fun getCountryIso(context: Context): String? =
        prefs(context).getString(KEY_COUNTRY_ISO, null)

    fun setCountryIso(context: Context, iso: String) {
        prefs(context).edit().putString(KEY_COUNTRY_ISO, iso).apply()
    }
}
