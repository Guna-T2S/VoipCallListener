import { CountryImages } from '../Images/Country';

export const LOGIN_COUNTRIES = [
    { image: CountryImages.uk_flag, key: 'UK', value: 'united kingdom', id: 1, locale: 'en_GB', displayValue: 'UK' },
    { image: CountryImages.ireland_flag, key: 'IRE', value: 'ireland', id: 2, locale: 'en_IE', displayValue: 'IE' },
    { image: CountryImages.australia_flag, key: 'AUS', value: 'australia', id: 3, locale: 'en_AU', displayValue: 'AU' },
    { image: CountryImages.nz_flag, key: 'NZ', value: 'new zealand', id: 4, locale: 'en_NZ', displayValue: 'NZ' },
    { image: CountryImages.us_flag, key: 'US', value: 'united states', id: 7, locale: 'en_US', displayValue: 'US' },
    { image: CountryImages.mexico_flag, key: 'MX', value: 'mexico', id: 8, locale: 'en_MX', displayValue: 'MX' },
    { image: CountryImages.guatemala_flag, key: 'GT', value: 'guatemala', id: 9, locale: 'en_GT', displayValue: 'GT' },
];

export const AuthConfig = {
    loginConfig: {
        ukPhoneNumberLength: 11,
        otherCountryPhoneNumberLength: 10,
        genericPhoneNumberLength: 21,
        usPhoneNumberLength: 10,
        mxPhoneNumberLength: 10,
        gtPhoneNumberLength: 10,
        gtPhoneNumberWithFormatLength: 11,
        usPhoneNumberWithFormatLength: 14,
        defaultCountry: LOGIN_COUNTRIES[0],
        genericPhoneNumberMinLength: 7,
    },
    phoneRegex: {
        uk: '^0[7|8|9]{1}[0-9]{9}$',
        ireland: '^0[8][0-9]{8,9}$',
        us: '^[1-9][0-9]{9}$',
        generic: '^0[1-9][0-9]{7,9}$',
    },
    landLineRegex: {},
    authConfig: {
        splashScreenTimer: 3000,
        OTPResentTimer: 30,
        OTPResentTimerForCOO: 60,
    },
};
