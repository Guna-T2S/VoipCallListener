import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';
import {parseCallerInfo} from '../utils/phoneUtils';

const {CallDetection} = NativeModules;

/**
 * Starts listening for incoming calls on both platforms.
 *
 * Android:
 *   CallBroadcastReceiver.kt (static manifest receiver) fires on RINGING state
 *   and emits 'onIncomingCall' directly into the running JS bridge via
 *   DeviceEventEmitter. No foreground service is involved — this avoids
 *   ForegroundServiceStartNotAllowedException on API 31+ which fires when the
 *   incoming-call screen overlays the app and Android demotes it to background.
 *   If the bridge is not running (app killed), Kotlin sends the webhook directly.
 *
 * iOS:
 *   CallDetectionModule.swift starts a CXCallObserver and emits 'onIncomingCall'
 *   when a ringing state is detected. startListening() activates the observer.
 */
export const startCallDetection = (onIncomingCall, storeCountryCode) => {
  // Both platforms emit 'onIncomingCall' via DeviceEventEmitter.
  const subscription = DeviceEventEmitter.addListener(
    'onIncomingCall',
    event => {
      const {phoneNumber, countryCode} = parseCallerInfo(event.phoneNumber, storeCountryCode);
      onIncomingCall(phoneNumber, countryCode);
    },
  );

  if (Platform.OS === 'android') {
    // Tells native not to treat a cold-started RN process as "JS ready".
    CallDetection?.registerJsListener?.();
  } else {
    CallDetection?.startListening?.();
  }

  return () => {
    if (Platform.OS === 'android') {
      CallDetection?.unregisterJsListener?.();
    } else {
      CallDetection?.stopListening?.();
    }
    subscription.remove();
  };
};
