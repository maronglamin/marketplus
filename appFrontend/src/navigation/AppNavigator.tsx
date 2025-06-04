import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../screens/Home';
import { Settings } from '../screens/Settings';
import { Notifications } from '../screens/Notifications';
import { AccountSettings } from '../screens/AccountSettings';
import { ProductDetail } from '../screens/ProductDetail';
import { SellerDashboard } from '../screens/SellerDashboard';
import { AddProduct } from '../screens/AddProduct';
import { InterestManagement } from '../screens/InterestManagement';
import { ShowInterest } from '../screens/ShowInterest';

export type AppStackParamList = {
  Home: undefined;
  Settings: undefined;
  Notifications: undefined;
  AccountSettings: undefined;
  ProductDetail: { productId: string };
  SellerDashboard: undefined;
  AddProduct: undefined;
  InterestManagement: undefined;
  ShowInterest: { productId: string };
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="AccountSettings" component={AccountSettings} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="InterestManagement" component={InterestManagement} />
      <Stack.Screen name="ShowInterest" component={ShowInterest} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 