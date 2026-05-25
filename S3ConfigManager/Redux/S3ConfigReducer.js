import { S3CONFIG_TYPES } from './S3ConfigType';
import { addTimeDeviceMoment } from '../Utils/S3Helper';
import { s3ConfigConstants } from '../Utils/Constants';

const INITIAL_STATE = {
    s3ConfigurationDeviceSpecificStatus: null,
    s3ConfigurationTakeawaySpecificStatus: null,
    s3PreSignedURLToReadDeviceSpecific: null,
    s3PreSignedDeviceSpecificExpiryTime: null,
    s3PreSignedURLToReadTakeAwaySpecific: null,
    s3PreSignedTakeAwaySpecificExpiryTime: null,
    s3ConfigurationReceiptSpecificStatus: null,
    s3PreSignedReceiptSpecificExpiryTime: null,
    s3PreSignedURLToReadReceiptSpecific: null,
    updatedFileWithSerialNumber: false,
    s3ConfigurationUserSpecificStatus: null,
    s3ConfigAuditLog: null,
    currentReceiptS3ConfigData: null,
    currentUserSpecificS3ConfigData: null,
    currentTakeAwayS3ConfigData: null,
    currentDeviceSpecificS3ConfigData: null
};

export default (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_STATUS:
            return {
                ...state,
                s3ConfigurationDeviceSpecificStatus: action?.payload?.status,
                ...(action?.payload?.status === s3ConfigConstants.SUCCESS && {
                    currentDeviceSpecificS3ConfigData: action?.payload?.config
                })
            };
        case S3CONFIG_TYPES.READ_S3_CONFIG_DEVICE_SPECIFIC_SUCCESS:
            return {
                ...state,
                s3ConfigurationDeviceSpecificStatus: s3ConfigConstants.SUCCESS,
                currentDeviceSpecificS3ConfigData: action?.config
            };
        case S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_STATUS:
            return {
                ...state,
                s3ConfigurationTakeawaySpecificStatus: action?.payload,
                ...(action?.payload?.status === s3ConfigConstants.SUCCESS && {
                    currentTakeAwayS3ConfigData: action?.payload?.config
                })
            };
        case S3CONFIG_TYPES.READ_NON_FUSION_S3_CONFIG_SUCCESS:
        case S3CONFIG_TYPES.READ_S3_CONFIG_TAKEAWAY_SPECIFIC_SUCCESS:
            return {
                ...state,
                s3ConfigurationTakeawaySpecificStatus: s3ConfigConstants.SUCCESS,
                currentTakeAwayS3ConfigData: action?.config
            };
        case S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_DEVICE_SPECIFIC:
            return {
                ...state,
                s3PreSignedURLToReadDeviceSpecific: action?.payload?.url,
                s3PreSignedDeviceSpecificExpiryTime: addTimeDeviceMoment(Number(action?.payload?.expiryTime))
            };
        case S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_TAKEAWAY_SPECIFIC:
            return {
                ...state,
                s3PreSignedURLToReadTakeAwaySpecific: action?.payload?.url,
                s3PreSignedTakeAwaySpecificExpiryTime: addTimeDeviceMoment(Number(action?.payload?.expiryTime))
            };
        case S3CONFIG_TYPES.READ_S3_CONFIG_RECEIPTS_STATUS:
            return {
                ...state,
                s3ConfigurationReceiptSpecificStatus: action?.payload?.status,
                ...(action?.payload?.status === s3ConfigConstants.SUCCESS && {
                    currentReceiptS3ConfigData: action?.payload?.config
                })
            };
        case S3CONFIG_TYPES.UPDATE_PRE_SIGNED_URL_RECEIPT_SPECIFIC:
            return {
                ...state,
                s3PreSignedURLToReadReceiptSpecific: action?.payload?.url,
                s3PreSignedReceiptSpecificExpiryTime: addTimeDeviceMoment(Number(action?.payload?.expiryTime))
            };
        case S3CONFIG_TYPES.UPDATED_DEVICE_SPECIFIC_FILE:
            return {
                ...state,
                updatedFileWithSerialNumber: true,
                currentDeviceSpecificS3ConfigData: action?.payload
            };
        case S3CONFIG_TYPES.READ_USER_SPECIFIC_DYNAMIC_CONFIG_STATUS:
            return {
                ...state,
                s3ConfigurationUserSpecificStatus: action?.payload?.status,
                ...(action?.payload?.status === s3ConfigConstants.SUCCESS && {
                    currentUserSpecificS3ConfigData: action?.payload?.config
                })
            };
        case S3CONFIG_TYPES.ADD_S3_AUDIT_LOG:
            return {
                ...state,
                s3ConfigAuditLog: action?.payload
            };
        default:
            return state;
    }
};
