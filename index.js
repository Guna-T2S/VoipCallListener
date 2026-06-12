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

// NOTE: The Android killed-state webhook is now handled natively inside
// CallScreeningServiceImpl (the OS binds it and starts the process for every
// incoming call once the call-screening role is granted), so the previous
// HeadlessJS "CallDetectionTask" is no longer registered or needed.
