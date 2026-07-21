import axios from 'axios';

const WEBHOOK_BASE_URL = 'https://falcon-direct.t2sonline.com/event/hook';

/**
 * Sends incoming call details to the configured webhook.
 * @param {string} phoneNumber - The caller's phone number (international format)
 * @param {string|number} storeId - The active store id
 */
export const sendCallToWebhook = async (phoneNumber, storeId) => {
  if (!storeId) {
    throw new Error('Store id is missing');
  }

  const from = String(phoneNumber).replace(/[\s+\-()]/g, '');
  const webhookUrl = `${WEBHOOK_BASE_URL}?from=${encodeURIComponent(
    from,
  )}&store_id=${encodeURIComponent(storeId)}`;

  const response = await axios.get(webhookUrl, {
    timeout: 10000,
  });

  return response.data;
};
