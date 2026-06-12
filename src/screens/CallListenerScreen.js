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
  const [roleGranted, setRoleGranted] = useState(true);
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
    if (Platform.OS !== 'android') return;
    const checkOverlay = () =>
      CallDetection?.canDrawOverlays?.()
        .then(granted => setOverlayGranted(granted))
        .catch(() => {});
    const checkRole = () => checkCallScreeningRole().then(setRoleGranted);
    const check = () => {
      checkOverlay();
      checkRole();
    };
    check();
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

  // Persist for the native killed-state webhook (CallScreeningServiceImpl).
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
      // Ask the user to make this the Caller ID app if it isn't already.
      let granted = await checkCallScreeningRole();
      if (!granted) {
        await requestCallScreeningRole();
        granted = await checkCallScreeningRole();
      }
      if (mounted) setRoleGranted(granted);
      if (!granted || !mounted) return;

      const handleIncomingCall = (phoneNo) => {
        const {phoneNumber} = parseCallerInfo(phoneNo, storeCountryCode);
        
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

  const listeningActive =
    Platform.OS !== 'android' || roleGranted;
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

      {Platform.OS === 'android' && !roleGranted && (
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
      {Platform.OS === 'android' && !overlayGranted && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => CallDetection?.requestOverlayPermission?.()}>
          <Text style={styles.warningBannerText}>
            Enable "Display over other apps" to see call alerts on any screen
          </Text>
          <Text style={styles.warningBannerAction}>Tap to open Settings</Text>
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
