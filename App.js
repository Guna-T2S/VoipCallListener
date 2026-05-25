import React, {useEffect, useState} from 'react';
import {View, ActivityIndicator, StyleSheet, StatusBar} from 'react-native';
import {Provider} from 'react-redux';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import store, {restoreSession} from './src/store';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <View style={styles.splash}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <Provider store={store}>
        <AppNavigator />
      </Provider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {flex: 1, backgroundColor: '#121212', justifyContent: 'center', alignItems: 'center'},
});
