import { NativeModules } from 'react-native';
import store from '../store';

const { CallDetection } = NativeModules;

export const persistStoreIdForNative = (storeId, host, contactNo) => {
  CallDetection?.setStoreId?.(String(storeId));
  // host + contact_no are required natively to rebuild the webhook s_key
  // (sha256(`${id}|${host}|${contact_no}`)) on the killed/background path.
  if (host != null) CallDetection?.setHost?.(String(host));
  if (contactNo != null) CallDetection?.setContactNo?.(String(contactNo));
  const iso = store.getState()?.appState?.countryConfigResponse?.country?.iso;
  if (iso) CallDetection?.setCountryIso?.(iso);
};

export const clearStoreIdForNative = () => {
  CallDetection?.clearStoreId?.();
};
