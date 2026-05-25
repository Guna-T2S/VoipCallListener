import {call, put, takeLatest} from '@redux-saga/core/effects';
import {
  CALL_ACTIONS,
  sendToWebhookSuccess,
  sendToWebhookFailure,
} from '../actions/callActions';
import {sendCallToWebhook} from '../services/webhookService';

/**
 * Worker saga: fires the webhook when an incoming call is detected.
 * Triggered only while the phone is ringing (INCOMING_CALL_DETECTED).
 */
function* handleIncomingCall(action) {
  const {phoneNumber, takeawayNumber} = action.payload;

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
