import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Login } from '../screens/Login';
import { PinVerification } from '../screens/PinVerification';
import { UserRegistration } from '../screens/UserRegistration';
import { LoginPin } from '../screens/LoginPin';
import ChangePin from '../screens/ChangePin';
import NewPin from '../screens/NewPin';
import ConfirmPin from '../screens/ConfirmPin';
import AppNavigator from './AppNavigator';

export type AuthStackParamList = {
  Login: undefined;
  PinVerification: { 
    phoneNumber: string; 
    isNewUser: boolean;
    flow: 'registration' | 'device_verification';
  };
  UserRegistration: undefined;
  LoginPin: undefined;
  ChangePin: undefined;
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
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="PinVerification" component={PinVerification} />
      <Stack.Screen name="UserRegistration" component={UserRegistration} />
      <Stack.Screen name="LoginPin" component={LoginPin} />
      <Stack.Screen name="ChangePin" component={ChangePin} />
      <Stack.Screen name="NewPin" component={NewPin} />
      <Stack.Screen name="ConfirmPin" component={ConfirmPin} />
      <Stack.Screen name="App" component={AppNavigator} />
    </Stack.Navigator>
  );
};

export default AuthNavigator; 