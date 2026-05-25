import { LOGIN_COUNTRIES } from './AuthConfig';

export const getLocaleCountry = (locale) => {
    const found = LOGIN_COUNTRIES.find((c) => c.value === locale);
    return found || LOGIN_COUNTRIES[0];
};

export const getMaximumLengthOfPhoneNumber = (phoneNoMaximumLength) => {
    const parsed = parseInt(phoneNoMaximumLength, 10);
    return isNaN(parsed) ? 21 : parsed;
};

export const getSupportQRCodeImage = (countryID) => {
    return '';
};

export const replaceSpecialCharacters = (text) => {
    if (!text) return '';
    return text.replace(/[^a-zA-Z0-9]/g, '');
};
