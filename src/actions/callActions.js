// Action Types
export const CALL_ACTIONS = {
  INCOMING_CALL_DETECTED: 'INCOMING_CALL_DETECTED',
  SEND_TO_WEBHOOK: 'SEND_TO_WEBHOOK',
  SEND_TO_WEBHOOK_SUCCESS: 'SEND_TO_WEBHOOK_SUCCESS',
  SEND_TO_WEBHOOK_FAILURE: 'SEND_TO_WEBHOOK_FAILURE',
  CALL_ENDED: 'CALL_ENDED',
  CALL_LISTENER_SCREEN_LOADED: 'CALL_LISTENER_SCREEN_LOADED',
  FETCH_CALL_CENTER_CONFIG_SUCCESS: 'FETCH_CALL_CENTER_CONFIG_SUCCESS',
  FETCH_CALL_CENTER_CONFIG_FAILURE: 'FETCH_CALL_CENTER_CONFIG_FAILURE',
};

// Action Creators
export const incomingCallDetected = (phoneNumber, takeawayNumber) => ({
  type: CALL_ACTIONS.INCOMING_CALL_DETECTED,
  payload: { phoneNumber, takeawayNumber },
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

export const callListenerScreenLoaded = () => ({
  type: CALL_ACTIONS.CALL_LISTENER_SCREEN_LOADED,
});

export const fetchCallCenterConfigSuccess = (data) => ({
  type: CALL_ACTIONS.FETCH_CALL_CENTER_CONFIG_SUCCESS,
  payload: data,
});

export const fetchCallCenterConfigFailure = (error) => ({
  type: CALL_ACTIONS.FETCH_CALL_CENTER_CONFIG_FAILURE,
  payload: error,
});
