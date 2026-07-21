import { NativeModules } from 'react-native';
import store from '../store';

const { CallDetection } = NativeModules;

export const persistStoreIdForNative = (storeId) => {
  CallDetection?.setStoreId?.(String(storeId));
  const iso = store.getState()?.appState?.countryConfigResponse?.country?.iso;
  if (iso) CallDetection?.setCountryIso?.(iso);
};

export const clearStoreIdForNative = () => {
  CallDetection?.clearStoreId?.();
};
