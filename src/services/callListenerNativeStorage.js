import { NativeModules } from 'react-native';
import store from '../store';

const { CallDetection } = NativeModules;

export const persistTakeawayNumberForNative = (number) => {
  CallDetection?.setTakeawayNumber?.(String(number));
  const iso = store.getState()?.appState?.countryConfigResponse?.country?.iso;
  if (iso) CallDetection?.setCountryIso?.(iso);
};

export const clearTakeawayNumberForNative = () => {
  CallDetection?.clearTakeawayNumber?.();
};
