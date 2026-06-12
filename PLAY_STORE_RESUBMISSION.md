# Play Store Resubmission — Caller-ID Permission Fix

**App:** Foodhub Call Listener (`com.fh.foodhubcallerid`)
**Rejection:** Permissions and APIs that Access Sensitive Information policy (4 issues, 11 Jun 2026)

## Why it was rejected

All four flags came from one permission: **`READ_CALL_LOG`** (plus `READ_PHONE_STATE` / `READ_PHONE_NUMBERS`). These belong to Google's restricted Call Log / Phone permission groups, which are only allowed for apps that are the **default Phone or Assistant handler**. A caller-ID notifier does not qualify, so the reviewer flagged: missing prompt, permissions don't match functionality, no default-handler capability, and couldn't verify the feature.

## What changed in the code

The app no longer requests any restricted permission. The incoming caller number now comes from the **`CallScreeningService` API**, which delivers it via `Call.Details.getHandle()` once the user makes the app their **Caller ID & spam app** (the `ROLE_CALL_SCREENING` role). That role *is* the supported "default handler capability" the rejection asked for.

| Removed | Added |
|---|---|
| `READ_CALL_LOG`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS` | `CallScreeningServiceImpl.kt` (reads number, shows banner, fires webhook) |
| `RECEIVE_BOOT_COMPLETED`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC` | `RoleManager` request flow (`requestCallScreeningRole` / `isCallScreeningRoleHeld`) |
| `CallBroadcastReceiver`, `BootReceiver`, foreground service, HeadlessJS task | Prominent in-app disclosure on the Call Listener screen |

Remaining permissions: `INTERNET` and `SYSTEM_ALERT_WINDOW` (user-granted overlay — not restricted).

## Steps to resubmit

1. **Build a fresh AAB** from this updated code and confirm the merged manifest is clean:
   ```
   cd android && ./gradlew :app:bundleRelease
   unzip -p app/build/outputs/bundle/release/app-release.aab base/manifest/AndroidManifest.xml | grep -i "CALL_LOG\|PHONE_STATE\|PHONE_NUMBERS"
   ```
   The grep must return **nothing**.

2. **Permissions declaration form** (Play Console → App content → *Sensitive app permissions*): since the restricted permissions are gone, the Call Log/Phone declaration no longer applies. Remove/withdraw any prior declaration so it matches the new build.

3. **Privacy policy** must state that the app accesses the incoming caller's number to display caller ID and notify the store, and that it does **not** read call history or store/share the number beyond the webhook. Link it in the Play listing.

4. **App access** (Play Console → App content → *App access*): the app needs a Foodhub login + a store with a configured takeaway number, so the reviewer can't test it blind. Provide:
   - Test login credentials.
   - A store/account already linked to a call-center takeaway number.
   - Step-by-step: log in → open Call Listener → tap "Set as Caller ID app" → grant → place a test call → banner appears and webhook fires.

5. **Demo video** (helps clear "unable to verify core functionality"): screen-record the flow above and link it in the review notes / store listing.

6. Resubmit for review.

## Things to confirm before shipping

- The call-screening role requires **Android 10 (API 29)+**. `minSdkVersion` is currently 24 — on Android 7–9 devices the role prompt won't appear and caller ID won't work. Decide whether to raise `minSdkVersion` to 29 or accept that older devices won't get the feature.
- Test on a physical Android 10+ device: granting the role, an incoming call showing the banner, the webhook firing both with the app open and after it's swiped away.
- Only one app can hold the Caller ID role at a time — granting it replaces the user's current caller-ID app.
