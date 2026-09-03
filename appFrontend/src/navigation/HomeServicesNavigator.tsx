import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeServicesHub } from '../screens/home-services/HomeServicesHub';
import { ServiceProvidersList } from '../screens/home-services/ServiceProvidersList';
import { ServiceProviderDetail } from '../screens/home-services/ServiceProviderDetail';
import { ServiceBookingRequest } from '../screens/home-services/ServiceBookingRequest';
import { MyServiceBookings } from '../screens/home-services/MyServiceBookings';
import { ServiceBookingDetail } from '../screens/home-services/ServiceBookingDetail';
import { ServiceProviderBookingDetail } from '../screens/home-services/ServiceProviderBookingDetail';
import { ServiceBookingChat } from '../screens/home-services/ServiceBookingChat';
import { BecomeServiceProvider } from '../screens/home-services/BecomeServiceProvider';
import { ServiceProviderDashboard } from '../screens/home-services/ServiceProviderDashboard';
import { SubscriptionPayScreen } from '../screens/shared/SubscriptionPayScreen';

export type HomeServicesStackParamList = {
  HomeServicesHub: undefined;
  ServiceProvidersList: { categoryId: string; categoryName: string };
  ServiceProviderDetail: { providerId: string; categoryId: string; categoryName: string };
  ServiceBookingRequest: {
    categoryId: string;
    providerId: string;
    providerName?: string;
    categoryName?: string;
    offeringId: string;
    offeringName: string;
  };
  MyServiceBookings: undefined;
  ServiceBookingDetail: { bookingId: string };
  ServiceProviderBookingDetail: { bookingId: string };
  ServiceBookingChat: { bookingId: string };
  BecomeServiceProvider: undefined;
  ServiceProviderDashboard: undefined;
  ProviderSubscriptionPay: { vertical?: 'HOME_SERVICES' | 'REAL_ESTATE' };
};

const Stack = createNativeStackNavigator<HomeServicesStackParamList>();

export function HomeServicesNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="HomeServicesHub" component={HomeServicesHub} />
      <Stack.Screen name="ServiceProvidersList" component={ServiceProvidersList} />
      <Stack.Screen name="ServiceProviderDetail" component={ServiceProviderDetail} />
      <Stack.Screen name="ServiceBookingRequest" component={ServiceBookingRequest} />
      <Stack.Screen name="MyServiceBookings" component={MyServiceBookings} />
      <Stack.Screen name="ServiceBookingDetail" component={ServiceBookingDetail} />
      <Stack.Screen name="ServiceProviderBookingDetail" component={ServiceProviderBookingDetail} />
      <Stack.Screen name="ServiceBookingChat" component={ServiceBookingChat} />
      <Stack.Screen name="BecomeServiceProvider" component={BecomeServiceProvider} />
      <Stack.Screen name="ServiceProviderDashboard" component={ServiceProviderDashboard} />
      <Stack.Screen name="ProviderSubscriptionPay" component={SubscriptionPayScreen} initialParams={{ vertical: 'HOME_SERVICES' }} />
    </Stack.Navigator>
  );
}
