export const updateDefaultLanguage = (language) => ({
    type: 'UPDATE_DEFAULT_LANGUAGE',
    language,
});

export const getPrinterAction = (apiToken) => ({
    type: 'GET_PRINTER',
    api_token: apiToken,
});
