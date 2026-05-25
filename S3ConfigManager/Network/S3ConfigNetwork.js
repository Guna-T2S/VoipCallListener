import { NETWORK_METHOD } from 't2sbasemodule/Network/SessionManager/Network/SessionConst';
import { getFalconConfig } from '../Utils/S3Helper';
export const s3ConfigNetwork = {
    getS3SignedURL: (storeId, token, type, fileName, productName, fileType = 'application/json') => ({
        method: NETWORK_METHOD.GET,
        url:
            getFalconConfig() +
            `/settings/features/file?fileName=${fileName}&fileType=${fileType}&fileOperation=${type}&productName=${productName}&store_id=${storeId}`,
        config: { headers: { authorization: token } }
    }),
    readSignedURL: (url) => ({
        method: NETWORK_METHOD.GET,
        url,
        headers: {
            'Cache-Control': 'no-cache'
        }
    }),
    writeToSignedURL: (url, data, type = 'application/json') => ({
        method: NETWORK_METHOD.PUT,
        url,
        data,
        headers: {
            'Content-Type': type
        }
    })
};
