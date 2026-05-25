import { all, call, fork, put, select, takeLatest } from '@redux-saga/core/effects';
import { FEATURE_GATE } from "../../../MyTakeaway/Redux/Actions/Types";
import { readS3Config } from "../../../S3ConfigManager/Redux/S3ConfigAction";
import { S3_INTEGRATION_CONSTANTS, S3_URL_CONSTANTS } from "../../../T2SBaseModule/Utils/AppConfig";
import { ADDRESS_CONFIG_TYPES, MAKE_GENERIC_FEATURE_CONFIG_ACTION } from "./AppTypes";
import { getAppName, isValidElement } from '../../../T2SBaseModule/Utils/helpers';
import { isNormalDevice, isWeb } from '../../../T2SBaseModule/Utils/AppTypeHelper';
import { apiCall } from '../../../T2SBaseModule/Network/SessionManager/Network/SessionNetworkWrapper';
import { login } from '../../AuthModule/Utils/AuthNetwork';
import { LOGIN_COUNTRIES } from '../../AuthModule/Utils/AuthConfig';

const COUNTRY_CONFIG_KEY = 'country';

const FALLBACK_COUNTRY_CONFIG_BY_ID = {
    1: { flag: 'gb', iso: 'GB', phone_code: '44' },
    2: { flag: 'ie', iso: 'IE', phone_code: '353' },
    3: { flag: 'au', iso: 'AU', phone_code: '61' },
    4: { flag: 'nz', iso: 'NZ', phone_code: '64' },
    7: { flag: 'us', iso: 'US', phone_code: '1' },
    8: { flag: 'mx', iso: 'MX', phone_code: '52' },
    9: { flag: 'gt', iso: 'GT', phone_code: '502' }
};

const getFallbackCountryConfig = (countryId, locale) => {
    const selectedCountry =
        LOGIN_COUNTRIES.find((country) => country.id === countryId || country.value === locale) || LOGIN_COUNTRIES[0];
    const fallbackConfig = FALLBACK_COUNTRY_CONFIG_BY_ID[selectedCountry.id] || FALLBACK_COUNTRY_CONFIG_BY_ID[LOGIN_COUNTRIES[0].id];

    return {
        [COUNTRY_CONFIG_KEY]: {
            id: selectedCountry.id,
            name: selectedCountry.value,
            locale: selectedCountry.locale,
            ...fallbackConfig
        }
    };
};

function* makeGenericFeatureGateConfigCall() {
    try {
        const storeId = yield select((state) => state.activeStoreState.activeStore.store_id);
        const licenseKey = yield select((state) => state.activeStoreState.activeStore.license_key);
        yield put(
            readS3Config(
                storeId,
                licenseKey,
                S3_URL_CONSTANTS.CONFIG_CALLCENTER,
                null,
                FEATURE_GATE.GET_CONFIG_FEATURE_GATE_DETAILS_SUCCESS,
                null,
                null,
                S3_INTEGRATION_CONSTANTS.FALCON_LANG_PRODUCT_NAME
            )
        );
    } catch (e) {}
}


function* makeFeatureGateAPICall(action) {
    try {
        const storeId = yield select((state) => state.activeStoreState.activeStore.store_id);
        const licenseKey = yield select((state) => state.activeStoreState.activeStore.license_key);
        yield put(
            readS3Config(
                storeId,
                licenseKey,
                `${S3_URL_CONSTANTS.FEATUREGATE}/${action.countryID}/${S3_URL_CONSTANTS.FEATUREGATE}`,
                null,
                FEATURE_GATE.GET_FEATURE_GATE_DETAILS_SUCCESS,
                null,
                null,
                S3_INTEGRATION_CONSTANTS.FALCON_LANG_PRODUCT_NAME
            )
        );
        if (isNormalDevice && isWeb) {
            yield fork(makeGenericFeatureGateConfigCall);
        }
        // if (isMS()) {
        //     yield fork(getConfigTemplate);
        // }
    } catch (e) {
        // No need to handle
    }
}

function* getDefaultCountryConfig(countryId, locale) {
    try {
        const result = getFallbackCountryConfig(countryId, locale);
        if (isValidElement(result)) {
            yield put({
                type: ADDRESS_CONFIG_TYPES.S3_CONFIG_SUCCESS,
                payload: result
            });
        }
    } catch (e) { }
}

function* makeCountryConfig(action) {
    const app_name = getAppName();
    const { locale, region, countryId } = action;
    try {
        const result = yield apiCall(login.getCountryConfiguration, { app_name, locale, region });
        if (isValidElement(result) && Object.prototype.hasOwnProperty.call(result, COUNTRY_CONFIG_KEY)) {
            //MYT-32636 - Checking result have valid data
            yield put({
                type: ADDRESS_CONFIG_TYPES.S3_CONFIG_SUCCESS,
                payload: result
            });
            // if (isValidElement(defaultLanguage)) {
            //     yield put(updateDefaultLanguage(defaultLanguage));
            // } else if (isValidElement(result.language)) {
            //     let languageState = result.language;
            //     let defaultLanguageState = isArrayNonEmpty(getAllLanguages(languageState))
            //         ? getAllLanguages(languageState)[0]
            //         : LANGUAGE[0];
            //     yield put(updateDefaultLanguage(defaultLanguageState));
            // }
        } else {
            yield call(getDefaultCountryConfig, countryId, locale);
        }
        // yield fork(makeGetLocalizationStrings);
    } catch (e) {    
        yield call(getDefaultCountryConfig, countryId, locale);
      
    }
}


export default function* appSaga() {
    yield all([
        takeLatest(MAKE_GENERIC_FEATURE_CONFIG_ACTION, makeGenericFeatureGateConfigCall),
        takeLatest(FEATURE_GATE.GET_FEATURE_GATE_DETAILS, makeFeatureGateAPICall),
        takeLatest(ADDRESS_CONFIG_TYPES.COUNTRY_CONFIG, makeCountryConfig)
    ]);
}