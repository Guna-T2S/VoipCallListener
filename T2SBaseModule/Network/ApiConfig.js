import { isProd } from "../Utils/helpers";

export const BASE_URL = {
    PRODUCTION_BASE_URL: 'https://api.touch2success.com',
    QA_BASE_URL: 'https://qa-api.t2scdn.com',
    PRE_PROD_URL: 'https://api-preprod.t2sonline.com',
    SIT_BASE_URL: 'https://sit-api.fhcdn.dev',
};

export const IMAGE_URL = {
    LOGIN_IMAGE_URL: '',
    NO_ORDER_IMAGE_URL: '',
    PAYMENT_LOGO: '',
};

export const BASE_API_CONFIG = {
    baseURL: isProd() ? BASE_URL.PRODUCTION_BASE_URL : BASE_URL.SIT_BASE_URL,
    appName: { MY_TAKEAWAY: 'MY-TAKEAWAY' },
};


// DIP (@foodhubglobal/rn-fh-sdk) device identity SDK — env mirrors the API target above:
// release build -> prod, anything else -> SIT. No separate dev target exists for this app.
export const DIP_ENV = isProd() ? 'prod' : 'sit';
export const DIP_DEVICE_TYPE = 'CALL2POS';
// v2 gives each app on the till its own credential; DIP must allowlist this package.
export const DIP_PROTOCOL = 'v2';
