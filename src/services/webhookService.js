import axios from 'axios';
import sha256 from 'crypto-js/sha256';
import hexEnc from 'crypto-js/enc-hex';
import { isProd } from 't2sbasemodule/Utils/helpers';

const WEBHOOK_BASE_URL = isProd()
  ? 'https://falcon-direct.t2sonline.com/event/hook'
  : 'https://falcon-sit-direct.stage.t2sonline.com/event/hook';
/**
 * Builds the security key appended to the webhook URL.1
 * s_key = sha256(`${id}|${host}|${contact_no}`) as a hex digest.
 * @param {{id: string|number, host: string, contact_no: string}} config
 */
const buildSecurityKey = config =>
  sha256(`${config.id}|${config.host}|${config.contact_no}`).toString(hexEnc);

/**
 * Sends incoming call details to the configured webhook.
 * @param {string} phoneNumber - The caller's phone number (international format)
 * @param {{id: string|number, host: string, contact_no: string}} storeConfig - The active store config
 */
export const sendCallToWebhook = async (phoneNumber, storeConfig) => {
  const storeId = storeConfig?.id;
  if (!storeId) {
    throw new Error('Store id is missing');
  }

  const from = String(phoneNumber).replace(/[\s+\-()]/g, '');
  const sKey = buildSecurityKey(storeConfig);
  console.log(`Security key: ${sKey}`);
  const webhookUrl = `${WEBHOOK_BASE_URL}?from=${encodeURIComponent(
    from,
  )}&store_id=${encodeURIComponent(storeId)}&s_key=${encodeURIComponent(sKey)}`;

  console.log(`Sending call to webhook: ${webhookUrl}`);

  const response = await axios.get(webhookUrl, {
    timeout: 30000,
  });

  console.log(`Webhook response: ${JSON.stringify(response.data)}`);

  return response.data;
};
