export const s3ConfigConstants = {
    SUCCESS: 'SUCCESS',
    FAILED: 'FAILED',
    API_ERROR: 'API_ERROR',
    FILE_EXPIRY_TIME_KEY: 'X-Amz-Expires'
};

export const AWS_APP_CONFIG = {
    APP_CONFIG_VERSION: 'appConfigVersion',
    APP_INFO: 'appInfo',
    PRODUCT_NAME: 'myt',
    STATS_PRODUCT: 'mytstats',
    STATS_PDF: 'stats-pdf'
};

export const S3_ACCESS_TYPES = {
    READ: 'read',
    WRITE: 'write'
};

export const S3_ERROR_CONSTANTS = {
    FHLOGS: false,
    ERROR_TYPE_READ: 's3ReadError',
    ERROR_TYPE_WRITE: 's3WriteError',
    ERROR_TYPE_UPDATE: 's3UpdateError'
};

export const LOG_LEVEL = {
    NONE: 0,
    INFO: 1,
    SUCCESS: 2,
    ERROR: 3
};

export const FILE_EXTENSION = {
    TEXT: '.txt',
    JSON: '.json',
    PDF: '.pdf'
};

export const CONTENT_TYPE_PDF = 'application/pdf';
