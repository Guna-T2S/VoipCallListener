# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-dontwarn com.facebook.react.**
-dontwarn com.facebook.hermes.**

# Kotlin
-keep class kotlin.** { *; }
-keep class kotlinx.** { *; }
-dontwarn kotlin.**

# App native modules and services
-keep class com.fh.foodhubcallerid.** { *; }

# Keep JS-callable native module method names
-keepclassmembers class * extends com.facebook.react.bridge.ReactContextBaseJavaModule {
    @com.facebook.react.bridge.ReactMethod <methods>;
}

# Keep BroadcastReceiver and Service subclasses (referenced by AndroidManifest)
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.app.Service

# OkHttp / networking (used by React Native fetch)
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
