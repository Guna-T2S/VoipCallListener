import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { getBuildNumber, getVersion } from 'react-native-device-info';
import { init, onboard } from '@foodhubglobal/rn-fh-sdk';
import { PRINTER_TYPE } from '@foodhubglobal/foodhub-printer';
import { BASE_API_CONFIG, DIP_DEVICE_TYPE, DIP_ENV, DIP_PROTOCOL } from '../Network/ApiConfig';

const DIP_APP_NAME = BASE_API_CONFIG.appName.MBH_ORDERS;
const isNative = Platform.OS !== 'web';

let initPromise = null;

// onboard() must run after init(); sharing one promise removes the race instead of retrying.
const ensureDipInit = () => {
    if (!initPromise) {
        initPromise = init({
            env: DIP_ENV,
            deviceType: DIP_DEVICE_TYPE,
            protocol: DIP_PROTOCOL,
            appBuildNumber: getBuildNumber()
        }).catch((error) => {
            initPromise = null;
            throw error;
        });
    }
    return initPromise;
};

// Rendered by ActiveStoreSyncComponent. Renders nothing.
const DipSync = () => {
    const dispatch = useDispatch();
    const activeStore = useSelector((state) => state.activeStoreState?.activeStore);
    const storeId = activeStore?.store_id;
    const licenseKey = activeStore?.license_key;

    useEffect(() => {
        if (!isNative) {
            return;
        }
        ensureDipInit().catch(() => {
            // A failed init is retried only when onboard runs again (store/licence change or app relaunch)
        });
    }, []);

    useEffect(() => {
        const hasStore = storeId !== undefined && storeId !== null && String(storeId) !== '';
        const hasLicense = typeof licenseKey === 'string' && licenseKey.trim() !== '';
        if (!isNative || !hasStore || !hasLicense) {
            return undefined;
        }
        let cancelled = false;
        ensureDipInit()
            .then(() =>
                cancelled
                    ? null
                    : onboard({ storeId: String(storeId), deviceType: DIP_DEVICE_TYPE, appName: DIP_APP_NAME, appVersion: getVersion() })
            )
            .then((result) => {
                if (!result || cancelled) {
                    return;
                }
                // Printers can only be registered after onboard; the printer package swallows any DIP error.
                dispatch({ type: PRINTER_TYPE.PRINTER_MODULE_TYPES.SYNC_PRINTERS_TO_DIP });
            })
            .catch(() => {
                // DIP must never block the app; no automatic retry, onboard runs again on the next store/licence change or app relaunch
            });
        return () => {
            cancelled = true;
        };
    }, [storeId, licenseKey, dispatch]);

    return null;
};

export default DipSync;