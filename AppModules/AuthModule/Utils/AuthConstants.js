import { AppIcon } from 't2sbasemodule/Utils/AppIcon';

export const SCREEN_NAME = {
    LOGIN_SCREEN: 'LoginScreen',
    OTP_SCREEN: 'OTPScreen',
};

export const VIEW_ID = {
    GENERATE_OTP: 'generate_otp',
    MAIN_VIEW: 'main_view',
    WELCOME: 'welcome',
    REGISTER_WITH_US: 'register_with_us',
    CLOSE_BUTTON_TOUCHABLE: 'close_button_touchable',
    CLOSE_BUTTON: 'close_button',
    TERMS_AND_CONDITION_TITLE: 'terms_and_condition_title',
    PRIVACY_POLICY: 'privacy_policy',
    OTP_INPUT_FIELD: 'otp_input_field',
    RESEND_OTP: 'resend_otp',
    RESEND_OTP_ICON: 'resend_otp_icon',
    RESEND_OTP_TEXT: 'resend_otp_text',
    CALL_ME_INSTEAD: 'call_me_instead',
    CALL_ME_INSTEAD_ICON: 'call_me_instead_icon',
    CALL_ME_INSTEAD_TEXT: 'call_me_instead_text',
    BACK_BUTTON_OTP: 'back_button_otp',
    ENABLED: '_enabled',
};

export const EVENT_LOG = {
    OTP_CLICKED_EVENT: 'otp_clicked',
    GENERATE_OTP_ACTION: 'generate_otp_action',
};

export const OTP_TYPE = {
    SMS: 'sms',
    CALL: 'call',
};

export const ICONS = {
    SMS_ICON: AppIcon.Sms_Filled || 'SMS',
    CALL_ICON: AppIcon.Call_Filled || 'Call',
};

export const CONSTANTS = {
    PHONE_NUM_NOT_ASSOCIATED: 'Phone number not associated',
    INVALID_AUTH: 'Invalid authentication',
    OTP_EXPIRED: 'OTP expired',
    DEFAULT_SELECTED_COUNTRY: 'gb',
};

export const GDPR_CONSTANTS = {
    TERMS_AND_CONDITIONS: 'https://www.foodhub.com/terms',
    PRIVACY_POLICY: 'https://www.foodhub.com/privacy',
};

export const FUSION_AUTO_LOGIN = {
    HOST: '',
    PLATFORM: '',
    NAME: '',
};

export const SIGN_UP_URL = {
    SIGNUP_PROD_URL: '',
    SIGNUP_SIT_URL: '',
};
