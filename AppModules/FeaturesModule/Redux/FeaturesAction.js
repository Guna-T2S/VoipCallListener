export const gdprContentApiAction = (apiToken, productID, termsType, termsPolicy, privacyPolicy) => ({
    type: 'GDPR_CONTENT_API',
    apiToken,
    productID,
    termsType,
    termsPolicy,
    privacyPolicy,
});

export const resetGDPRState = () => ({
    type: 'RESET_GDPR_STATE',
});
