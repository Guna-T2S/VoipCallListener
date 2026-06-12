import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';
import {parseCallerInfo} from '../utils/phoneUtils';

const {CallDetection} = NativeModules;

/**
 * Starts listening for incoming calls on both platforms.
 *
 * Android:
 *   CallScreeningServiceImpl.kt is bound by the OS Telecom framework for every
 *   incoming call once the user grants the call-screening role. It reads the
 *   caller number from Call.Details.getHandle() (no Call Log / Phone
 *   permissions) and emits 'onIncomingCall' into the running JS bridge via
 *   DeviceEventEmitter. If the bridge is not running (app killed), the service
 *   sends the webhook natively.
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
