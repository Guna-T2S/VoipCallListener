import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js/min';
import { isValidString } from '../../T2SBaseModule/Utils/helpers';
import reactotron from 'reactotron-react-native';

/**
 * Extracts the country code from a phone number string.
 * Returns the ISO 3166-1 alpha-2 country code (e.g. "US", "GB").
 *
 * @param {string|number|null} phoneNumber - Raw phone number (international format preferred)
 * @param {string} [countryCode] - Fallback country if number is not E.164 (pass from Redux store at call site)
 * @returns {{ phoneNumber: string, countryCode: string }}
 */
export const parseCallerInfo = (phoneNumber, countryCode) => {
  reactotron.log(`>>>1>>>>phoneNumber=${phoneNumber}, countryCode=${countryCode}`)
  if (!phoneNumber) {
    return { phoneNumber: 'Unknown', countryCode: 'Unknown' };
  }

  // Android telephony intents can deliver the number as a number type
  const raw = String(phoneNumber).trim();

  if (!raw || raw === 'Unknown') {
    return { phoneNumber: 'Unknown', countryCode: 'Unknown' };
  }

  try {
    const defaultCountry = isValidString(countryCode) ? countryCode : undefined;
    reactotron.log(`>>>2>>>>defaultCountry=${defaultCountry}`)

    // If number already has +, parse it directly as international
    if (raw.startsWith('+') && isValidPhoneNumber(raw)) {
      const parsed = parsePhoneNumber(raw);
      reactotron.log(`>>>chek1>>>>parsed=${parsed}`);
      return {
        phoneNumber: parsed.formatInternational(),
        countryCode: parsed.country || defaultCountry,
      };
    }

    // Try as a local number using device country as context (handles 9876543210)
    if (isValidPhoneNumber(raw, defaultCountry)) {
      const parsed = parsePhoneNumber(raw, defaultCountry);
      reactotron.log(`>>>chek2>>>>parsed=${parsed}`)
      return {
        phoneNumber: parsed.formatInternational(),
        countryCode: parsed.country || defaultCountry,
      };
    }

    // Last resort: prefix + and try as international
    const withPlus = `+${raw}`;
    const parsed = parsePhoneNumber(withPlus);
    reactotron.log(`>>>chek3>>>>parsed=${parsed}`)
    return {
      phoneNumber: parsed.formatInternational(),
      countryCode: parsed.country || defaultCountry,
    };
  } catch {
    // Return raw number with unknown country if parsing fails
    return { phoneNumber: raw, countryCode: 'Unknown' };
  }
};

