import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { initializeS3Config, readS3Config } from '../Redux/S3ConfigAction';
import { s3ConfigConstants } from '../Utils/Constants';
import { isValidString } from '../Utils/S3Helper';
import { isFusionDevice, isTabletDevice, isWeb } from 't2sbasemodule/Utils/AppTypeHelper';
import { isSunmiWithAndroidVersionAboveOrEqualToEleven } from 't2sbasemodule/Utils/helpers';
import { S3_AUDIT_LOG, S3_USER_SPECIFIC_FILE } from 't2sbasemodule/Utils/Constants';

/*
    storeId - active takeaway storeId
    licenseKey - active takeaway licenseKey (api_token)
    configFileName - to create config for takeaway specific settings (which will be common across all devices connected to that takeaway)
    generatedLicenseKey - to create config file which is device specific settings, pass only if takeaway specific settings required for the product
 */

const S3Component = ({
    storeId,
    licenseKey,
    configFileName,
    generatedLicenseKey = null,
    receiptFileName,
    deviceSerialNumber = null,
    generatedUserSpecificKey
}) => {
    const s3ConfigurationDeviceSpecificStatus = useSelector((state) => state.s3ConfigState.s3ConfigurationDeviceSpecificStatus);
    const s3ConfigurationTakeawaySpecificStatus = useSelector((state) => state.s3ConfigState.s3ConfigurationTakeawaySpecificStatus);
    const s3ConfigurationReceiptSpecificStatus = useSelector((state) => state.s3ConfigState.s3ConfigurationReceiptSpecificStatus);
    const deviceSpecificFileName = isSunmiWithAndroidVersionAboveOrEqualToEleven() ? deviceSerialNumber : generatedLicenseKey;
    const s3ConfigurationUserSpecificStatus = useSelector((state) => state.s3ConfigState.s3ConfigurationUserSpecificStatus);
    const dispatch = useDispatch();
    useEffect(() => {
        if (isWeb && isValidString(generatedUserSpecificKey)) {
            dispatch(
                readS3Config(storeId, licenseKey, generatedUserSpecificKey, generatedLicenseKey, null, null, {
                    fileType: S3_USER_SPECIFIC_FILE,
                    userSpecificFileName: generatedUserSpecificKey
                })
            );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, licenseKey, generatedUserSpecificKey]);

    useEffect(() => {
        if (!isValidString(storeId) || !isValidString(licenseKey)) {
            return;
        }
        if (isValidString(configFileName)) {
            dispatch(readS3Config(storeId, licenseKey, configFileName, deviceSpecificFileName));
        }
        if (isValidString(receiptFileName)) {
            dispatch(readS3Config(storeId, licenseKey, receiptFileName, deviceSpecificFileName));
        }
        isTabletDevice && dispatch(readS3Config(storeId, licenseKey, S3_AUDIT_LOG, deviceSpecificFileName));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId, licenseKey]);

    useEffect(() => {
        if (s3ConfigurationTakeawaySpecificStatus === s3ConfigConstants.FAILED) {
            dispatch(initializeS3Config(storeId, licenseKey, configFileName, false));
        } else if (
            isFusionDevice &&
            s3ConfigurationDeviceSpecificStatus === s3ConfigConstants.FAILED &&
            isValidString(generatedLicenseKey)
        ) {
            dispatch(initializeS3Config(storeId, licenseKey, deviceSpecificFileName, true));
        } else if (s3ConfigurationReceiptSpecificStatus === s3ConfigConstants.FAILED) {
            dispatch(initializeS3Config(storeId, licenseKey, receiptFileName, false, true));
        }
        if (s3ConfigurationUserSpecificStatus === s3ConfigConstants.FAILED) {
            dispatch(initializeS3Config(storeId, licenseKey, null, false, false, generatedUserSpecificKey));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        s3ConfigurationDeviceSpecificStatus,
        s3ConfigurationTakeawaySpecificStatus,
        s3ConfigurationReceiptSpecificStatus,
        s3ConfigurationUserSpecificStatus
    ]);

    return null;
};

export default S3Component;
