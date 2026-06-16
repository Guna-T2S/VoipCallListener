# Play Store Rejection Fix Report
**App:** Foodhub Caller ID (`com.fh.foodhubcallerid`)  
**Version:** 1.1 (Build 2)  
**Date:** 2026-06-16  
**Prepared by:** Engineering Team

---

## Rejection Reasons

Google Play rejected the app citing four violations under the **"Permissions and APIs that Access Sensitive Information"** policy:

1. Missing user prompt for permissions access
2. Requested permissions do not match core functionality of the app
3. Issue with default handler capability
4. Unable to verify core functionality of app

---

## Root Cause Analysis

### 1. Missing user prompt for permissions access

The app called `PermissionsAndroid.requestMultiple()` with no rationale or prior explanation. The system permission dialog appeared with zero context, violating Play's requirement that users are informed of *why* a dangerous permission is needed before they are asked to grant it.

**Affected file:** `src/screens/CallListenerScreen.js`

---

### 2. Requested permissions do not match core functionality

Three permissions in the highly scrutinised Phone group — `READ_PHONE_STATE`, `READ_CALL_LOG`, `READ_PHONE_NUMBERS` — plus `SYSTEM_ALERT_WINDOW` were declared without any store description, manifest description, or permission declaration form explaining their use. Reviewers had no way to connect the permissions to the app's functionality.

Additional issues:
- `READ_CALL_LOG` and `READ_PHONE_NUMBERS` were declared for all API levels, even versions where those permissions do not exist or are not required.
- The app had no `android:description` attribute in the manifest.

**Affected files:** `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml`

---

### 3. Issue with default handler capability

Two sub-problems contributed to this rejection:

**a) Wrong foreground service type.** Both `CallListenerForegroundService` and `CallDetectionTaskService` were declared with `foregroundServiceType="dataSync"`. The `dataSync` type is meant for cloud data syncing. Using it for phone call monitoring signalled to Play's automated policy check that the service was operating outside its declared capability.

**b) Service type mismatch crash.** When the foreground service type was corrected to `specialUse` in the manifest, the Kotlin code still called `startForeground()` with `FOREGROUND_SERVICE_TYPE_DATA_SYNC` (value `0x00000001`). Android enforces that the runtime type passed to `startForeground()` must be a bitwise subset of what the manifest declares. Since `0x00000001` is not a subset of `specialUse` (`0x40000000`), the app crashed with:

```
java.lang.IllegalArgumentException: foregroundServiceType 0x00000001 is not a subset
of foregroundServiceType attribute 0x40000000 in service element of manifest file
    at com.fh.foodhubcallerid.CallListenerForegroundService.onCreate(CallListenerForegroundService.kt:67)
```

This caused a crash loop on Android 14+ (API 34+) devices.

**Affected files:** `android/app/src/main/AndroidManifest.xml`, `CallListenerForegroundService.kt`, `CallDetectionTaskService.kt`

---

### 4. Unable to verify core functionality

The app requires a Foodhub restaurant account with a pre-configured takeaway number. Without valid credentials, the entire UI displays only "Contact foodhub to activate". Play reviewers using test accounts could not trigger a single incoming call event and therefore could not verify that any of the declared permissions were used as stated. No test credentials, demo video, or reviewer notes were provided at the time of submission.

**Action required in Play Console only — no code change.**

---

## Code Changes Made

### Change 1 — Bug Fix: Type cast crash on native bridge

**File:** `src/services/callListenerNativeStorage.js` — Line 7

`match.number` from the API response can be a JavaScript Number. When passed over the React Native bridge to a native method expecting `String`, the bridge throws `java.lang.Double cannot be cast to java.lang.String`. Fixed by explicitly coercing to string before the bridge call.

```js
// Before
CallDetection?.setTakeawayNumber?.(number);

// After
CallDetection?.setTakeawayNumber?.(String(number));
```

---

### Change 2 — Pre-permission rationale dialog

**File:** `src/screens/CallListenerScreen.js`

Added `Alert` import and a rationale dialog that fires before the system permission prompt. This satisfies Play's requirement that users are informed of the reason before being asked to grant a dangerous permission.

```js
await new Promise(resolve =>
  Alert.alert(
    'Phone access required',
    'Foodhub Caller ID needs access to your phone state and call log to detect ' +
      'incoming calls and identify the caller number. This information is used only ' +
      'to match the call against your configured store number and is never stored or ' +
      'shared beyond your Foodhub account.',
    [{ text: 'Continue', onPress: resolve }],
    { cancelable: false },
  ),
);
```

