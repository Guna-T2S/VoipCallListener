import { AppConfig } from 't2sbasemodule/Utils/AppConfig';
import moment from 'moment-timezone';
import { FILE_EXTENSION } from './Constants';
import { LocalizationStrings } from 'appmodules/LocalizationModule/LocalizationStrings';
import { DATE_FORMAT } from 't2sbasemodule/Utils/DateUtil';
import { S3_TAKEAWAY_SPECIFIC_FILE } from 't2sbasemodule/Utils/Constants';
import { getCurrentDateTime } from 't2sbasemodule/Utils/helpers';

export const isValidElement = (data) => {
    return data !== null && data !== undefined;
};

export const isValidString = (data) => {
    return data !== null && data !== undefined && data !== '';
};

export const isProductionUrl = () => {
    return AppConfig.buildConfig.buildType !== 'debug';
};

export const getFalconConfig = () => {
    return isProductionUrl() ? AppConfig.falconConfig.PROD : AppConfig.falconConfig.QA;
};

export const isPreSignedURLExpired = (expiryTime) => {
    if (isValidString(expiryTime)) {
        return expiryTime < addTimeDeviceMoment();
    } else {
        return true;
    }
};

export const addTimeDeviceMoment = (expire_seconds) => {
    if (isValidElement(expire_seconds)) {
        return moment().unix() + expire_seconds;
    }
    return moment().unix();
};

export const getFileExtension = (fileName, isLogFile) => {
    let fileExtension = isLogFile ? FILE_EXTENSION.TEXT : FILE_EXTENSION.JSON;
    return fileName + fileExtension;
};

export const getFileType = (isLogFile) => {
    return isLogFile ? 'text/plain' : 'application/json';
};

export const updateLocalizationStrings = (languageCode, data) => {
    try {
        if (!LocalizationStrings) {
            return;
        }
        const content = LocalizationStrings?.getContent?.();
        if (!content || typeof content !== 'object') {
            return;
        }
        let languageObj = {};
        let oldValue = content[languageCode] ?? {};
        languageObj[languageCode] = { ...oldValue, ...data };
        LocalizationStrings.setContent(Object.assign({}, content, languageObj));
        LocalizationStrings.setLanguage(languageCode);
    } catch (e) {
        return;
    }
};

const MAX_AUDIT_LOG_ENTRIES = 50;

// Helper function to create a log entry
const createLogEntry = (data, loggedInStaff, publishedFromVersion, settingsTimeZone) => ({
    date: getCurrentDateTime(settingsTimeZone),
    data,
    loggedInStaff,
    publishedFromVersion
});

const getAuditLogArray = (auditLog, key) => (isValidElement(auditLog) && Array.isArray(auditLog[key]) ? [...auditLog[key]] : []);

// Helper function to add entry and limit array size
const addLogEntryAndLimit = (logArray, newEntry) => {
    logArray.unshift(newEntry);
    if (logArray.length > MAX_AUDIT_LOG_ENTRIES) {
        logArray.length = MAX_AUDIT_LOG_ENTRIES;
    }
    return logArray;
};

export const getAuditData = (
    configData,
    fileName,
    s3ConfigAuditLog,
    loggedInStaff,
    publishedFromVersion,
    settingsTimeZone,
    isDeviceAndTASpecific = false
) => {
    const baseResult = { ...s3ConfigAuditLog };

    if (isDeviceAndTASpecific) {
        // Get existing logs
        const configLog = getAuditLogArray(s3ConfigAuditLog, S3_TAKEAWAY_SPECIFIC_FILE);
        const deviceSpecificLog = getAuditLogArray(s3ConfigAuditLog, fileName);

        // Create new entries
        const configLogNewEntry = createLogEntry(
            configData[S3_TAKEAWAY_SPECIFIC_FILE],
            loggedInStaff,
            publishedFromVersion,
            settingsTimeZone
        );
        const deviceSpecificLogNewEntry = createLogEntry(configData[fileName], loggedInStaff, publishedFromVersion, settingsTimeZone);

        // Add entries and limit size
        addLogEntryAndLimit(configLog, configLogNewEntry);
        addLogEntryAndLimit(deviceSpecificLog, deviceSpecificLogNewEntry);

        const result = {
            ...baseResult,
            [S3_TAKEAWAY_SPECIFIC_FILE]: configLog,
            [fileName]: deviceSpecificLog
        };

        return result;
    }

    // Handle regular case
    const currentLog = getAuditLogArray(s3ConfigAuditLog, fileName);
    const newLogEntry = createLogEntry(configData, loggedInStaff, publishedFromVersion, settingsTimeZone);

    addLogEntryAndLimit(currentLog, newLogEntry);

    return {
        ...baseResult,
        [fileName]: currentLog
    };
};

export const saveCurrentData = (
    currentS3ConfigData,
    currentReceiptS3ConfigData,
    currentTakeAwayS3ConfigData,
    currentDeviceSpecificS3ConfigData,
    isDeviceSpecific,
    isReceipt,
    isTakeAwaySpecific,
    isDeviceAndTASpecific = false,
    fileName
) => {
    if (isDeviceAndTASpecific) {
        return { [fileName]: currentDeviceSpecificS3ConfigData, [S3_TAKEAWAY_SPECIFIC_FILE]: currentTakeAwayS3ConfigData };
    } else if (isDeviceSpecific) {
        return currentDeviceSpecificS3ConfigData;
    } else if (isReceipt) {
        return currentReceiptS3ConfigData;
    } else if (isTakeAwaySpecific) {
        return currentTakeAwayS3ConfigData;
    } else {
        return currentS3ConfigData;
    }
};

export const getModifiedVersion = (version) => {
    return version ? `v${version}` : '';
};
