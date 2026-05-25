import axios from 'axios';
import {Platform} from 'react-native';

// Production API — matches mytakeaway2.0 BASE_URL.PRODUCTION_BASE_URL
const BASE_URL = 'https://api.touch2success.com';
const APP_NAME = 'MY-TAKEAWAY';
const DEVICE_OS = Platform.OS === 'ios' ? 'ios' : 'android';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {'Content-Type': 'application/json'},
});

/**
 * Step 1 — request an OTP SMS.
 * @param {string} locale  - country name lower-case, e.g. "united kingdom"
 * @param {string} phone   - number without country code, e.g. "07911123456"
 * @param {string} language - language code, e.g. "en"
 * @returns {Promise<{ otpLength: number }>}
 */
export const requestOtp = async (locale, phone, language = 'en') => {
  const response = await api.post(
    '/auth/otp',
    {phone, deviceOS: DEVICE_OS, app_name: APP_NAME, type: 'sms'},
    {headers: {locale, language}},
  );

  const data = response.data;
  if (data?.message !== 'SUCCESS') {
    throw new Error(data?.message || 'Failed to generate OTP');
  }

  return {otpLength: data?.payload?.length ?? 6};
};

/**
 * Step 2 — verify the OTP and receive the list of owned takeaways.
 * @param {string} otp
 * @param {string} phone
 * @param {string} locale
 * @param {string} language
 * @returns {Promise<Array>} - array of store objects
 */
export const verifyOtp = async (otp, phone, locale, language = 'en') => {
  const response = await api.post(
    '/auth/otp/verify',
    {phone, otp, deviceOS: DEVICE_OS, app_name: APP_NAME, is_automation: false},
    {headers: {locale, language}},
  );

  const stores = response.data?.data;
  if (!Array.isArray(stores) || stores.length === 0) {
    throw new Error('No takeaways found for this account');
  }

  return stores;
};
