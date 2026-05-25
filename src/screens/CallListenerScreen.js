import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  Alert,
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
import reactotron from 'reactotron-react-native';
import { parseCallerInfo } from '../utils/phoneUtils';

const { CallDetection } = NativeModules;

// ─── Permission request (Android only) ──────────────────────────────────────

const requestAndroidPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  ];
  if (Platform.Version >= 26 && PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS) {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  const allGranted = Object.values(results).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED,
  );

  if (!allGranted) {
    Alert.alert(
      'Permissions Required',
      'Phone state and call log permissions are needed to detect incoming calls.',
    );
  }

  return allGranted;
};

export default function CallListenerScreen() {
  const dispatch = useDispatch();
  const callState = useSelector(state => state.calls);
  const authState = useSelector(state => state.activeStoreState);
  const storeCountryCode = useSelector(state => state.appState?.countryConfigResponse?.country?.iso);
  const cleanupRef = useRef(null);
  const [takeawayNumber, setTakeawayNumber] = useState(null);
  const [overlayGranted, setOverlayGranted] = useState(true);

  useEffect(() => {
    dispatch(callListenerScreenLoaded());
  }, [dispatch]);

  // Check overlay permission on mount and whenever the screen regains focus.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const check = () =>
      CallDetection?.canDrawOverlays?.()
        .then(granted => setOverlayGranted(granted))
        .catch(() => {});
    check();
    // Re-check when the user comes back from system settings.
    const interval = setInterval(check, 2000);
    return () => clearInterval(interval);
  }, []);

  const callCenterConfig = callState.callCenterConfig;
  const activeStoreId = authState.activeStore?.store_id;

  useEffect(() => {
    if (!callCenterConfig || !activeStoreId) return;
    const match = callCenterConfig.find(
      item => String(item.id) === String(activeStoreId),
    );
    if (match) {
      setTakeawayNumber(match.number);
    } else {
      setTakeawayNumber(null);
    }
  }, [callCenterConfig, activeStoreId]);

  // Persist for native killed-state webhook (Android BroadcastReceiver).
  useEffect(() => {
    if (takeawayNumber) {
      persistTakeawayNumberForNative(takeawayNumber);
    } else {
      clearTakeawayNumberForNative();
    }
  }, [takeawayNumber]);

  useEffect(() => {
    if (!takeawayNumber) {
      cleanupRef.current?.();
      cleanupRef.current = null;
      return undefined;
    }

    let mounted = true;

    const init = async () => {
      const granted = await requestAndroidPermissions();
      if (!granted || !mounted) return;

      const handleIncomingCall = (phoneNo) => {
        reactotron.log(`>>>123>>>>phoneNo=${phoneNo}, storeCountryCode=${storeCountryCode}`)
        const {phoneNumber} = parseCallerInfo(phoneNo, storeCountryCode);
        reactotron.log(`>>>123>>>>phoneNumber=${phoneNumber}, takeawayNumber=${takeawayNumber}`)
        dispatch(incomingCallDetected(phoneNumber, takeawayNumber));
      };

      cleanupRef.current = startCallDetection(handleIncomingCall);
    };

    init();

    return () => {
      mounted = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [dispatch, takeawayNumber]);

  const statusColor =
    {
      idle: '#4CAF50',
      sending: '#FF9800',
      success: '#2196F3',
      failure: '#F44336',
    }[callState.webhookStatus] ?? '#4CAF50';

  return (
    <View style={styles.container}>
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

      {/* Overlay permission nudge — only shown when permission is missing */}
      {Platform.OS === 'android' && !overlayGranted && (
        <TouchableOpacity
          style={styles.overlayBanner}
          onPress={() => CallDetection?.requestOverlayPermission?.()}>
          <Text style={styles.overlayBannerText}>
            Enable "Display over other apps" to see call alerts on any screen
          </Text>
          <Text style={styles.overlayBannerAction}>Tap to open Settings</Text>
        </TouchableOpacity>
      )}

      {!takeawayNumber ? (
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoText}>Contact foodhub to activate</Text>
        </View>
      ) : <>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>
            {callState.isIncomingCall ? 'Incoming Call!' : 'Listening...'}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 24,
    paddingTop: 60,
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
  overlayBanner: {
    backgroundColor: '#7C4700',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  overlayBannerText: {
    color: '#FFD580',
    fontSize: 13,
  },
  overlayBannerAction: {
    color: '#FFD580',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
