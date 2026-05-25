import { ADDRESS_CONFIG_TYPES, MAKE_GENERIC_FEATURE_CONFIG_ACTION } from "./AppTypes";

export const getCountryConfig = (locale, host, token, shouldUpdateLanguage) => ({
    type: ADDRESS_CONFIG_TYPES.COUNTRY_CONFIG,
    locale,
    host,
    token,
    shouldUpdateLanguage,
});

export const getFeatureGateDetailsAction = (countryID) => ({
    type: 'GET_FEATURE_GATE_DETAILS',
    countryID,
});

export const makeGenericFeatureConfigAction = () => ({
    type: MAKE_GENERIC_FEATURE_CONFIG_ACTION
});
