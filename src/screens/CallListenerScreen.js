import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  NativeModules,
} from 'react-native';

import { useDispatch, useSelector } from 'react-redux';
import {
  incomingCallDetected,
  callListenerScreenLoaded,
} from '../actions/callActions';
import { startCallDetection } from '../services/callDetectionService';
import {
  persistTakeawayNumberForNative,
  clearTakeawayNumberForNative,
} from '../services/callListenerNativeStorage';
import { onLogoutAction } from 'appmodules/AuthModule/Redux/AuthActions';
import { parseCallerInfo } from '../utils/phoneUtils';
import { getVersion, getBuildNumber } from 'react-native-device-info';
import { SafeAreaView } from 'react-native-safe-area-context';

const { CallDetection } = NativeModules;

const ANDROID_CALL_SCREENING_MIN_API = 29;

const isAndroidCallScreeningSupported = () =>
  Platform.OS !== 'android' || Platform.Version >= ANDROID_CALL_SCREENING_MIN_API;

// ─── Call-screening role (Android only) ─────────────────────────────────────
// The caller number is obtained from the CallScreeningService API, which
// requires this app to be the user's selected "Caller ID & spam" app. This
// replaces the old READ_CALL_LOG / READ_PHONE_STATE permissions, which Google
// Play restricts to default Phone / Assistant apps.

const checkCallScreeningRole = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    return await CallDetection?.isCallScreeningRoleHeld?.();
  } catch {
    return false;
  }
};

const requestCallScreeningRole = async () => {
  if (Platform.OS !== 'android') return true;
  try {
    await CallDetection?.requestCallScreeningRole?.();
    return true;
  } catch {
    return false;
  }
};

