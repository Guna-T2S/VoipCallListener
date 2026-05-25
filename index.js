if (__DEV__) {
  require('./src/config/ReactotronConfig');
}

import {AppRegistry} from 'react-native';
import {enableScreens} from 'react-native-screens';
import App from './App';
import {name as appName} from './app.json';

// Must be called before any navigator renders — required by react-native-screens
// even when using the New Architecture (Fabric).
enableScreens();

AppRegistry.registerComponent(appName, () => App);

// HeadlessJS task — runs sendCallToWebhook when the app is killed and a call
// comes in. Started by CallBroadcastReceiver via CallDetectionTaskService.
AppRegistry.registerHeadlessTask('CallDetectionTask', () => async ({ phoneNumber, takeawayNumber }) => {
  if (!phoneNumber || !takeawayNumber) return;
  const { sendCallToWebhook } = require('./src/services/webhookService');
  await sendCallToWebhook(phoneNumber, takeawayNumber);
});
