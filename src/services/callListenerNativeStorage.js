import { NativeModules } from 'react-native';

const { CallDetection } = NativeModules;

export const persistTakeawayNumberForNative = (number) => {
  CallDetection?.setTakeawayNumber?.(number);
};

export const clearTakeawayNumberForNative = () => {
  CallDetection?.clearTakeawayNumber?.();
};
