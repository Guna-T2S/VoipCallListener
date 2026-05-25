import { Platform } from 'react-native';

export const isValidElement = (data) => data !== null && data !== undefined;
export const isValidString = (data) => data !== null && data !== undefined && data !== '';
export const isValidNumber = (data) => isValidString(data) && !isNaN(data);
export const isValidArray = (data) => Array.isArray(data);
export const isArrayNonEmpty = (arr) => Array.isArray(arr) && arr.length > 0;
export const isArrayEmpty = (arr) => !Array.isArray(arr) || arr.length === 0;
export const isNonEmptyString = (data) => typeof data === 'string' && data.trim().length > 0;
export const isEmptyString = (data) => !isNonEmptyString(data);
export const isValidNotEmptyString = isNonEmptyString;
export const isStringNotNull = isValidString;

export const safeElementValue = (data, defValue) => isValidElement(data) ? data : defValue;
export const safeStringValue = (data, defaultValue = '') => isValidString(data) ? data : defaultValue;
export const safeIntValue = (value, defaultValue = 0) => {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
};
export const safeFloatValue = (value, decimal = 2) => {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? (0).toFixed(decimal) : parsed.toFixed(decimal);
};
export const parseIntSafeElementValue = (data, defValue) => {
    const parsed = parseInt(data, 10);
    return isNaN(parsed) ? defValue : parsed;
};
export const convertStringToBoolean = (value, def = false) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return def;
};

export const getDeviceOS = () => {
    if (Platform.OS === 'ios') {
        return 'iOS';
    } else {
        return 'ANDROID';
    }
};
export const getAppName = () => 'MY-TAKEAWAY';
export const getPlatformID = () => Platform.OS === 'ios' ? 2 : 1;
export const getProductID = () => 3;

export const keyboardFocus = (ref) => {
    if (ref && ref.focus) ref.focus();
};
export const clearText = (ref) => {
    if (ref && ref.clear) ref.clear();
};

export const firstCharacterUpperCased = (text) => {
    if (!isValidString(text)) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
};

export const getHitSlop = (verticalPadding = 10, horizontalPadding = 10) => ({
    top: verticalPadding,
    bottom: verticalPadding,
    left: horizontalPadding,
    right: horizontalPadding,
});

export const validateRegex = (pattern, data) => {
    if (!isValidString(pattern) || !isValidString(data)) return false;
    return new RegExp(pattern).test(data);
};

export const getUrlPathNames = (url) => {
    if (!isValidString(url)) return [];
    try {
        const parsed = new URL(url);
        return parsed.pathname.split('/').filter(Boolean);
    } catch (e) {
        return [];
    }
};

export const parseValueFromURL = (url, key) => {
    if (!isValidString(url) || !isValidString(key)) return null;
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get(key);
    } catch (e) {
        return null;
    }
};

export const mergeTabletStyle = (mobileStyle, tabletStyle, webStyle) => {
    return { ...mobileStyle };
};

export const onShare = () => {};
export const openLink = () => {};
export const randomStringWithLength = (length) => {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};
