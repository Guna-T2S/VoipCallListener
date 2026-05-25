import { all, call, put, putResolve, select, takeEvery, takeLatest } from 'redux-saga/effects';
import { apiCall } from 't2sbasemodule/Network/SessionManager/Network/SessionNetworkWrapper';
import { s3ConfigNetwork } from '../Network/S3ConfigNetwork';
import { S3CONFIG_TYPES } from './S3ConfigType';
import { AWS_APP_CONFIG, LOG_LEVEL, S3_ACCESS_TYPES, S3_ERROR_CONSTANTS, s3ConfigConstants } from '../Utils/Constants';
import {
    getAuditData,
    getFileExtension,
    getFileType,
    isValidElement,
    isValidString,
    saveCurrentData,
    updateLocalizationStrings
} from '../Utils/S3Helper';
import qs from 'qs';
import { PaymentTypes } from 'appmodules/PaymentModule/Redux/PaymentTypes';
import { getMacAddress } from 'react-native-device-info';
import { getDefaultOrderIdPosition, getDefaultOrderNumberPosition } from 'appmodules/StoreSettingsModule/Utils/StoreSettingsHelper';
import { isFusionDevice, isWeb, isIos, isTabletDevice } from 't2sbasemodule/Utils/AppTypeHelper';
import {
    getAppInfoForS3,
    getBrowserName,
    getDeviceSerialNumber,
    isArrayNonEmpty,
    isSunmiWithAndroidVersionAboveOrEqualToEleven,
    isUSTakeaway,
    isValidNumber,
    safeElementValue
} from 't2sbasemodule/Utils/helpers';
import { PRINT_CONFIG_VALUES } from 'appmodules/PrinterConfig/Util/PrinterConfigConstants';
import { S3_TAKEAWAY_SPECIFIC_FILE, S3_RECEIPT_SPECIFIC_FILE, S3_USER_SPECIFIC_FILE } from 't2sbasemodule/Utils/Constants';
import { FEATURES_ACTION_TYPE } from 'appmodules/FeaturesModule/Redux/FeaturesType';
import { S3_URL_CONSTANTS } from 't2sbasemodule/Utils/AppConfig';
import { updateTemplateReceiptPayload } from 'appmodules/PrinterConfig/Util/PrinterConfigHelper';
import { S3_AUDIT_LOG } from 't2sbasemodule/Utils/Constants';
import { CONFIG_CONSTANTS } from 'appmodules/StoreSettingsModule/Utils/StoreSettingsConstants';

