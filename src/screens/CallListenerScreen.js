import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  TouchableOpacity,
  NativeModules,
  Linking,
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
import T2SRNModal from '../../T2SBaseModule/CommonUI/components/T2SRNModal';

const { CallDetection } = NativeModules;

const REQUIRED_PHONE_PERMISSIONS = [
  PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
];

const checkRequiredPhonePermissions = async () => {
  if (Platform.OS !== 'android') return true;
  const results = await Promise.all(
    REQUIRED_PHONE_PERMISSIONS.map(p => PermissionsAndroid.check(p)),
  );
  return results.every(Boolean);
};

// ─── Permission request (Android only) ──────────────────────────────────────

const requestAndroidPermissions = async showDisclosure => {
  if (Platform.OS !== 'android') return true;

  if (showDisclosure) {
    await showDisclosure();
  }

  const permissions = [...REQUIRED_PHONE_PERMISSIONS];
  if (Platform.Version >= 26 && PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS) {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_PHONE_NUMBERS);
  }

  const results = await PermissionsAndroid.requestMultiple(permissions);
  return Object.values(results).every(
    r => r === PermissionsAndroid.RESULTS.GRANTED,
  );
};

export default function CallListenerScreen() {
  const dispatch = useDispatch();
  const callState = useSelector(state => state.calls);
  const authState = useSelector(state => state.activeStoreState);
  const storeCountryCode = useSelector(state => state.appState?.countryConfigResponse?.country?.iso);
  const cleanupRef = useRef(null);
  const phonePermissionModalResolveRef = useRef(null);
  const [takeawayNumber, setTakeawayNumber] = useState(null);
  const [overlayGranted, setOverlayGranted] = useState(true);
  const [phonePermissionsGranted, setPhonePermissionsGranted] = useState(true);
  const [showPhonePermissionModal, setShowPhonePermissionModal] = useState(false);
  const [showOverlayPermissionModal, setShowOverlayPermissionModal] = useState(false);
  const [versionLabel, setVersionLabel] = useState('');

  const showPhonePermissionDisclosure = () =>
    new Promise(resolve => {
      phonePermissionModalResolveRef.current = resolve;
      setShowPhonePermissionModal(true);
    });

  const handlePhonePermissionContinue = () => {
    setShowPhonePermissionModal(false);
    phonePermissionModalResolveRef.current?.();
    phonePermissionModalResolveRef.current = null;
  };

  const closeOverlayPermissionModal = () => setShowOverlayPermissionModal(false);

  const handleOpenOverlaySettings = () => {
    setShowOverlayPermissionModal(false);
    CallDetection?.requestOverlayPermission?.();
  };

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

  // Re-check overlay and phone permissions when the user returns from Settings.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const checkOverlay = () =>
      CallDetection?.canDrawOverlays?.()
        .then(granted => setOverlayGranted(granted))
        .catch(() => {});
    const checkPhone = () =>
      checkRequiredPhonePermissions().then(setPhonePermissionsGranted);
    const check = () => {
      checkOverlay();
      checkPhone();
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
      const granted = await requestAndroidPermissions(showPhonePermissionDisclosure);
      const requiredGranted = await checkRequiredPhonePermissions();
      if (mounted) setPhonePermissionsGranted(requiredGranted);
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
    Platform.OS !== 'android' || phonePermissionsGranted;
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

      {Platform.OS === 'android' && !phonePermissionsGranted && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.warningBannerText}>
            Phone and call log access are required to detect incoming calls
          </Text>
          <Text style={styles.warningBannerAction}>Tap to open Settings</Text>
        </TouchableOpacity>
      )}

      {/* Overlay permission nudge — only shown when permission is missing */}
      {Platform.OS === 'android' && !overlayGranted && (
        <TouchableOpacity
          style={styles.warningBanner}
          onPress={() => setShowOverlayPermissionModal(true)}
        >
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

      <T2SRNModal
        isVisible={showPhonePermissionModal}
        onBackdropPress={() => {}}
      >
        <View style={styles.permissionModal}>
          <Text style={styles.permissionModalTitle}>Phone access required</Text>
          <Text style={styles.permissionModalBody}>
            Foodhub Caller ID needs access to your phone state and call log to detect
            incoming calls and identify the caller number. This information is used only
            to match the call against your configured store number and is never stored or
            shared beyond your Foodhub account.
          </Text>
          <TouchableOpacity
            style={styles.permissionModalButton}
            onPress={handlePhonePermissionContinue}
          >
            <Text style={styles.permissionModalButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </T2SRNModal>

      <T2SRNModal
        isVisible={showOverlayPermissionModal}
        onBackdropPress={closeOverlayPermissionModal}
      >
        <View style={styles.permissionModal}>
          <Text style={styles.permissionModalTitle}>
            "Display over other apps" required
          </Text>
          <Text style={styles.permissionModalBody}>
            To show incoming call alerts on any screen — including the lock screen —
            Foodhub Caller ID needs permission to display over other apps.{'\n\n'}
            Tap "Open Settings", then enable "Display over other apps" for Foodhub Caller ID.
          </Text>
          <View style={styles.permissionModalActions}>
            <TouchableOpacity
              style={[styles.permissionModalButton, styles.permissionModalButtonSecondary]}
              onPress={closeOverlayPermissionModal}
            >
              <Text style={styles.permissionModalButtonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.permissionModalButton}
              onPress={handleOpenOverlaySettings}
            >
              <Text style={styles.permissionModalButtonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </T2SRNModal>
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
  permissionModal: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 24,
    maxWidth: 400,
  },
  permissionModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  permissionModalBody: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  permissionModalButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    maxHeight: 50
  },
  permissionModalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#444',
  },
  permissionModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  permissionModalButtonSecondaryText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
});
