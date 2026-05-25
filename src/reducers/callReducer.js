import {CALL_ACTIONS} from '../actions/callActions';

const initialState = {
  isIncomingCall: false,
  currentCall: null, // { phoneNumber, countryCode }
  webhookStatus: 'idle', // 'idle' | 'sending' | 'success' | 'failure'
  lastError: null,
  callHistory: [],
  callCenterConfig: null,
};

const callReducer = (state = initialState, action) => {
  switch (action.type) {
    case CALL_ACTIONS.INCOMING_CALL_DETECTED:
      return {
        ...state,
        isIncomingCall: true,
        currentCall: action.payload,
        webhookStatus: 'idle',
        lastError: null,
      };

    case CALL_ACTIONS.SEND_TO_WEBHOOK:
      return {
        ...state,
        webhookStatus: 'sending',
      };

    case CALL_ACTIONS.SEND_TO_WEBHOOK_SUCCESS:
      return {
        ...state,
        webhookStatus: 'success',
        callHistory: [
          ...state.callHistory,
          {
            ...state.currentCall,
            sentAt: new Date().toISOString(),
            status: 'sent',
          },
        ],
      };

    case CALL_ACTIONS.SEND_TO_WEBHOOK_FAILURE:
      return {
        ...state,
        webhookStatus: 'failure',
        lastError: action.payload,
        callHistory: [
          ...state.callHistory,
          {
            ...state.currentCall,
            sentAt: new Date().toISOString(),
            status: 'failed',
            error: action.payload,
          },
        ],
      };

    case CALL_ACTIONS.CALL_ENDED:
      return {
        ...state,
        isIncomingCall: false,
        currentCall: null,
        webhookStatus: 'idle',
      };

    case CALL_ACTIONS.FETCH_CALL_CENTER_CONFIG_SUCCESS:
      return {
        ...state,
        callCenterConfig: action.payload,
      };

    default:
      return state;
  }
};

export default callReducer;
