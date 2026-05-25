import {createStore, combineReducers, applyMiddleware, compose} from 'redux';
import createSagaMiddleware from '@redux-saga/core';
import AsyncStorage from '@react-native-async-storage/async-storage';
import callReducer from '../reducers/callReducer';

import authReducer from 'appmodules/AuthModule/Redux/AuthReducer';
import {ADDRESS_CONFIG_TYPES} from 'appmodules/SideMenu/Redux/AppTypes';

import rootSaga from './rootSaga';

const ACTIVE_STORE_KEY = '@voip_active_store';

const sagaMiddleware = createSagaMiddleware();

let reactotronEnhancer = null;
if (__DEV__) {
  const Reactotron = require('../config/ReactotronConfig').default;
  reactotronEnhancer = Reactotron.createEnhancer();
}

// Minimal stubs for state slices that mytakeaway2.0 Login/OTP mapStateToProps reads.
// Only the fields actually accessed by those screens are populated.
const initialAppState = {
  connectionStatus: true,
  defaultLanguage: {name: 'en'},
  countryConfigResponse: null,
  registerFusionRemoteId: null,
  isRegisterFusionSuccess: null,
  generatedLicenseKey: null,
  fcmToken: null,
  latestSelectedStoreId: null,
  appSyncStatus: false,
};

const appStateReducer = (state = initialAppState, action) => {
  switch (action.type) {
    case ADDRESS_CONFIG_TYPES.S3_CONFIG_SUCCESS:
      return {...state, countryConfigResponse: action.payload};
    default:
      return state;
  }
};

const activeStoreReducer = (state = {activeStore: null}, action) => {
  if (action.type === 'set_active_store') {
    AsyncStorage.setItem(ACTIVE_STORE_KEY, JSON.stringify(action.activeStore)).catch(() => {});
    return {...state, activeStore: action.activeStore};
  }
  if (action.type === 'invalid_session' || action.type === 'logout_action_success') {
    AsyncStorage.removeItem(ACTIVE_STORE_KEY).catch(() => {});
    return {activeStore: null};
  }
  if (action.type === 'restore_active_store') {
    return {...state, activeStore: action.activeStore};
  }
  return state;
};

const stubReducer = init => (state = init) => state;

const rootReducer = combineReducers({
  calls: callReducer,
  authState: authReducer,
  appState: appStateReducer,
  activeStoreState: activeStoreReducer,
  featuresState: stubReducer({GDPRTermsAndCondition: null, GDPRPrivacyPolicy: null, isAdyenConfiguredTA: false}),
  configuratorState: stubReducer({isAutomation: false}),
  dashboardState: stubReducer({settingsResponse: null}),
  userSessionState: stubReducer({access_token: null}),
  orderManagementState: stubReducer({customerId: null}),
});

const enhancers = __DEV__ && reactotronEnhancer
  ? compose(applyMiddleware(sagaMiddleware), reactotronEnhancer)
  : applyMiddleware(sagaMiddleware);

const store = createStore(rootReducer, enhancers);

sagaMiddleware.run(rootSaga);

export const restoreSession = async () => {
  try {
    const json = await AsyncStorage.getItem(ACTIVE_STORE_KEY);
    if (json) {
      const activeStore = JSON.parse(json);
      store.dispatch({type: 'restore_active_store', activeStore});
    }
  } catch (_) {}
};

export default store;