export default function CallListenerScreen() {
  const dispatch = useDispatch();
  const callState = useSelector(state => state.calls);
  const authState = useSelector(state => state.activeStoreState);
  const storeCountryCode = useSelector(state => state.appState?.countryConfigResponse?.country?.iso);
  const cleanupRef = useRef(null);
  const [takeawayNumber, setTakeawayNumber] = useState(null);
  const [overlayGranted, setOverlayGranted] = useState(true);
  const [roleGranted, setRoleGranted] = useState(
    Platform.OS !== 'android' || isAndroidCallScreeningSupported(),
  );
  const [versionLabel, setVersionLabel] = useState('');

  useEffect(() => {
    dispatch(callListenerScreenLoaded());
  }, [dispatch]);

  useEffect(() => {
    Promise.all([getVersion(), getBuildNumber()])
      .then(([version, build]) => {
        setVersionLabel(`V ${version} - ${build}`);
      })
      .catch(() => {});
  }, []);

  // Re-check overlay permission and the call-screening role when the user
  // returns from the system dialog / settings.
  useEffect(() => {
    if (Platform.OS !== 'android' || !isAndroidCallScreeningSupported()) return;
    const checkOverlay = () =>
      CallDetection?.canDrawOverlays?.()
        .then(granted => setOverlayGranted(granted))
        .catch(() => {});
    const checkRole = () => checkCallScreeningRole().then(granted => {
      console.log('[CallListener] role check:', granted);
      setRoleGranted(granted);
    });
    const check = () => {
      checkOverlay();
      checkRole();
    };
    check();
    // const interval = setInterval(check, 2000);
    // return () => clearInterval(interval);
  }, []);

  const callCenterConfig = callState.callCenterConfig;
  const activeStoreId = authState.activeStore?.store_id;

  useEffect(() => {
    if (!callCenterConfig || !activeStoreId) {
      console.log('[CallListener] config not ready:', { hasConfig: !!callCenterConfig, activeStoreId });
      return;
    }
    const match = callCenterConfig.find(
      item => String(item.id) === String(activeStoreId),
    );
    console.log('[CallListener] config match:', match, 'storeId:', activeStoreId);
    if (match?.number) {
      setTakeawayNumber(String(match.number));
    } else {
      setTakeawayNumber(null);
    }
  }, [callCenterConfig, activeStoreId]);

  // Persist for the native killed-state webhook (CallScreeningServiceImpl).
  useEffect(() => {
    if (takeawayNumber) {
      persistTakeawayNumberForNative(takeawayNumber);
    } else {
      clearTakeawayNumberForNative();
    }
  }, [takeawayNumber]);

  // Request the call-screening role once whenever takeawayNumber becomes available.
  // Role grant/deny is detected by the polling interval above; this effect only
  // triggers the one-time ask.
  useEffect(() => {
    if (Platform.OS !== 'android' || !takeawayNumber || !isAndroidCallScreeningSupported()) return;
    let mounted = true;
    checkCallScreeningRole().then(granted => {
      if (!granted && mounted) requestCallScreeningRole();
    });
    return () => { mounted = false; };
  }, [takeawayNumber]);

  // Start the DeviceEventEmitter subscription whenever takeawayNumber is available.
  // Not gated on roleGranted — the native CallScreeningService decides whether to
  // emit; JS just needs to be ready to receive.
  useEffect(() => {
    console.log('[CallListener] listener effect:', { takeawayNumber });
    if (!takeawayNumber) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return undefined;
    }

    console.log('[CallListener] starting call detection');
    const handleIncomingCall = (phoneNo) => {
      console.log('[CallListener] incoming call received:', phoneNo);
      const {phoneNumber} = parseCallerInfo(phoneNo, storeCountryCode);
      dispatch(incomingCallDetected(phoneNumber, takeawayNumber));
    };

    cleanupRef.current = startCallDetection(handleIncomingCall);

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [dispatch, takeawayNumber, storeCountryCode]);

  const listeningActive =
    (Platform.OS !== 'android' || roleGranted) && isAndroidCallScreeningSupported();
  const configError = callState.configError;
  const configLoading = callState.configLoading;
  const statusColor = !listeningActive
    ? '#FF9800'
    : {
        idle: '#4CAF50',
        sending: '#FF9800',
        success: '#2196F3',
        failure: '#F44336',
      }[callState.webhookStatus] ?? '#4CAF50';

  return (
    <SafeAreaView style={styles.container} >
      <View style={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Call Listener</Text>
          {authState.activeStore && (
            <Text style={styles.storeName}>{authState.activeStore.name}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            clearTakeawayNumberForNative();
            dispatch(onLogoutAction());
          }}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'android' && !isAndroidCallScreeningSupported() && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningBannerText}>
            Call Listener requires Android 10 or later. This device is running
            Android {Platform.Version}, which does not support the Caller ID
            screening API.
          </Text>
        </View>
      )}

      {Platform.OS === 'android' && isAndroidCallScreeningSupported() && !roleGranted && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => CallDetection?.requestCallScreeningRole?.()}
        >
          <Text style={styles.warningBannerText}>
            Set Foodhub as your Caller ID app to show incoming takeaway calls.
            We use the caller number only to display the caller and notify your
            store — we never read your call history or block calls.
          </Text>
          <Text style={styles.warningBannerAction}>Tap to set as Caller ID app</Text>
        </TouchableOpacity>
      )}

      {/* Overlay permission nudge — only shown when permission is missing */}
      {Platform.OS === 'android' && isAndroidCallScreeningSupported() && !overlayGranted && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => CallDetection?.requestOverlayPermission?.()}>
          <Text style={styles.warningBannerText}>
            Enable "Display over other apps" to see call alerts on any screen
          </Text>
          <Text style={styles.warningBannerAction}>Tap to open Settings</Text>
        </TouchableOpacity>
      )}

      {configError ? (
        <View style={styles.infoTextContainer}>
          <Text style={styles.errorText}>Could not load call center config</Text>
          <Text style={styles.errorDetail}>{configError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => dispatch(callListenerScreenLoaded())}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : configLoading && !callCenterConfig ? (
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>Loading configuration...</Text>
        </View>
      ) : !takeawayNumber ? (
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>Contact foodhub to activate</Text>
        </View>
      ) : <>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {callState.isIncomingCall
              ? 'Incoming Call!'
              : listeningActive
                ? 'Listening...'
                : 'Permissions required'}
          </Text>
        </View>


        {/* Current call */}
        {callState.currentCall && (
          <View style={styles.callInfo}>
            <Text style={styles.label}>Number</Text>
            <Text style={styles.value}>{callState.currentCall.phoneNumber}</Text>
            <Text style={styles.label}>Country</Text>
            <Text style={styles.value}>{callState.currentCall.countryCode}</Text>
            <Text style={styles.label}>Webhook</Text>
            <Text style={styles.value}>{callState.webhookStatus}</Text>
          </View>
        )}

        {/* Call history */}
        <Text style={styles.historyTitle}>
          Recent ({callState.callHistory.length})
        </Text>
        {callState.callHistory
          .slice(-5)
          .reverse()
          .map((entry, idx) => (
            <View key={idx} style={styles.historyEntry}>
              <Text style={styles.historyText}>
                {entry.phoneNumber} [{entry.countryCode}] – {entry.status}
              </Text>
            </View>
          ))}
      </>}
      </View>

      {versionLabel ? (
        <Text style={styles.versionText}>{versionLabel}</Text>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
  },
  content: {
    flex: 1,
  },
  versionText: {
    color: '#555',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#fff' },
  storeName: { fontSize: 13, color: '#888', marginTop: 3 },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  logoutText: { color: '#aaa', fontSize: 13 },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  statusText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  callInfo: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  value: { color: '#fff', fontSize: 16, fontWeight: '500' },
  historyTitle: {
    color: '#888',
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyEntry: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  historyText: { color: '#ccc', fontSize: 13 },
  infoTextContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorDetail: {
    color: '#aaa',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  warningBanner: {
    backgroundColor: '#7C4700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningBannerText: {
    color: '#FFD580',
    fontSize: 13,
  },
  warningBannerAction: {
    color: '#FFD580',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
