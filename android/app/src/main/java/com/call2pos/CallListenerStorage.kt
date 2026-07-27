package com.call2pos

import android.content.Context

object CallListenerStorage {
    private const val PREFS_NAME = "call_listener_prefs"
    private const val KEY_STORE_ID = "store_id"
    private const val KEY_COUNTRY_ISO = "country_iso"
    private const val KEY_HOST = "host"
    private const val KEY_CONTACT_NO = "contact_no"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getStoreId(context: Context): String? =
        prefs(context).getString(KEY_STORE_ID, null)

    fun setStoreId(context: Context, storeId: String) {
        prefs(context).edit().putString(KEY_STORE_ID, storeId).apply()
    }

    fun clearStoreId(context: Context) {
        prefs(context).edit()
            .remove(KEY_STORE_ID)
            .remove(KEY_HOST)
            .remove(KEY_CONTACT_NO)
            .apply()
    }

    fun getHost(context: Context): String? =
        prefs(context).getString(KEY_HOST, null)

    fun setHost(context: Context, host: String) {
        prefs(context).edit().putString(KEY_HOST, host).apply()
    }

    fun getContactNo(context: Context): String? =
        prefs(context).getString(KEY_CONTACT_NO, null)

    fun setContactNo(context: Context, contactNo: String) {
        prefs(context).edit().putString(KEY_CONTACT_NO, contactNo).apply()
    }

    fun getCountryIso(context: Context): String? =
        prefs(context).getString(KEY_COUNTRY_ISO, null)

    fun setCountryIso(context: Context, iso: String) {
        prefs(context).edit().putString(KEY_COUNTRY_ISO, iso).apply()
    }
}
