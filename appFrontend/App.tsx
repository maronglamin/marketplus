import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Home } from './src/screens/Home';
import { ProductDetail } from './src/screens/ProductDetail';
import { ShowInterest } from './src/screens/ShowInterest';
import { Onboarding } from './src/screens/Onboarding';
import { SellerDashboard } from './src/screens/SellerDashboard';
import { AddProduct } from './src/screens/AddProduct';
import { Chat } from './src/screens/Chat';
import { Notifications } from './src/screens/Notifications';
import { Settings } from './src/screens/Settings';
import { InterestManagement } from './src/screens/InterestManagement';
import { AccountSettings } from './src/screens/AccountSettings';
import { AuthProvider } from './src/contexts/AuthContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { Platform, StatusBar, View } from 'react-native';
import { enableScreens } from 'react-native-screens';

// Enable screens for better performance
enableScreens();

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
  ShowInterest: { productId: string };
  AccountSettings: undefined;
  SellerDashboard: undefined;
  AddProduct: undefined;
  Chat: undefined;
  Notifications: undefined;
  Settings: undefined;
  InterestManagement: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function MainNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
      }}
    >
      <MainStack.Screen name="Home" component={Home} />
      <MainStack.Screen name="AccountSettings" component={AccountSettings} />
      <MainStack.Screen name="ProductDetail" component={ProductDetail} />
      <MainStack.Screen name="ShowInterest" component={ShowInterest} />
      <MainStack.Screen name="SellerDashboard" component={SellerDashboard} />
      <MainStack.Screen name="AddProduct" component={AddProduct} />
      <MainStack.Screen name="Chat" component={Chat} />
      <MainStack.Screen name="Notifications" component={Notifications} />
      <MainStack.Screen name="Settings" component={Settings} />
      <MainStack.Screen name="InterestManagement" component={InterestManagement} />
    </MainStack.Navigator>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <NavigationContainer>
              <RootStack.Navigator
                initialRouteName="Onboarding"
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  animationDuration: 200,
                  contentStyle: {
                    backgroundColor: '#FFFFFF',
                  },
                }}
              >
                <RootStack.Screen name="Onboarding" component={Onboarding} />
                <RootStack.Screen name="Auth" component={AuthNavigator} />
                <RootStack.Screen name="Main" component={MainNavigator} />
              </RootStack.Navigator>
            </NavigationContainer>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </View>
  );
}
