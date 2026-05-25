import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useSelector} from 'react-redux';

import Login from 'appmodules/AuthModule/View/Login';
import OTPScreen from 'appmodules/AuthModule/View/OTPScreen';

import SelectTakeawayScreen from '../screens/SelectTakeawayScreen';
import CallListenerScreen from '../screens/CallListenerScreen';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();

const screenOptions = {headerShown: false, animation: 'slide_from_right'};

export default function AppNavigator() {
  const activeStore = useSelector(s => s.activeStoreState.activeStore);

  return (
    <NavigationContainer>
      {activeStore ? (
        <AppStack.Navigator screenOptions={screenOptions}>
          <AppStack.Screen name="CallListener" component={CallListenerScreen} />
        </AppStack.Navigator>
      ) : (
        <AuthStack.Navigator screenOptions={screenOptions}>
          <AuthStack.Screen name="loginScreen" component={Login} />
          <AuthStack.Screen name="otpScreen" component={OTPScreen} />
          <AuthStack.Screen name="SelectTakeaway" component={SelectTakeawayScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}
