import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Home } from './src/screens/Home';
import { ProductDetail } from './src/screens/products/buyer/ProductDetail';
import { ShowInterest } from './src/screens/ShowInterest';
import { Onboarding } from './src/screens/Onboarding';
import { SellerDashboard } from './src/screens/SellerDashboard';
import { AddProduct } from './src/screens/add-product';
import { Chat } from './src/screens/Chat';
import { Notifications } from './src/screens/Notifications';
import { Settings } from './src/screens/Settings';
import { InterestManagement } from './src/screens/InterestManagement';
import { AccountSettings } from './src/screens/AccountSettings';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { TokenNotificationProvider } from './src/contexts/TokenNotificationContext';
import { useTokenNotification } from './src/contexts/TokenNotificationContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import { FeaturedProducts } from './src/screens/products/buyer/FeaturedProducts';
import PopularProductsScreen from './src/screens/PopularProducts';
import NewArrivalsScreen from './src/screens/NewArrivals';
import FeaturedByCategoriesScreen from './src/screens/FeaturedByCategories';
import { ProductCategoryOptions } from './src/screens/ProductCategoryOptions';
import UserSearch from './src/screens/UserSearch';
import { ShoppingCart } from './src/screens/ShoppingCart';
import { CustomerRides } from './src/screens/CustomerRides';
import { CustomerRideHistory } from './src/screens/CustomerRideHistory';
import { ProductListing } from './src/screens/products/buyer/ProductListing';
import { CustomerRideService } from './src/screens/CustomerRideService';
import { ChatList } from './src/screens/ChatList';
import RentalRequest from './src/screens/RentalRequest';
import { Order } from './src/screens/Order';
import * as ExpoNotifications from 'expo-notifications';
import { realTimeRideService } from './src/services/realTimeRideService';
import { useEffect } from 'react';
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
  Order: { productId: string };
  AccountSettings: undefined;
  SellerDashboard: undefined;
  AddProduct: undefined;
  Chat: undefined;
  Notifications: undefined;
  Settings: undefined;
  InterestManagement: undefined;
  FeaturedProducts: undefined;
  PopularProducts: undefined;
  NewArrivals: undefined;
  FeaturedByCategories: { categoryId: string; categoryName: string };
  ProductCategoryOptions: undefined;
  UserSearch: undefined;
  ShoppingCart: undefined;
  CustomerRides: undefined;
  CustomerRideHistory: undefined;
  ProductListing: undefined | { searchQuery?: string; filteredProducts?: any[] };
  CustomerRideService: undefined;
  ChatList: undefined;
  RentalRequest: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function NotificationHandler() {
  const { showTokenNotification } = useTokenNotification();
  const { user } = useAuth();

  useEffect(() => {
    // Connect to WebSocket service
    const connectWebSocket = async () => {
      try {
        await realTimeRideService.connect();
        console.log('✅ WebSocket connected for ride token notifications');
      } catch (error) {
        console.error('❌ Failed to connect WebSocket:', error);
      }
    };

    connectWebSocket();

    // Subscribe to ride token notifications via WebSocket
    const unsubscribeRideToken = realTimeRideService.onRideToken((notification) => {
      console.log('🎫 WebSocket ride token notification received:', notification);
      
      // Show the floating notification for the customer
      showTokenNotification({
        token: notification.data.token,
        rideId: notification.rideId,
        customerName: 'You', // This is for the customer
        customerId: user?.id || 'current-user', // Use actual user ID
        driverName: notification.data.driverName,
        expiresAt: notification.data.expiresAt,
      });
    });

    // Keep push notification listener as fallback
    const subscription = ExpoNotifications.addNotificationReceivedListener((notification: ExpoNotifications.Notification) => {
      const data = notification.request.content.data as any;
      
      if (data?.type === 'ride_token') {
        console.log('📱 Push notification ride token received (fallback):', data);
        
        // Show the floating notification for the customer
        showTokenNotification({
          token: data.token,
          rideId: data.rideId,
          customerName: 'You', // This is for the customer
          customerId: user?.id || 'current-user', // Use actual user ID
          driverName: data.driverName,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
        });
      }
    });

    return () => {
      subscription.remove();
      unsubscribeRideToken();
      realTimeRideService.disconnect();
    };
  }, [showTokenNotification, user?.id]);

  return null;
}

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
      <MainStack.Screen name="Order" component={Order} />
      <MainStack.Screen name="ShowInterest" component={ShowInterest} />
      <MainStack.Screen name="SellerDashboard" component={SellerDashboard} />
      <MainStack.Screen name="AddProduct" component={AddProduct} />
      <MainStack.Screen name="Chat" component={Chat} />
      <MainStack.Screen name="Notifications" component={Notifications} />
      <MainStack.Screen name="Settings" component={Settings} />
      <MainStack.Screen name="InterestManagement" component={InterestManagement} />
      <MainStack.Screen name="FeaturedProducts" component={FeaturedProducts} />
      <MainStack.Screen name="PopularProducts" component={PopularProductsScreen} />
      <MainStack.Screen name="NewArrivals" component={NewArrivalsScreen} />
      <MainStack.Screen name="FeaturedByCategories" component={FeaturedByCategoriesScreen} />
      <MainStack.Screen name="ProductCategoryOptions" component={ProductCategoryOptions} />
      <MainStack.Screen name="UserSearch" component={UserSearch} />
      <MainStack.Screen name="ShoppingCart" component={ShoppingCart} />
      <MainStack.Screen name="CustomerRides" component={CustomerRides} />
      <MainStack.Screen name="CustomerRideHistory" component={CustomerRideHistory} />
      <MainStack.Screen name="ProductListing" component={ProductListing} />
      <MainStack.Screen name="CustomerRideService" component={CustomerRideService} />
      <MainStack.Screen name="ChatList" component={ChatList} />
      <MainStack.Screen name="RentalRequest" component={RentalRequest} />
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
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <AuthProvider>
              <TokenNotificationProvider>
                <NotificationHandler />
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
              </TokenNotificationProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </View>
  );
}
