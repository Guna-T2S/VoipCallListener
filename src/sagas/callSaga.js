import {call, put, takeLatest} from '@redux-saga/core/effects';
import {Platform} from 'react-native';
import {
  CALL_ACTIONS,
  sendToWebhook,
  sendToWebhookSuccess,
  sendToWebhookFailure,
} from '../actions/callActions';
import {sendCallToWebhook} from '../services/webhookService';

/**
 * Worker saga: fires the webhook when an incoming call is detected.
 * On Android the native CallScreeningService always sends the webhook;
 * JS only updates UI state to avoid duplicate HTTP requests.
 */
function* handleIncomingCall(action) {
  const {phoneNumber, takeawayNumber} = action.payload;
  console.log('phoneNumber', phoneNumber);

  yield put(sendToWebhook(phoneNumber, null, takeawayNumber));

  if (Platform.OS === 'android') {
    // Native CallScreeningServiceImpl is the authoritative webhook path.
    yield put(sendToWebhookSuccess({native: true}));
    return;
  }

  try {
    const response = yield call(sendCallToWebhook, phoneNumber, takeawayNumber);
    yield put(sendToWebhookSuccess(response));
  } catch (error) {
    const errorMessage = error?.message || 'Unknown error';
    yield put(sendToWebhookFailure(errorMessage));
  }
}

/**
 * Root call watcher saga.
 * Uses takeLatest so rapid duplicate events collapse into one webhook call.
 */
function* watchIncomingCalls() {
  yield takeLatest(CALL_ACTIONS.INCOMING_CALL_DETECTED, handleIncomingCall);
}

export default watchIncomingCalls;
