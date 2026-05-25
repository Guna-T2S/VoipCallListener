package com.fh.voipcalllistener

import android.content.Context

object CallListenerStorage {
    private const val PREFS_NAME = "call_listener_prefs"
    private const val KEY_TAKEAWAY_NUMBER = "takeaway_number"
    private const val KEY_COUNTRY_ISO = "country_iso"

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun getTakeawayNumber(context: Context): String? =
        prefs(context).getString(KEY_TAKEAWAY_NUMBER, null)

    fun setTakeawayNumber(context: Context, number: String) {
        prefs(context).edit().putString(KEY_TAKEAWAY_NUMBER, number).apply()
    }

    fun clearTakeawayNumber(context: Context) {
        prefs(context).edit().remove(KEY_TAKEAWAY_NUMBER).apply()
    }

    fun getCountryIso(context: Context): String? =
        prefs(context).getString(KEY_COUNTRY_ISO, null)

    fun setCountryIso(context: Context, iso: String) {
        prefs(context).edit().putString(KEY_COUNTRY_ISO, iso).apply()
    }
}