export function* readS3DataThroughSignedURL(action) {
    const { storeId, licenseKey, fileName, generatedLicenseKey = null } = action;
    try {
        let isDeviceSpecific = fileName === generatedLicenseKey;
        let isReceipt = fileName === S3_RECEIPT_SPECIFIC_FILE;
        let isS3AuditLog = fileName === S3_AUDIT_LOG;
        let isUserSpecificFile = action?.extraParams?.fileType === S3_USER_SPECIFIC_FILE;
        if (isValidElement(action)) {
            action.isDeviceSpecific = isDeviceSpecific;
        }
        const activePDQSerialNumber = yield select((state) => state.featuresState.activePDQSerialNumber);
        const settingsCountryId = yield select((state) => state.dashboardState.settingsResponse?.country?.id);
        const genLicenseKey = yield select((state) => state.appState.generatedLicenseKey);
        const deviceSerialNumber = yield select((state) => state.appState.deviceDetails?.serialNumber);
        let updatedFileWithSerialNumber = yield select((state) => state.s3ConfigState.updatedFileWithSerialNumber);
        let signedUrlToRead = yield call(checkAndGetPreSignedURLExpiry, action);
        let config;
        if (isValidElement(signedUrlToRead)) {
            try {
                config = yield apiCall(s3ConfigNetwork.readSignedURL, signedUrlToRead.url);
                if (isUserSpecificFile) {
                    yield put({ type: S3CONFIG_TYPES.READ_USER_SPECIFIC_DYNAMIC_CONFIG_SUCCESS, payload: config });
                } else if (isS3AuditLog) {
                    yield put({ type: S3CONFIG_TYPES.ADD_S3_AUDIT_LOG, payload: config });
                } else if (isReceipt) {
                    const mapSafeValuesForTemplates = config?.map((template) => updateTemplateReceiptPayload(template));
                    yield put({ type: S3CONFIG_TYPES.READ_S3_CONFIG_RECEIPTS_SUCCESS, config: mapSafeValuesForTemplates });
                } else if (isValidElement(action?.productName)) {
                    if (action?.extraParams?.key === S3_URL_CONSTANTS.LANGUAGE && isValidElement(config)) {
                        updateLocalizationStrings(action?.extraParams?.languageCode, config);
                    } else {
                        yield putResolve({ type: action?.actionType, config, extraParams: action?.extraParams });
                    }
                } else if (!isDeviceSpecific) {
                    if (isFusionDevice) {
                        if (!isValidElement(config?.userManagementAdvancedEnabled)) {
                            config.userManagementAdvancedEnabled = isUSTakeaway(settingsCountryId);
                        }

                        yield put({ type: S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_SUCCESS, config, settingsCountryId });
                    } else {
                        yield put({ type: S3CONFIG_TYPES.READ_NON_FUSION_S3_CONFIG_SUCCESS, config });
                    }
                    let updatedConfig = yield call(checkAndUpdateNewTAConfig, config);
                    if (updatedConfig?.updateS3Config) {
                        yield call(writeToS3WithSignedURL, {
                            storeId: storeId,
                            licenseKey: licenseKey,
                            fileName: fileName,
                            data: updatedConfig.config
                        });
                    }
                    if (isValidString(generatedLicenseKey)) {
                        yield call(readS3DataThroughSignedURL, {
                            storeId: storeId,
                            licenseKey: licenseKey,
                            fileName: generatedLicenseKey,
                            generatedLicenseKey: generatedLicenseKey
                        });
                    }

                    if (isIos && !isTabletDevice) {
                        yield put({
                            type: FEATURES_ACTION_TYPE.TAP_TO_PAY_ENABLED,
                            payload: safeElementValue(config?.isTapToPayEnabled, false)
                        });
                        yield put({
                            type: FEATURES_ACTION_TYPE.TAP_TO_PAY_S3_READ_SUCCESS,
                            payload: true
                        });
                    }
                } else {
                    //to get the updated Config with the newly added keys
                    let updatedConfig = yield call(checkAndUpdateNewDeviceConfig, config, settingsCountryId, storeId);
                    // write to the file if there is any new keys to be included
                    // or if it is sunmi device with android version >= 11 and the file name is generatedLicenseKey
                    if (
                        updatedConfig.updateS3Config ||
                        (isSunmiWithAndroidVersionAboveOrEqualToEleven() &&
                            action?.fileName === genLicenseKey &&
                            !updatedFileWithSerialNumber)
                    ) {
                        action.updatedConfig = updatedConfig.config;
                        action.fileName = isSunmiWithAndroidVersionAboveOrEqualToEleven() ? deviceSerialNumber : genLicenseKey;
                        yield call(UpdateLatestOrDoMigrationWithSerailNumberAsFileName, action);
                    }
                    const countryId = yield select((state) => state.dashboardState.settingsResponse?.country?.id);
                    const oldMultiTakeawayStoreId = yield select((state) => state?.settingsReducer?.multiTakeawayStoreId);
                    const oldMultiTAEnabled = yield select((state) => state?.settingsReducer?.multiTAEnabled);

                    let multiTAData = {
                        oldMultiTakeawayStoreId,
                        oldMultiTAEnabled
                    };
                    yield put({
                        type: S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_SUCCESS,
                        config,
                        countryId,
                        multiTAData,
                        s3Type: 'READ'
                    });
                    if (isValidElement(config?.activePDQSerialNumber) && config?.activePDQSerialNumber !== activePDQSerialNumber) {
                        yield put({
                            type: PaymentTypes.PAYMENT_REPORT.FETCH_A920_DEVICE_SERIALNO,
                            token: licenseKey
                        });
                    }
                }
            } catch (e) {
                if (isValidElement(action?.productName) && isValidElement(action?.failureAction)) {
                    yield put({ type: action?.failureAction, payload: e.type, extraParams: action?.extraParams });
                    return;
                }
                if (e.type === s3ConfigConstants.API_ERROR) {
                    if (isS3AuditLog) {
                        yield put({
                            type: S3CONFIG_TYPES.ADD_S3_AUDIT_LOG,
                            payload: {
                                config: null
                            }
                        });
                    }
                    if (action?.extraParams?.fileType === S3_USER_SPECIFIC_FILE) {
                        yield put({
                            type: S3CONFIG_TYPES.READ_USER_SPECIFIC_DYNAMIC_CONFIG_STATUS,
                            payload: { status: s3ConfigConstants.FAILED }
                        });
                    } else if (isReceipt) {
                        yield put({
                            type: S3CONFIG_TYPES.READ_S3_CONFIG_RECEIPTS_STATUS,
                            payload: {
                                status: s3ConfigConstants.FAILED
                            }
                        });
                    } else if (!isValidElement(action?.productName)) {
                        if (!isDeviceSpecific) {
                            yield put({
                                type: S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_STATUS,
                                payload: s3ConfigConstants.FAILED
                            });
                            if (isValidString(generatedLicenseKey)) {
                                yield call(readS3DataThroughSignedURL, {
                                    storeId: storeId,
                                    licenseKey: licenseKey,
                                    fileName: generatedLicenseKey,
                                    generatedLicenseKey: generatedLicenseKey
                                });
                            }
                        } else {
                            // if the device is sunmi and android version is above 11, get old data from old device specific file
                            // and update to the new file name with serial number
                            if (
                                isSunmiWithAndroidVersionAboveOrEqualToEleven() &&
                                action?.fileName === deviceSerialNumber &&
                                !updatedFileWithSerialNumber
                            ) {
                                yield put({
                                    type: S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_STATUS,
                                    payload: {
                                        status: s3ConfigConstants.FAILED,
                                        config: null
                                    }
                                });
                                if (deviceSerialNumber !== generatedLicenseKey) {
                                    yield call(getDataFromOldDeviceSpecificFile, action);
                                }
                            } else {
                                yield put({
                                    type: S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_STATUS,
                                    payload: {
                                        status: s3ConfigConstants.FAILED,
                                        config: null
                                    }
                                });
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        if (!S3_ERROR_CONSTANTS.FHLOGS) {
            // error logs to local file
            yield put({
                type: S3CONFIG_TYPES.LOG_S3_ERROR,
                payload: { level: LOG_LEVEL.ERROR, type: S3_ERROR_CONSTANTS.ERROR_TYPE_READ, message: e }
            });
        } else {
            // Handle FH error logs here and set S3_ERROR_CONSTANTS.FHLOGS to true in constants
        }
    }
}

export function* writeToS3WithSignedURL(action) {
    try {
        const {
            storeId,
            licenseKey,
            data,
            fileName,
            isDeviceSpecific = false,
            isLogFile = false,
            doLocalUpdateOnSuccess = false,
            isUserSpecificFile = '',
            configName,
            isS3AuditLog,
            publishedFromVersion,
            isDeviceAndTASpecific = false
        } = action;
        const loggedInStaff = yield select((state) => state.settingsReducer.loggedInStaff?.name);
        const settingsTimeZone = yield select((state) => state.dashboardState.settingsResponse?.region?.time_zone);
        let deviceSerialNumber = isSunmiWithAndroidVersionAboveOrEqualToEleven()
            ? yield select((state) => state.appState.deviceDetails?.serialNumber)
            : null;
        let isReceipt = fileName === S3_RECEIPT_SPECIFIC_FILE;

        let signedUrlToWrite = yield apiCall(
            s3ConfigNetwork.getS3SignedURL,
            storeId,
            licenseKey,
            S3_ACCESS_TYPES.WRITE,
            getFileExtension(fileName, isLogFile),
            AWS_APP_CONFIG.PRODUCT_NAME,
            getFileType(isLogFile)
        );
        let s3ConfigAuditLog = null;
        if (isS3AuditLog) {
            try {
                const signedUrlToRead = yield call(checkAndGetPreSignedURLExpiry, action);
                s3ConfigAuditLog = yield apiCall(s3ConfigNetwork.readSignedURL, signedUrlToRead.url);
            } catch {
                s3ConfigAuditLog = {};
            }
        }
        const dataToSave = isS3AuditLog
            ? getAuditData(data, configName, s3ConfigAuditLog, loggedInStaff, publishedFromVersion, settingsTimeZone, isDeviceAndTASpecific)
            : data;
        if (isValidElement(signedUrlToWrite?.url)) {
            yield apiCall(s3ConfigNetwork.writeToSignedURL, signedUrlToWrite.url, dataToSave);
            if (!isLogFile) {
                if (isUserSpecificFile) {
                    yield put({
                        type: S3CONFIG_TYPES.READ_USER_SPECIFIC_DYNAMIC_CONFIG_STATUS,
                        payload: {
                            status: s3ConfigConstants.SUCCESS,
                            config: data
                        }
                    });
                    yield put({
                        type: S3CONFIG_TYPES.READ_USER_SPECIFIC_DYNAMIC_CONFIG_SUCCESS,
                        payload: data
                    });
                } else if (isReceipt) {
                    yield put({
                        type: S3CONFIG_TYPES.READ_S3_CONFIG_RECEIPTS_STATUS,
                        payload: {
                            status: s3ConfigConstants.SUCCESS,
                            config: data
                        }
                    });
                    if (doLocalUpdateOnSuccess) {
                        yield put({ type: S3CONFIG_TYPES.READ_S3_CONFIG_RECEIPTS_SUCCESS, config: data });
                    }
                } else if (isDeviceSpecific) {
                    const oldMultiTakeawayStoreId = yield select((state) => state?.settingsReducer?.multiTakeawayStoreId);
                    const oldMultiTAEnabled = yield select((state) => state?.settingsReducer?.multiTAEnabled);
                    let multiTAData = {
                        oldMultiTakeawayStoreId,
                        oldMultiTAEnabled
                    };

                    yield put({
                        type: S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_STATUS,
                        payload: {
                            status: s3ConfigConstants.SUCCESS,
                            config: data,
                            multiTAData
                        }
                    });
                    if (isValidElement(deviceSerialNumber) && fileName === deviceSerialNumber) {
                        yield put({ type: S3CONFIG_TYPES.UPDATED_DEVICE_SPECIFIC_FILE, payload: data });
                    }
                    if (doLocalUpdateOnSuccess) {
                        const countryId = yield select((state) => state.dashboardState.settingsResponse?.country?.id);
                        yield put({ type: S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_SUCCESS, config: data, countryId });
                    }
                } else if (isTabletDevice && isS3AuditLog) {
                    //updating the latest data (which we writing to file) to the audit log state
                    yield put({
                        type: S3CONFIG_TYPES.ADD_S3_AUDIT_LOG,
                        payload: dataToSave
                    });
                } else {
                    yield put({
                        type: S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_STATUS,
                        payload: {
                            status: s3ConfigConstants.SUCCESS,
                            config: data
                        }
                    });
                    if (doLocalUpdateOnSuccess) {
                        const settingsCountryId = yield select((state) => state.dashboardState.settingsResponse?.country?.id);
                        yield put({ type: S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_SUCCESS, config: data, settingsCountryId });
                    }
                }
            }
        }
    } catch (e) {
        if (!S3_ERROR_CONSTANTS.FHLOGS) {
            // error logs to local file
            yield put({
                type: S3CONFIG_TYPES.LOG_S3_ERROR,
                payload: { level: LOG_LEVEL.ERROR, type: S3_ERROR_CONSTANTS.ERROR_TYPE_WRITE, message: e }
            });
        } else {
            // Handle FH error logs here and set S3_ERROR_CONSTANTS.FHLOGS to true in constants
        }
    }
}

export function* updateToS3WithSignedURL(action) {
    try {
        const {
            storeId,
            licenseKey,
            fileName,
            data,
            isDeviceSpecific = false,
            doLocalUpdateOnSuccess = false,
            publishedFromVersion,
            isDeviceAndTASpecific = false
        } = action;
        let isReceipt = fileName === S3_RECEIPT_SPECIFIC_FILE;
        const signedUrlToRead = yield call(checkAndGetPreSignedURLExpiry, action);
        const settingsTimeZone = yield select((state) => state.dashboardState.settingsResponse?.region?.time_zone);
        const deviceSerialNumber = isDeviceSpecific ? yield call(getDeviceSerialNumber) : '';
        const macAddress = yield call(getMacAddress);
        let browserName;
        if (isWeb) {
            browserName = yield call(getBrowserName);
        }
        const appInfo = getAppInfoForS3(macAddress, settingsTimeZone, undefined, browserName, deviceSerialNumber);

        if (isValidElement(signedUrlToRead)) {
            let configData = yield apiCall(s3ConfigNetwork.readSignedURL, signedUrlToRead.url);
            if (isReceipt) {
                configData = data;
            } else {
                for (let k of Object.keys(data)) {
                    configData[k] = data[k];
                }
                const appConfigVersion =
                    isValidElement(configData?.appInfo) && configData?.appInfo[AWS_APP_CONFIG.APP_CONFIG_VERSION]
                        ? configData.appInfo[AWS_APP_CONFIG.APP_CONFIG_VERSION] + 1
                        : 1;
                configData.appInfo = { ...appInfo, appConfigVersion };
            }

            if (!isDeviceAndTASpecific) {
                yield call(updateAuditLogWithSignedURL, {
                    storeId: storeId,
                    licenseKey: licenseKey,
                    fileName: fileName,
                    isDeviceSpecific: isDeviceSpecific,
                    doLocalUpdateOnSuccess: doLocalUpdateOnSuccess,
                    isDeviceAndTASpecific: isDeviceAndTASpecific,
                    publishedFromVersion: publishedFromVersion
                });
            }

            yield call(writeToS3WithSignedURL, {
                storeId: storeId,
                licenseKey: licenseKey,
                fileName: fileName,
                data: configData,
                isDeviceSpecific: isDeviceSpecific,
                doLocalUpdateOnSuccess: doLocalUpdateOnSuccess
            });
        }
    } catch (e) {
        if (!S3_ERROR_CONSTANTS.FHLOGS) {
            // error logs to local file
            yield put({
                type: S3CONFIG_TYPES.LOG_S3_ERROR,
                payload: { level: LOG_LEVEL.ERROR, type: S3_ERROR_CONSTANTS.ERROR_TYPE_UPDATE, message: e }
            });
        } else {
            // Handle FH error logs here and set S3_ERROR_CONSTANTS.FHLOGS to true in constants
        }
    }
}

export function* updateAuditLogWithSignedURL(action) {
    try {
        const {
            storeId,
            licenseKey,
            fileName,
            isDeviceSpecific = false,
            doLocalUpdateOnSuccess = false,
            publishedFromVersion,
            isDeviceAndTASpecific = false
        } = action;
        let isReceipt = fileName === S3_RECEIPT_SPECIFIC_FILE;
        const isTakeAwaySpecific = fileName === S3_TAKEAWAY_SPECIFIC_FILE;
        const currentS3ConfigData = yield select((state) => state.s3ConfigState.currentS3ConfigData);
        const currentReceiptS3ConfigData = yield select((state) => state.s3ConfigState.currentReceiptS3ConfigData);
        const currentTakeAwayS3ConfigData = yield select((state) => state.s3ConfigState.currentTakeAwayS3ConfigData);
        const currentDeviceSpecificS3ConfigData = yield select((state) => state.s3ConfigState.currentDeviceSpecificS3ConfigData);
        const currentData = saveCurrentData(
            currentS3ConfigData,
            currentReceiptS3ConfigData,
            currentTakeAwayS3ConfigData,
            currentDeviceSpecificS3ConfigData,
            isDeviceSpecific,
            isReceipt,
            isTakeAwaySpecific,
            isDeviceAndTASpecific,
            fileName
        );

        yield call(writeToS3WithSignedURL, {
            storeId: storeId,
            licenseKey: licenseKey,
            fileName: S3_AUDIT_LOG,
            data: currentData,
            isS3AuditLog: true,
            doLocalUpdateOnSuccess,
            configName: fileName,
            publishedFromVersion,
            isDeviceAndTASpecific
        });
    } catch (e) {
        if (!S3_ERROR_CONSTANTS.FHLOGS) {
            // error logs to local file
            yield put({
                type: S3CONFIG_TYPES.LOG_S3_ERROR,
                payload: { level: LOG_LEVEL.ERROR, type: S3_ERROR_CONSTANTS.ERROR_TYPE_UPDATE, message: e }
            });
        }
    }
}

function* checkAndGetPreSignedURLExpiry(action) {
    try {
        const { storeId, licenseKey, fileName, isDeviceSpecific = false } = action;
        let isReceipt = fileName === S3_RECEIPT_SPECIFIC_FILE;
        const s3PreSignedExpiryTime = isReceipt
            ? yield select((state) => state.s3ConfigState.s3PreSignedReceiptSpecificExpiryTime)
            : isDeviceSpecific
            ? yield select((state) => state.s3ConfigState.s3PreSignedDeviceSpecificExpiryTime)
            : yield select((state) => state.s3ConfigState.s3PreSignedTakeAwaySpecificExpiryTime);

        let preSignedUrlExpiryStatus = true; //isWeb || isFusionDevice || isPreSignedURLExpired(s3PreSignedExpiryTime);

        let s3PreSignedURLToRead = null;
        if (!preSignedUrlExpiryStatus) {
            s3PreSignedURLToRead = isReceipt
                ? yield select((state) => state.s3ConfigState.s3PreSignedURLToReadReceiptSpecific)
                : isDeviceSpecific
                ? yield select((state) => state.s3ConfigState.s3PreSignedURLToReadDeviceSpecific)
                : yield select((state) => state.s3ConfigState.s3PreSignedURLToReadTakeAwaySpecific);
        }

        let signedUrlToRead = preSignedUrlExpiryStatus
            ? yield apiCall(
                  s3ConfigNetwork.getS3SignedURL,
                  storeId,
                  licenseKey,
                  S3_ACCESS_TYPES.READ,
                  getFileExtension(fileName, false),
                  action?.productName ? action.productName : AWS_APP_CONFIG.PRODUCT_NAME
              )
            : { url: s3PreSignedURLToRead };
        if (preSignedUrlExpiryStatus) {
            const url = signedUrlToRead?.url;
            const params = qs.parse(url?.split('?')[1]);
            const XAmzExpires = params[s3ConfigConstants.FILE_EXPIRY_TIME_KEY];
            if (isReceipt) {
                yield put({
                    type: S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_RECEIPT_SPECIFIC,
                    payload: { url: signedUrlToRead?.url, expiryTime: XAmzExpires }
                });
            } else if (!isDeviceSpecific) {
                yield put({
                    type: S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_TAKEAWAY_SPECIFIC,
                    payload: { url: signedUrlToRead?.url, expiryTime: XAmzExpires }
                });
            } else {
                yield put({
                    type: S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_DEVICE_SPECIFIC,
                    payload: { url: signedUrlToRead?.url, expiryTime: XAmzExpires }
                });
            }
        }
        return signedUrlToRead;
    } catch (e) {
        if (!S3_ERROR_CONSTANTS.FHLOGS) {
            // error logs to local file
            yield put({
                type: S3CONFIG_TYPES.LOG_S3_ERROR,
                payload: { level: LOG_LEVEL.ERROR, type: S3_ERROR_CONSTANTS.ERROR_TYPE_READ, message: e }
            });
        } else {
            // Handle FH error logs here and set S3_ERROR_CONSTANTS.FHLOGS to true in constants
        }
    }
}

function* checkAndUpdateNewTAConfig(config) {
    let updateS3Config = false;
    // To Add the isAdyenOfflineEnabled key if it does not exist
    if (!isValidElement(config?.isAdyenOfflineEnabled)) {
        config.isAdyenOfflineEnabled = true;
        updateS3Config = true;
    }
    // To Add the appInfo key if it does not exist
    if (!isValidElement(config?.appInfo)) {
        const macAddress = yield call(getMacAddress);
        const settingsTimeZone = yield select((state) => state.dashboardState.settingsResponse?.region?.time_zone);
        config.appInfo = getAppInfoForS3(macAddress, settingsTimeZone);
        updateS3Config = true;
    }

    // To delete the timeFormatIn24Hrs key in S3Config
    if (isValidElement(config?.timeFormatIn24Hrs)) {
        delete config.timeFormatIn24Hrs;
        updateS3Config = true;
    }
    if (!isValidElement(config?.showCashDetailsToDriver)) {
        config.showCashDetailsToDriver = yield select((state) => safeElementValue(state.settingsReducer.showCashDetailsToDriver, true));
        updateS3Config = true;
    }
    if (!isValidElement(config?.showCardDetailsToDriver)) {
        config.showCardDetailsToDriver = yield select((state) => safeElementValue(state.settingsReducer.showCardDetailsToDriver, false));
        updateS3Config = true;
    }
    if (!isValidElement(config?.showCheckEmail)) {
        config.showCheckEmail = yield select((state) => safeElementValue(state.settingsReducer.showCheckEmail, false));
        updateS3Config = true;
    }
    if (!isValidElement(config?.offlineSplitToggle)) {
        config.offlineSplitToggle = yield select((state) => state.settingsReducer.offlineSplitToggle);
        updateS3Config = true;
    }
    if (!isValidElement(config?.outOfStockForOfflineOrdering)) {
        config.outOfStockForOfflineOrdering = yield select((state) =>
            safeElementValue(state.settingsReducer.outOfStockForOfflineOrdering, false)
        );
        updateS3Config = true;
    }
    if (!isValidElement(config?.showOutOfStockForOfflineOrder)) {
        config.showOutOfStockForOfflineOrder = yield select((state) =>
            safeElementValue(state.settingsReducer.showOutOfStockForOfflineOrder, false)
        );
        updateS3Config = true;
    }
    if (!config?.hasOwnProperty('driveThroughDeviceId')) {
        config.driveThroughDeviceId = yield select((state) => state.settingsReducer.driveThroughDeviceId);
        updateS3Config = true;
    }

    return { config, updateS3Config };
}

function* checkAndUpdateNewDeviceConfig(config, settingsCountryId, storeId) {
    let updateS3Config = false;

    // To Add the scannerDelayDurationinSec key if it does not exist
    if (!isValidElement(config?.scannerDelayDurationinSec)) {
        const scannerDelayDurationinSec = yield select((state) => state.settingsReducer.scannerDelayDuration);
        config.scannerDelayDurationinSec = scannerDelayDurationinSec;

        updateS3Config = true;
    }

    if (!isValidElement(config?.multiTAEnabled)) {
        const multiTakeawayStoreId = yield select((state) => state.settingsReducer?.multiTakeawayStoreId);
        config.multiTAEnabled = isValidString(multiTakeawayStoreId) && multiTakeawayStoreId.split(',')?.length > 1;
        updateS3Config = true;
    }
    if (!isValidString(config?.multiTakeawayStoreId)) {
        const multiTakeawayStoreId = yield select((state) => state.settingsReducer?.multiTakeawayStoreId);
        config.multiTakeawayStoreId = isValidString(multiTakeawayStoreId) ? multiTakeawayStoreId : storeId?.toString();
        updateS3Config = true;
    }

    if (config?.hasOwnProperty('orderNoPosition')) {
        // delete the old name orderNoPosition used the new name to set the value as bottom as default
        delete config.orderNoPosition;
        const orderNoPosition = yield select((state) => state.settingsReducer.orderNoPosition);
        config.orderNumberPosition = getDefaultOrderNumberPosition(orderNoPosition);
        updateS3Config = true;
    }
    if (config?.hasOwnProperty('preOrderFont') && !isValidNumber(config?.preOrderFont)) {
        config.preOrderFont = PRINT_CONFIG_VALUES.FONT_SIZE_MEDIUM;
        updateS3Config = true;
    }

    if (!config?.hasOwnProperty('printCashInOutToggle')) {
        config.printCashInOutToggle = yield select((state) => state.settingsReducer.printCashInOutToggle);
        updateS3Config = true;
    }

    if (!config?.hasOwnProperty('printUnfulfilledOrders')) {
        config.printUnfulfilledOrders = isUSTakeaway(settingsCountryId)
            ? true
            : yield select((state) => state.settingsReducer.printUnfulfilledOrders);
        updateS3Config = true;
    }

    if (!config?.hasOwnProperty('printPdqTransaction')) {
        config.printPdqTransaction = yield select((state) => state.settingsReducer.printPdqTransaction);
        updateS3Config = true;
    }
    if (config?.hasOwnProperty('printEditedOrderToggle')) {
        delete config.printEditedOrderToggle;
        config.printEditedOrder = yield select((state) => state.settingsReducer.printEditedOrder);
        updateS3Config = true;
    }
    if (!config?.hasOwnProperty('printAdjustTip')) {
        config.printAdjustTip = yield select((state) => state.settingsReducer.printAdjustTip);
        updateS3Config = true;
    }
    if (config?.hasOwnProperty('showOrderFlowPrimary') && !config?.hasOwnProperty('selectedScreen')) {
        config.selectedScreen = config.showOrderFlowPrimary ? CONFIG_CONSTANTS.ORDER_PAGE : CONFIG_CONSTANTS.DEFAULT_SCREEN;
        delete config.showOrderFlowPrimary;
        updateS3Config = true;
    }

    //Logic to remove the graveyard stores from s3 which were configured in multi takeaway store ids, which will remove stores which are not present in the stores list
    const storesList = yield select((state) => state?.authState.takeawayListResponse);
    if (isArrayNonEmpty(storesList) && isValidString(config?.multiTakeawayStoreId)) {
        const storeIdsInList = storesList.map((store) => store?.store_id?.toString());
        const multiStoreIds = config.multiTakeawayStoreId?.split(',');
        const validStoreIds = multiStoreIds?.filter((id) => storeIdsInList.includes(id?.trim()));
        if (validStoreIds.length !== multiStoreIds.length) {
            config.multiTakeawayStoreId = validStoreIds.join(',');
            config.multiTAEnabled = validStoreIds.length > 1;
            updateS3Config = true;
        }
    }
    return { config, updateS3Config };
}

function* UpdateLatestOrDoMigrationWithSerailNumberAsFileName(action) {
    const { storeId, licenseKey, fileName, updatedConfig } = action;
    if (isValidElement(updatedConfig)) {
        yield call(writeToS3WithSignedURL, {
            storeId: storeId,
            licenseKey: licenseKey,
            fileName: fileName,
            data: updatedConfig
        });
    }
}

function* getDataFromOldDeviceSpecificFile(action) {
    const { storeId, licenseKey } = action;
    const genLicenseKey = yield select((state) => state.appState.generatedLicenseKey);
    if (isValidElement(genLicenseKey)) {
        yield call(readS3DataThroughSignedURL, {
            storeId: storeId,
            licenseKey: licenseKey,
            fileName: genLicenseKey,
            generatedLicenseKey: genLicenseKey
        });
    }
}

function* s3ConfigSaga() {
    yield all([
        takeEvery(S3CONFIG_TYPES.READ_S3_CONFIG, readS3DataThroughSignedURL),
        takeEvery(S3CONFIG_TYPES.WRITE_TO_S3_CONFIG, writeToS3WithSignedURL),
        takeEvery(S3CONFIG_TYPES.UPDATE_TO_S3_CONFIG, updateToS3WithSignedURL),
        takeLatest(S3CONFIG_TYPES.UPDATE_S3_AUDIT_LOG, updateAuditLogWithSignedURL)
    ]);
}
export default s3ConfigSaga;
