package com.voipcalllistener

import android.content.Context

object CallListenerStorage {
    private const val PREFS_NAME = "call_listener_prefs"
    private const val KEY_TAKEAWAY_NUMBER = "takeaway_number"

    fun getTakeawayNumber(context: Context): String? =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TAKEAWAY_NUMBER, null)

    fun setTakeawayNumber(context: Context, number: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TAKEAWAY_NUMBER, number)
            .apply()
    }

    fun clearTakeawayNumber(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .remove(KEY_TAKEAWAY_NUMBER)
            .apply()
    }
}
