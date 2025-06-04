import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Login } from '../src/screens/Login';
import { PinVerification } from '../screens/PinVerification';
import { UserRegistration } from '../src/screens/UserRegistration';
import { LoginPin } from '../src/screens/LoginPin';
import { Home } from '../src/screens/Home';

export type RootStackParamList = {
  Login: undefined;
  PinVerification: { phoneNumber: string };
  UserRegistration: { phoneNumber: string };
  LoginPin: undefined;
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="PinVerification" component={PinVerification} />
        <Stack.Screen name="UserRegistration" component={UserRegistration} />
        <Stack.Screen name="LoginPin" component={LoginPin} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    </NavigationContainer>
  );
} 