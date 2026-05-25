import * as AuthTypes from './AuthTypes';

export const loginUserAction = (locale, phone, otpType, language) => {
    return {
        type: AuthTypes.LOGIN_API.ON_LOGGING_IN,
        locale,
        phone,
        otpType,
        language
    };
};

export const otpVerifyAction = (otp, phone, locale, language) => {
    return {
        type: AuthTypes.LOGIN_API.OTP_VERIFY,
        otp,
        phone,
        locale,
        language
    };
};

export const getOtpResponseAction = (apiToken, phone, needMakeActiveStore = false) => {
    return {
        type: AuthTypes.LOGIN_API.GET_OTP_RESPONSE,
        apiToken,
        phone,
        needMakeActiveStore
    };
};

export const resetLoginResponse = () => {
    return {
        type: AuthTypes.LOGIN_API.RESET_LOGIN_RESPONSE
    };
};

export const resetTakeawayListResponse = () => {
    return {
        type: AuthTypes.LOGIN_API.RESET_OTP_RESPONSE
    };
};

export const onLogoutAction = (fcmToken, apiToken) => {
    return {
        type: AuthTypes.LOGIN_API.LOGOUT_ACTION,
        fcmToken,
        apiToken
    };
};

export const startLoadingAction = () => {
    return {
        type: AuthTypes.LOGIN_API.START_LOADING
    };
};

export const stopLoadingAction = () => {
    return {
        type: AuthTypes.LOGIN_API.STOP_LOADING
    };
};

export const setInvalidSessionAction = (value) => {
    return {
        type: AuthTypes.LOGIN_API.INVALID_SESSION_ACTION,
        payload: value
    };
};
export const persistsMobileNoAction = (phone) => {
    return {
        type: AuthTypes.LOGIN_API.PERSISTS_PHONE_NUMBER,
        payload: {
            phone
        }
    };
};
