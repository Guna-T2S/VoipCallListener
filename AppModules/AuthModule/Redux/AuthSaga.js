import { all, put, takeLatest, select, putResolve, call } from '@redux-saga/core/effects';
import { isArrayNonEmpty, isValidElement, isValidString } from 't2sbasemodule/Utils/helpers';
import { login } from '../Utils/AuthNetwork';
import * as AuthTypes from './AuthTypes';
import { NETWORK_CONSTANTS } from 't2sbasemodule/Utils/Constants';
import { LocalizationStrings as LocalizedStrings } from 'appmodules/LocalizationModule/LocalizationStrings';
import { showErrorMessage } from 't2sbasemodule/Network/NetworkHelpers';
import { apiCall } from 't2sbasemodule/Network/SessionManager/Network/SessionNetworkWrapper';
import { LOGIN_API } from 'appmodules/AuthModule/Redux/AuthTypes';
import { addExpiresTimeToCurrentTAList } from 'appmodules/DashboardModule/Utils/DashboardHelper';
import { FEATURE_GATE} from 'mytakeaway/Redux/Actions/Types';
import { formatCallCenterConfig } from 'webmodules/Utils/WebHelpers';
import { isFusionDevice, isNormalDevice, isTabletDevice, isWeb } from 't2sbasemodule/Utils/AppTypeHelper';
import { ACTIVE_STORE_TYPES } from 'appmodules/SelectTakeawayModule/Redux/SelectTakeawayTypes';
import { AdyenTapToPay } from 'appmodules/NativeModules/MYTNativeSupport';

export function* makeLoginCall(action) {
    try {
        const user = yield apiCall(login.makeLoginCall, action);
        if (user?.message !== null && user?.message === NETWORK_CONSTANTS.SUCCESS) {
            // api success
            yield put({ type: AuthTypes.LOGIN_API.LOGIN_USER_SUCCESS, payload: user });
        } else {
            yield put({ type: AuthTypes.LOGIN_API.LOGIN_USER_FAIL, payload: user?.payload });
            showErrorMessage(user?.status === NETWORK_CONSTANTS.ACCESS_DENIED_ERROR_CODE ? user?.message : LocalizedStrings.WENT_WRONG);
        }
    } catch (e) {
        yield put({ type: AuthTypes.LOGIN_API.LOGIN_USER_FAIL, payload: e });
    }
}

export function* makeOtpVerifyCall(action) {
    try {
        const isAutomation = yield select((state) => state.configuratorState.isAutomation);

        action.isAutomation = isAutomation;
        const verifyOtp = yield apiCall(login.verifyOTPNumber, action);
        let takeawayList = verifyOtp?.data;
        if (isArrayNonEmpty(takeawayList)) {
            // api success
            if (isTabletDevice) {
                const countryCode = yield select((state) => state.appState?.countryConfigResponse?.country?.phone_code);
                const data = formatCallCenterConfig(takeawayList, countryCode);
                yield put({ type: FEATURE_GATE.UPDATE_CALL_CENTER_CONFIG, payload: data });
            }

            yield putResolve({ type: AuthTypes.LOGIN_API.OTP_VERIFY_SUCCESS, payload: addExpiresTimeToCurrentTAList(takeawayList) });
            yield put({
                type: AuthTypes.LOGIN_API.SET_SELECTED_TAKEAWAY,
                phone: action.phone,
                takeawayList: addExpiresTimeToCurrentTAList(takeawayList)
            });
        }
    } catch (e) {
        yield put({ type: AuthTypes.LOGIN_API.OTP_VERIFY_FAIL, payload: e });
    }
}

function* registerSelectedTA({ phone, takeawayList }) {
    try {
        const latestSelectedStoreId = yield select((state) => state.appState?.latestSelectedStoreId);
        // const generatedLicenseKey = yield select((state) => state.appState.generatedLicenseKey);
        const settingsResponse = yield select((state) => state.dashboardState.settingsResponse);

        yield put({ type: AuthTypes.LOGIN_API.PERSISTS_PHONE_NUMBER, payload: { phone: phone } }); //persistsMobileNoAction

        const isSingleTA = takeawayList.length === 1;
        const currentActiveStore = takeawayList.find((storeItem) => {
            return (
                storeItem.store_id?.toString() === latestSelectedStoreId?.toString() ||
                storeItem.store_id?.toString() === settingsResponse?.id?.toString()
            );
        });

        const activeStore = isSingleTA ? takeawayList[0] : currentActiveStore;

        //setActiveStoreAction
        yield put({ type: ACTIVE_STORE_TYPES.SET_ACTIVE_STORE, activeStore });

        //getFeatureGateDetailsAction
        yield put({
            type: FEATURE_GATE.GET_FEATURE_GATE_DETAILS,
            countryID: activeStore.country_id
        });


    } catch (e) {
        //error
    }
}

export function* removeDeviceTokenCall(action) {
    try {
        // MYTL-6457 - clear session
        const isAdyenConfiguredTA = yield select((state) => state.featuresState.isAdyenConfiguredTA);
        if (isNormalDevice && !isWeb && isAdyenConfiguredTA) {
            try {
                yield call(AdyenTapToPay.clearSession);
            } catch (e) { }
        }
        // FTP-5307 - logout
        if (!isFusionDevice) {
            const acccessToken = yield select((state) => state.userSessionState.access_token);
            yield apiCall(login.invalidateAccessToken, acccessToken);
        }
        if (isValidString(action.fcmToken) && isValidString(action.apiToken)) {
            yield apiCall(login.removeDeviceTokenCall, action);
        }
        yield put({ type: LOGIN_API.INVALID_SESSION });
    } catch (e) {
        yield put({ type: LOGIN_API.INVALID_SESSION });
    }
}

function* authSaga() {
    yield all([
        takeLatest(AuthTypes.LOGIN_API.ON_LOGGING_IN, makeLoginCall),
        takeLatest(AuthTypes.LOGIN_API.OTP_VERIFY, makeOtpVerifyCall),
        takeLatest(AuthTypes.LOGIN_API.LOGOUT_ACTION, removeDeviceTokenCall),
        takeLatest(AuthTypes.LOGIN_API.SET_SELECTED_TAKEAWAY, registerSelectedTA)
    ]);
}

export default authSaga;
