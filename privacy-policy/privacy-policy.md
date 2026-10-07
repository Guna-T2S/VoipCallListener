# Privacy Policy for Call2POS

**Application:** Call2POS (Android package ID: `com.call2pos`)
**Developer / Publisher:** Kitchen Control
**Contact:** touch2success.info@gmail.com
**Effective date:** 12 August 2026
**Last updated:** 12 August 2026

---

## 1. Introduction

This Privacy Policy explains how **Kitchen Control** ("we", "us", or "our"), the developer and publisher of the **Call2POS** mobile application ("the App", Android package ID `com.call2pos`), handles information in connection with your use of the App.

Call2POS is a business tool for restaurants and takeaways. It runs on a device used by a restaurant operator, detects incoming telephone calls to that device, reads the caller's phone number, and forwards that number to the restaurant's own Point-of-Sale (POS) platform so that the incoming caller can be identified. The App is not intended for use by members of the general public and is only useful when activated with a valid restaurant account.

> **In short:** Call2POS reads the phone number of an incoming call and sends only that number (plus the store identifier the operator configured) to the restaurant's POS platform. The App does not record calls, does not read your contacts, does not track your location, does not show advertisements, and does not sell your data.

## 2. Information We Process

The App processes the minimum information required to perform its single function:

| Data | Why it is processed | How it is used |
|------|---------------------|----------------|
| Incoming caller phone number | Core function of the App: to identify the customer calling the restaurant. | Read at the moment a call rings and transmitted over an encrypted (HTTPS) connection to the restaurant's configured POS platform. It is not stored on the device by the App. |
| Call state (ringing / idle) | To detect when an incoming call begins so the number can be read. | Used only in memory to trigger the transmission. Not stored or transmitted. |
| Store configuration (store ID, host, restaurant contact number) | Entered or provisioned by the restaurant operator to link the device to the correct POS account. | Stored locally on the device and used to address and authenticate the webhook request. |
| Network connectivity state | To wait for a working internet connection before sending the number. | Used only in memory. Not stored or transmitted. |

**The App does NOT collect, store, or transmit:**

- Your contacts or address book
- Audio recordings or the content of any call — calls are never recorded
- Your call history/log for browsing purposes (the call-log permission is used only to read the number of the current incoming call, as required by Android 10+)
- Your location (GPS or otherwise)
- Advertising identifiers, and the App contains no third-party advertising or analytics SDKs
- Any personal profile, account name, email, or payment information collected by the App itself

## 3. Android Permissions and How They Are Used

The App requests only the permissions strictly necessary for its core function. When a call rings, the operator is shown context explaining why access is required before any sensitive permission is used.

| Permission | Purpose |
|------------|---------|
| `READ_PHONE_STATE` | Detect that an incoming call is ringing. |
| `READ_CALL_LOG` (Android 10+) | Obtain the incoming caller's number, which on modern Android versions is only available through this permission. |
| `INTERNET` / `ACCESS_NETWORK_STATE` | Send the caller number to the restaurant's POS platform and wait for a valid network connection. |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_SPECIAL_USE` | Keep the call-detection service running reliably so calls are not missed when the App is in the background. |
| `RECEIVE_BOOT_COMPLETED` | Restart call detection automatically after the device reboots. |
| `SYSTEM_ALERT_WINDOW` | Optionally display an incoming-call banner over other screens. Must be granted manually by the operator and can be revoked at any time. |

## 4. How Information Is Shared

The incoming caller number is transmitted only to the **restaurant's own POS / caller-identification platform** that the operator configured (the T2S / Foodhub direct webhook endpoint), for the sole purpose of identifying the caller within that restaurant's ordering system. This transfer is:

- Sent over an encrypted HTTPS connection;
- Authenticated using a security key derived from the store's configuration;
- Limited to the caller number and the store identifier — nothing more.

We do **not** sell, rent, or trade any information. We do not share information with advertisers or data brokers. Information may be disclosed only where required by law or to protect the rights, safety, and security of our users and services.

## 5. Data Retention

The App does not maintain its own database of caller numbers on the device. The caller number is held in memory only long enough to transmit it, and store configuration is retained locally until the operator signs out, clears the App's data, or uninstalls the App. Any retention of the caller number after it reaches the POS platform is governed by that platform's own privacy policy and the restaurant's data practices.

## 6. Data Security

All transmissions from the App use HTTPS/TLS encryption. Requests to the POS platform are authenticated with a per-store security key. Because the App stores no caller history on the device, there is no on-device repository of personal data to be exposed. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.

## 7. Children's Privacy

Call2POS is a business tool intended for restaurant operators and is not directed to children under the age of 13 (or the equivalent minimum age in your jurisdiction). We do not knowingly collect personal information from children.

## 8. Your Rights

The App does not store any personal data about callers. It only reads an incoming caller's phone number and transmits it to the restaurant's POS platform; the number is not retained by the App. Depending on your jurisdiction (for example, under the GDPR or UK GDPR), you may have the right to access, correct, or request deletion of your personal data, or to object to or restrict its processing. Because the App keeps no caller records, any such request relating to caller data should be directed to the restaurant and its POS platform, which is the party that stores that data. You can revoke the App's permissions at any time in your device's system settings, and you can remove the locally stored store configuration by clearing the App's data or uninstalling it. To contact us about this policy, use the details below.

## 9. Changes to This Policy

We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Material changes will be reflected here, and your continued use of the App after an update constitutes acceptance of the revised policy.

## 10. Contact Us

If you have questions about this Privacy Policy or the App's data practices, contact:

- **Developer / Publisher:** Kitchen Control
- **Application:** Call2POS (`com.call2pos`)
- **Email:** touch2success.info@gmail.com

---

© 2026 Kitchen Control. All rights reserved. · Call2POS Privacy Policy
