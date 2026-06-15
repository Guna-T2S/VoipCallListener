import {NativeModules, DeviceEventEmitter, Platform} from 'react-native';

const {CallDetection} = NativeModules;

/**
 * Starts listening for incoming calls on both platforms.
 *
 * Android:
 *   CallScreeningServiceImpl.kt is bound by the OS Telecom framework for every
 *   incoming call once the user grants the call-screening role. It reads the
 *   caller number from Call.Details.getHandle() (no Call Log / Phone
 *   permissions) and emits 'onIncomingCall' into the running JS bridge via
 *   DeviceEventEmitter. The native CallScreeningService always fires the
 *   webhook as well; JS on Android only updates UI to avoid duplicate HTTP.
 *
 * iOS:
 *   CallDetectionModule.swift starts a CXCallObserver and emits 'onIncomingCall'
 *   when a ringing state is detected. startListening() activates the observer.
 *
 * The raw phone number is passed to the callback as-is; callers are responsible
 * for any parsing/formatting they need (e.g. via parseCallerInfo).
 */
export const startCallDetection = (onIncomingCall) => {
  // Both platforms emit 'onIncomingCall' via DeviceEventEmitter.
  const subscription = DeviceEventEmitter.addListener(
    'onIncomingCall',
    event => {
      console.log('[callDetectionService] event received:', event);
      onIncomingCall(event.phoneNumber);
    },
  );

  if (Platform.OS === 'android') {
    // Tells native not to treat a cold-started RN process as "JS ready".
    console.log('[callDetectionService] registerJsListener called');
    CallDetection?.registerJsListener?.();
  } else {
    CallDetection?.startListening?.();
  }

  return () => {
    console.log('[callDetectionService] stopping listener');
    if (Platform.OS === 'android') {
      CallDetection?.unregisterJsListener?.();
    } else {
      CallDetection?.stopListening?.();
    }
    subscription.remove();
  };
};
