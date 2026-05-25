import { Alert } from 'react-native';

export const showErrorMessage = (error) => {
    const msg = error && error.message ? error.message : 'Something went wrong';
    Alert.alert('Error', msg);
};

export const showInfoMessage = (message) => {
    Alert.alert('Info', message || '');
};

export const showCustomToastComponent = () => {};
export const logAPIErrorEvent = () => {};
export const parseAPIEndPoint = (url) => url || '';
export const isNetworkError = () => false;
