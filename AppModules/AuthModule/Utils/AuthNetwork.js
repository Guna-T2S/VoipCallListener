import { getAppName, getDeviceOS, isValidElement } from 't2sbasemodule/Utils/helpers';
import { NETWORK_METHOD } from 't2sbasemodule/Network/SessionManager/Network/SessionConst';

export const login = {
    makeLoginCall: (params) => ({
        method: NETWORK_METHOD.POST,
        url: '/auth/otp',
        data: { phone: params.phone, deviceOS: getDeviceOS(), app_name: getAppName(), type: params.otpType },
        config: { headers: { locale: params.locale, language: params.language } }
    }),
    verifyOTPNumber: (params) => ({
        method: NETWORK_METHOD.POST,
        url: '/auth/otp/verify',
        data: {
            phone: params.phone,
            otp: params.otp,
            deviceOS: getDeviceOS(),
            app_name: getAppName(),
            is_automation: params.isAutomation
        },
        config: { headers: { locale: params.locale, language: params.language } }
    }),
    removeDeviceTokenCall: (params) => ({
        method: NETWORK_METHOD.POST,
        url: `/device_registrations/remove/token?api_token=${params.apiToken}`,
        data: { token: params.fcmToken },
        config: { headers: { locale: params.locale, language: params.language } }
    }),
    invalidateAccessToken: (params) => ({
        method: NETWORK_METHOD.POST,
        url: '/client/logout'
    }),
    getCountryConfiguration: (params) => ({
        method: NETWORK_METHOD.GET,
        url: `/location/initial?app_name=${params.app_name}`,
        config: isValidElement(params.locale)
            ? {
                  headers: { locale: params.locale }
              }
            : undefined
    })
};
