import axios from 'axios';

const WEBHOOK_BASE_URL = 'https://falcon-direct.t2sonline.com/event/hook';

/**
 * Sends incoming call details to the configured webhook.
 * @param {string} phoneNumber - The caller's phone number (international format)
 * @param {string} takeawayNumber - The takeaway's phone number
 */
export const sendCallToWebhook = async (phoneNumber, takeawayNumber) => {
  if (!takeawayNumber) {
    throw new Error('Takeaway number is missing');
  }

  const from = String(phoneNumber).replace(/[\s+\-()]/g, '');
  const to = String(takeawayNumber).replace(/[\s+\-()]/g, '');
  const webhookUrl = `${WEBHOOK_BASE_URL}?from=${encodeURIComponent(
    from,
  )}&to=${encodeURIComponent(to)}`;

  const response = await axios.get(webhookUrl, {
    timeout: 10000,
  });

  return response.data;
};
