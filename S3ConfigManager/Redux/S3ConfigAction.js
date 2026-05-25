import { S3CONFIG_TYPES } from './S3ConfigType';

// isDeviceSpecific will be by default false in all action, because it should be true only if we are going to create, read or write file which is device specific
export const readS3Config = (
    storeId,
    licenseKey,
    fileName,
    generatedLicenseKey = null,
    actionType = null,
    failureAction = null,
    extraParams = null,
    productName = null
) => {
    return {
        type: S3CONFIG_TYPES.READ_S3_CONFIG,
        storeId,
        licenseKey,
        fileName,
        generatedLicenseKey,
        actionType,
        failureAction,
        extraParams, //to handle the response based on the params passed from the action
        productName
    };
};

export const initializeS3Config = (
    storeId,
    licenseKey,
    generatedLicenseKey,
    isDeviceSpecific = false,
    isReceipt = false,
    userSpecificFile = ''
) => {
    return {
        type: S3CONFIG_TYPES.INITIALIZE_S3_CONFIG,
        storeId,
        licenseKey,
        generatedLicenseKey,
        isDeviceSpecific,
        isReceipt,
        userSpecificFile
    };
};

export const updateToS3Config = (
    storeId,
    licenseKey,
    fileName,
    data,
    isDeviceSpecific = false,
    doLocalUpdateOnSuccess = false,
    publishedFromVersion = null,
    isDeviceAndTASpecific = false
) => {
    return {
        type: S3CONFIG_TYPES.UPDATE_TO_S3_CONFIG,
        storeId,
        licenseKey,
        fileName,
        data,
        isDeviceSpecific,
        doLocalUpdateOnSuccess,
        publishedFromVersion,
        isDeviceAndTASpecific
    };
};

export const writeToS3Config = (
    storeId,
    licenseKey,
    fileName,
    data,
    isDeviceSpecific = false,
    doLocalUpdateOnSuccess = false,
    isLogFile = false,
    isUserSpecificFile = false,
    isDeviceAndTASpecific = false
) => {
    return {
        type: S3CONFIG_TYPES.WRITE_TO_S3_CONFIG,
        storeId,
        licenseKey,
        fileName,
        data,
        isDeviceSpecific,
        doLocalUpdateOnSuccess,
        isLogFile,
        isUserSpecificFile,
        isDeviceAndTASpecific
    };
};

export const updateS3AuditLogAction = (
    storeId,
    licenseKey,
    fileName,
    isDeviceSpecific,
    doLocalUpdateOnSuccess,
    publishedFromVersion,
    isDeviceAndTASpecific
) => {
    return {
        type: S3CONFIG_TYPES.UPDATE_S3_AUDIT_LOG,
        storeId,
        licenseKey,
        fileName,
        isDeviceSpecific,
        doLocalUpdateOnSuccess,
        publishedFromVersion,
        isDeviceAndTASpecific
    };
};
