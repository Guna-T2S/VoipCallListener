// Action Types
export const CALL_ACTIONS = {
  INCOMING_CALL_DETECTED: 'INCOMING_CALL_DETECTED',
  SEND_TO_WEBHOOK: 'SEND_TO_WEBHOOK',
  SEND_TO_WEBHOOK_SUCCESS: 'SEND_TO_WEBHOOK_SUCCESS',
  SEND_TO_WEBHOOK_FAILURE: 'SEND_TO_WEBHOOK_FAILURE',
  CALL_ENDED: 'CALL_ENDED',
};

// Action Creators
export const incomingCallDetected = (phoneNumber, storeId) => ({
  type: CALL_ACTIONS.INCOMING_CALL_DETECTED,
  payload: { phoneNumber, storeId },
});

export const sendToWebhook = (phoneNumber, countryCode, takeawayNumber) => ({
  type: CALL_ACTIONS.SEND_TO_WEBHOOK,
  payload: { phoneNumber, countryCode, takeawayNumber },
});

export const sendToWebhookSuccess = response => ({
  type: CALL_ACTIONS.SEND_TO_WEBHOOK_SUCCESS,
  payload: response,
});

export const sendToWebhookFailure = error => ({
  type: CALL_ACTIONS.SEND_TO_WEBHOOK_FAILURE,
  payload: error,
});

export const callEnded = () => ({
  type: CALL_ACTIONS.CALL_ENDED,
});