---

### Change 3 — Overlay permission explanation dialog

**File:** `src/screens/CallListenerScreen.js`

The "Display over other apps" warning banner previously sent users directly to Settings with no explanation. Now an `Alert` explains the purpose of `SYSTEM_ALERT_WINDOW` and offers a Cancel option before redirecting.

```js
Alert.alert(
  '"Display over other apps" required',
  'To show incoming call alerts on any screen — including the lock screen — ' +
    'Foodhub Caller ID needs permission to display over other apps.\n\n' +
    'Tap "Open Settings", then enable "Display over other apps" for Foodhub Caller ID.',
  [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Open Settings', onPress: () => CallDetection?.requestOverlayPermission?.() },
  ],
);
```

---

### Change 4 — Manifest: app description

**File:** `android/app/src/main/AndroidManifest.xml`  
**File:** `android/app/src/main/res/values/strings.xml`

Added `android:description` to the `<application>` element so Play reviewers and the Android system have a machine-readable explanation of the app's purpose.

```xml
<!-- strings.xml -->
<string name="app_description">Foodhub Caller ID detects incoming calls for restaurant
operators and notifies the Foodhub platform in real time. Requires phone access to
identify customer callers.</string>

<!-- AndroidManifest.xml -->
<application
  android:description="@string/app_description"
  ... >
```

---

### Change 5 — Manifest: permission SDK scoping

**File:** `android/app/src/main/AndroidManifest.xml`

Scoped `READ_CALL_LOG` and `READ_PHONE_NUMBERS` to the API levels where they are actually needed. This reduces the declared permission footprint on older devices and makes the purpose of each permission clearer to reviewers.

```xml
<!-- READ_PHONE_NUMBERS did not exist before API 26 -->
<uses-permission android:name="android.permission.READ_PHONE_NUMBERS"
    android:minSdkVersion="26" />

<!-- EXTRA_INCOMING_NUMBER requires READ_CALL_LOG only on API 29+ -->
<uses-permission android:name="android.permission.READ_CALL_LOG"
    android:minSdkVersion="29" />
```

---

### Change 6 — Manifest: foreground service type

**File:** `android/app/src/main/AndroidManifest.xml`

Changed both foreground services from `dataSync` to `dataSync|specialUse`. The `specialUse` type is the correct declaration for a call-monitoring and webhook service. `dataSync` is retained alongside it for backward compatibility with API 29–33 where `specialUse` was not yet introduced.

The mandatory `<property>` tag with a human-readable subtype description was added to each service, as required by Android and Play Console for `specialUse`.

```xml
<!-- Before -->
android:foregroundServiceType="dataSync"

<!-- After -->
android:foregroundServiceType="dataSync|specialUse"

<!-- New — required for specialUse type -->
<property
    android:name="android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE"
    android:value="Monitors incoming phone calls and sends a webhook notification
    to the Foodhub restaurant platform to identify customer callers." />
```

The per-type foreground service permission was also updated to match:

```xml
<!-- Before -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />

<!-- After -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
```

---

### Change 7 — Crash fix: startForeground() type mismatch

**Files:** `CallListenerForegroundService.kt`, `CallDetectionTaskService.kt`

Both services now pass the correct foreground service type constant to `startForeground()` based on the device API level. This eliminates the crash loop that occurred on Android 14+ devices.

```kotlin
// Before (caused crash on API 34+)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
} else {
    startForeground(NOTIFICATION_ID, notification)
}

// After
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) { // API 34+
    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
} else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {          // API 29–33
    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
} else {
    startForeground(NOTIFICATION_ID, notification)
}
```

---

## Files Modified

| File | Change Type |
|---|---|
| `src/services/callListenerNativeStorage.js` | Bug fix |
| `src/screens/CallListenerScreen.js` | Play Store compliance |
| `android/app/src/main/AndroidManifest.xml` | Play Store compliance + crash fix |
| `android/app/src/main/res/values/strings.xml` | Play Store compliance |
| `android/app/src/main/java/com/fh/foodhubcallerid/CallListenerForegroundService.kt` | Crash fix |
| `android/app/src/main/java/com/fh/foodhubcallerid/CallDetectionTaskService.kt` | Crash fix |

---

## Play Console Actions Required

