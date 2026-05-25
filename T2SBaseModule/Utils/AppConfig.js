export const AppConfig = {
    buildConfig: { buildType: 'release' },
    gdpr: { apiToken: '' },
};

export const LANGUAGE = [
    { name: 'English', code: 'en' },
    { name: 'Spanish', code: 'es' },
    { name: 'Chinese', code: 'zh' },
    { name: 'Español', code: 'es' },
];

export const ENGLISH = 'English';
export const EN = 'en';
export const SPANISH = 'Spanish';
export const ES = 'es';
export const CHINESE = 'Chinese';
export const ZH = 'zh';
export const MULTI_TA_ENABLED = false;
export const API_TIMEOUT = 45000;



/// TODO : move to constant files
export const S3_URL_CONSTANTS = {
    CONFIG_CALLCENTER: 'featuregate/config/callcenter',
    FEATUREGATE: 'featuregate',
};

export const S3_INTEGRATION_CONSTANTS = {
    FALCON_LANG_PRODUCT_NAME: 'mytLangAndExtras',
};
