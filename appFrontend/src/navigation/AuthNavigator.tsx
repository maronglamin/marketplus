import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  PinVerification: { 
    phoneNumber: string; 
    isNewUser: boolean;
    flow: 'registration' | 'device_verification';
  };
  UserRegistration: undefined;
  LoginPin: undefined;
  ChangePin: { isFirstTime?: boolean } | undefined;
  NewPin: { 
    currentPin: string; 
    isFirstTime?: boolean; 
    isPinReset?: boolean; 
    pinResetOTPId?: string;
  };
  ConfirmPin: { 
    currentPin: string; 
    newPin: string; 
    isFirstTime?: boolean; 
    isPinReset?: boolean; 
    pinResetOTPId?: string;
  };
  App: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="Login" getComponent={() => require('../screens/Login').Login} />
      <Stack.Screen name="PinVerification" getComponent={() => require('../screens/PinVerification').PinVerification} />
      <Stack.Screen name="UserRegistration" getComponent={() => require('../screens/UserRegistration').UserRegistration} />
      <Stack.Screen name="LoginPin" getComponent={() => require('../screens/LoginPin').LoginPin} />
      <Stack.Screen name="ChangePin" getComponent={() => require('../screens/ChangePin').default} />
      <Stack.Screen name="NewPin" getComponent={() => require('../screens/NewPin').default} />
      <Stack.Screen name="ConfirmPin" getComponent={() => require('../screens/ConfirmPin').default} />
      <Stack.Screen name="App" getComponent={() => require('./AppNavigator').AppNavigator} />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 