The following actions must be completed in the [Google Play Console](https://play.google.com/console) before resubmitting the app. These cannot be done in code.

---

### Action 1 — Permission Declarations *(Critical)*

**Location:** Play Console → App content → Sensitive permissions and APIs

Submit a declaration for each restricted permission explaining its exact use.

**READ_CALL_LOG declaration:**
> Required on Android 10 (API 29) and later because `TelephonyManager.EXTRA_INCOMING_NUMBER` is only delivered to apps holding this permission on API 29+. It is used solely to read the incoming caller number when a call is received, in order to notify the Foodhub restaurant platform. The number is not stored, logged, or shared beyond the operator's own Foodhub account.

**SYSTEM_ALERT_WINDOW declaration:**
> Used to display a floating incoming-call banner over the foreground app so restaurant staff can see customer calls without switching apps. The overlay is shown only when an incoming call is detected and dismissed automatically when the call ends or the user interacts with it.

---

### Action 2 — Foreground Service Special Use Declaration *(Critical)*

**Location:** Play Console → App content → Foreground service special use

Required because `foregroundServiceType="specialUse"` is now declared in the manifest. Submit the following justification:

> The foreground service monitors incoming phone calls via the Android `PHONE_STATE` broadcast and sends a real-time webhook notification to the Foodhub restaurant platform to identify customer callers. This use case does not fit any standard foreground service type (mediaPlayback, location, camera, etc.) because it reacts to telephony events and performs a lightweight network call. The service runs only while a store number is actively configured and stops immediately on logout.

---

### Action 3 — Update Store Listing Description

**Location:** Play Console → Store presence → Main store listing → App description

The store listing currently has no description or an insufficient one. Add a clear description that maps the permissions to the app's purpose:

> Foodhub Caller ID is a business tool exclusively for restaurant operators on the Foodhub platform. It automatically detects incoming customer calls and notifies the Foodhub system in real time, helping staff instantly identify orders linked to phone calls.
>
> **How it works:** When a customer calls your registered restaurant number, the app identifies the caller and sends an instant notification to your Foodhub dashboard — even when the app is running in the background or the screen is off.
>
> **Who is this for:** This app is for Foodhub restaurant partners only. A Foodhub account with an active store and configured takeaway number is required. Contact Foodhub support to activate.

---

### Action 4 — Reviewer Notes with Test Credentials *(Critical)*

**Location:** Play Console → Production / Internal Testing → Release → Notes for reviewer

Without credentials, reviewers see only "Contact foodhub to activate" and cannot test any functionality. Provide the following:

> This app requires a Foodhub restaurant operator account.
>
> **Test credentials:**
> - Email: [test account email]
> - Password: [test account password]
>
> **Steps to verify:**
> 1. Open the app and log in with the credentials above.
> 2. Navigate to the Call Listener screen.
> 3. Grant phone and call log permissions when prompted.
> 4. The status badge will change to "Listening…" — this confirms the core feature is active.
> 5. Place a test call to the configured store number to trigger an incoming call detection.
>
> The app requires phone permissions to detect the incoming call number and send a webhook notification to the Foodhub platform.

---

### Action 5 — Data Safety Section

**Location:** Play Console → App content → Data safety

Verify the Data Safety form reflects the actual data handling. Ensure the following is declared:

| Data type | Collected | Purpose | Shared | Encrypted |
|---|---|---|---|---|
| Phone number (caller ID) | Yes | App functionality | No | In transit |
| Store phone number | Yes (on-device only) | App functionality | No | N/A |

- Confirm that no data is sold or used for advertising/tracking.
- Confirm that users can request data deletion (through the Foodhub account deletion flow).

---

## Verification Checklist

Before resubmitting to Play Store, confirm the following:

- [ ] App builds without warnings on `targetSdkVersion 36`
- [ ] App launches without crash on Android 14+ device (API 34+)
- [ ] Permission rationale `Alert` appears before the system dialog on first launch
- [ ] "Display over other apps" `Alert` appears before Settings redirect
- [ ] Foreground service notification "Call Listener Active" appears after granting permissions
- [ ] Incoming call is detected and webhook fires correctly on API 29+ device
- [ ] App works correctly on API 28 device without `READ_CALL_LOG` (uses `READ_PHONE_STATE` only)
- [ ] All Play Console declarations submitted (Actions 1–5 above)
- [ ] Test credentials included in reviewer notes

---

*End of Report*
