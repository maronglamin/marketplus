import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { TokenNotificationProvider } from './src/contexts/TokenNotificationContext';
import { useTokenNotification } from './src/contexts/TokenNotificationContext';
import * as ExpoNotifications from 'expo-notifications';
import { realTimeRideService } from './src/services/realTimeRideService';
import type { SellerKycResponse } from './src/services/kycService';
import type { HomeServicesStackParamList } from './src/navigation/HomeServicesNavigator';
import type { RealEstateStackParamList } from './src/navigation/RealEstateNavigator';
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
  OrderDetails: { orderId: string };
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
  RideRequest: undefined | { [key: string]: any };
  BecomeRider: { type: string; existingData?: any };
  CustomerOrders: undefined;
  ChangePin: undefined;
  NewPin: { currentPin: string; isFirstTime?: boolean; isPinReset?: boolean; pinResetOTPId?: string };
  ConfirmPin: { currentPin: string; newPin: string; isFirstTime?: boolean; isPinReset?: boolean; pinResetOTPId?: string };
  Permissions: undefined;
  PaymentMethods: undefined;
  Delivery: undefined;
  NotificationsSettings: undefined;
  ServiceTerms: undefined;
  PrivacyPolicy: undefined;
  AccountDeletion: undefined;
  AccountType: undefined;
  SalesRepsScreen: undefined;
  ReportsScreen: undefined;
  SettlementsScreen: undefined;
  BranchesScreen: undefined;
  RevenueDetails: undefined;
  TransactionHistory: { currency: string; currencySymbol: string };
  SettlementHistory: undefined;
  SellerInterestDetail: { interestId: string };
  SettlementRequest: undefined;
  TransactionDetail: { transactionId: string; currency: string; currencySymbol: string };
  DriverDashboard: undefined;
  DriverSettings: undefined;
  DriverProfile: undefined;
  DriverEarnings: undefined;
  DriverRequests: undefined;
  RentalEarnings: undefined;
  AssetRental: undefined;
  SellerKycForm:
    | undefined
    | {
        businessData?: {
          businessName: string;
          businessType: string;
          registrationNumber: string;
          taxId: string;
        };
      };
  SellerKycBusiness: {
    existingData?: SellerKycResponse;
  };
  SellerKycAddress: {
    businessData: {
      businessName: string;
      businessType: string;
      registrationNumber: string;
      taxId: string;
    };
    existingData?: SellerKycResponse;
  };
  SellerKycVerification: {
    businessData: {
      businessName: string;
      businessType: string;
      registrationNumber: string;
      taxId: string;
    };
    addressData: {
      address: string;
      city: string;
      state: string;
      countries: string[];
      postalCode: string;
    };
    existingData?: SellerKycResponse;
  };
  SellerKycConfirmation: {
    businessData: {
      businessName: string;
      businessType: string;
      registrationNumber: string;
      taxId: string;
    };
    addressData: {
      address: string;
      city: string;
      state: string;
      countries: string[];
      postalCode: string;
    };
    verificationData: {
      idType: string;
      idNumber: string;
      idExpiryDate: string;
      idImage: string | null;
    };
  };
  HomeServices: NavigatorScreenParams<HomeServicesStackParamList> | undefined;
  RealEstate: NavigatorScreenParams<RealEstateStackParamList> | undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function NotificationHandler() {
  const { showTokenNotification } = useTokenNotification();
  const { user, token, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let unsubscribeRideToken: (() => void) | undefined;

    if (token) {
      unsubscribeRideToken = realTimeRideService.onRideToken((notification) => {
        console.log('🎫 WebSocket ride token notification received:', notification);

        showTokenNotification({
          token: notification.data.token,
          rideId: notification.rideId,
          customerName: 'You',
          customerId: user?.id || 'current-user',
          driverName: notification.data.driverName,
          expiresAt: notification.data.expiresAt,
        });
      });

      void (async () => {
        try {
          await realTimeRideService.connect();
          console.log('✅ WebSocket connected for ride token notifications');
        } catch (error) {
          console.error('❌ Failed to connect WebSocket:', error);
        }
      })();
    }

    const subscription = ExpoNotifications.addNotificationReceivedListener((notification: ExpoNotifications.Notification) => {
      const data = notification.request.content.data as any;

      if (data?.type === 'ride_token') {
        console.log('📱 Push notification ride token received (fallback):', data);

        showTokenNotification({
          token: data.token,
          rideId: data.rideId,
          customerName: 'You',
          customerId: user?.id || 'current-user',
          driverName: data.driverName,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      }
    });

    return () => {
      subscription.remove();
      unsubscribeRideToken?.();
      realTimeRideService.disconnect();
    };
  }, [showTokenNotification, user?.id, token, isLoading]);

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
      <MainStack.Screen name="Home" getComponent={() => require('./src/screens/Home').Home} />
      <MainStack.Screen name="AccountSettings" getComponent={() => require('./src/screens/AccountSettings').AccountSettings} />
      <MainStack.Screen name="ProductDetail" getComponent={() => require('./src/screens/products/buyer/ProductDetail').ProductDetail} />
      <MainStack.Screen name="Order" getComponent={() => require('./src/screens/Order').Order} />
      <MainStack.Screen name="OrderDetails" getComponent={() => require('./src/screens/OrderDetails').OrderDetails} />
      <MainStack.Screen name="ShowInterest" getComponent={() => require('./src/screens/ShowInterest').ShowInterest} />
      <MainStack.Screen name="SellerDashboard" getComponent={() => require('./src/screens/SellerDashboard').SellerDashboard} />
      <MainStack.Screen name="AddProduct" getComponent={() => require('./src/screens/add-product').AddProduct} />
      <MainStack.Screen name="Chat" getComponent={() => require('./src/screens/Chat').Chat} />
      <MainStack.Screen name="Notifications" getComponent={() => require('./src/screens/Notifications').Notifications} />
      <MainStack.Screen name="Settings" getComponent={() => require('./src/screens/Settings').Settings} />
      <MainStack.Screen name="InterestManagement" getComponent={() => require('./src/screens/InterestManagement').InterestManagement} />
      <MainStack.Screen name="FeaturedProducts" getComponent={() => require('./src/screens/products/buyer/FeaturedProducts').FeaturedProducts} />
      <MainStack.Screen name="PopularProducts" getComponent={() => require('./src/screens/PopularProducts').default} />
      <MainStack.Screen name="NewArrivals" getComponent={() => require('./src/screens/NewArrivals').default} />
      <MainStack.Screen name="FeaturedByCategories" getComponent={() => require('./src/screens/FeaturedByCategories').default} />
      <MainStack.Screen name="ProductCategoryOptions" getComponent={() => require('./src/screens/ProductCategoryOptions').ProductCategoryOptions} />
      <MainStack.Screen name="UserSearch" getComponent={() => require('./src/screens/UserSearch').default} />
      <MainStack.Screen name="ShoppingCart" getComponent={() => require('./src/screens/ShoppingCart').ShoppingCart} />
      <MainStack.Screen name="CustomerRides" getComponent={() => require('./src/screens/CustomerRides').CustomerRides} />
      <MainStack.Screen name="CustomerRideHistory" getComponent={() => require('./src/screens/CustomerRideHistory').CustomerRideHistory} />
      <MainStack.Screen name="ProductListing" getComponent={() => require('./src/screens/products/buyer/ProductListing').ProductListing} />
      <MainStack.Screen name="CustomerRideService" getComponent={() => require('./src/screens/CustomerRideService').CustomerRideService} />
      <MainStack.Screen name="ChatList" getComponent={() => require('./src/screens/ChatList').ChatList} />
      <MainStack.Screen name="RentalRequest" getComponent={() => require('./src/screens/RentalRequest').default} />
      <MainStack.Screen name="RideRequest" getComponent={() => require('./src/screens/RideRequest').RideRequest} />
      <MainStack.Screen name="BecomeRider" getComponent={() => require('./src/screens/riders/BecomeRider').BecomeRider} />
      {/* Account & settings related routes (require login via upstream guards) */}
      <MainStack.Screen name="CustomerOrders" getComponent={() => require('./src/screens/CustomerOrders').CustomerOrders} />
      <MainStack.Screen name="ChangePin" getComponent={() => require('./src/screens/ChangePin').default} />
      <MainStack.Screen name="NewPin" getComponent={() => require('./src/screens/NewPin').default} />
      <MainStack.Screen name="ConfirmPin" getComponent={() => require('./src/screens/ConfirmPin').default} />
      <MainStack.Screen name="Permissions" getComponent={() => require('./src/screens/account-settings/Permissions').default} />
      <MainStack.Screen name="PaymentMethods" getComponent={() => require('./src/screens/account-settings/PaymentMethods').PaymentMethods} />
      <MainStack.Screen name="Delivery" getComponent={() => require('./src/screens/account-settings/Delivery').default} />
      {/* Route notifications settings to Permissions to manage OS-level permissions */}
      <MainStack.Screen name="NotificationsSettings" getComponent={() => require('./src/screens/account-settings/Permissions').default} />
      <MainStack.Screen name="ServiceTerms" getComponent={() => require('./src/screens/account-settings/ServiceTerms').ServiceTerms} />
      <MainStack.Screen name="PrivacyPolicy" getComponent={() => require('./src/screens/PrivacyPolicy').default} />
      <MainStack.Screen name="AccountDeletion" getComponent={() => require('./src/screens/account-settings/AccountDeletion').AccountDeletion} />
      <MainStack.Screen name="AccountType" getComponent={() => require('./src/screens/account-settings/AccountType').AccountType} />
      {/* Seller/Rep management screens */}
      <MainStack.Screen name="SalesRepsScreen" getComponent={() => require('./src/screens/SalesRepsScreen').SalesRepsScreen} />
      <MainStack.Screen name="ReportsScreen" getComponent={() => require('./src/screens/ReportsScreen').ReportsScreen} />
      <MainStack.Screen name="SettlementsScreen" getComponent={() => require('./src/screens/SettlementsScreen').SettlementsScreen} />
      <MainStack.Screen name="BranchesScreen" getComponent={() => require('./src/screens/reps-reports/BranchesScreen').BranchesScreen} />
      <MainStack.Screen name="RevenueDetails" getComponent={() => require('./src/screens/RevenueDetails').RevenueDetails} />
      <MainStack.Screen name="TransactionHistory" getComponent={() => require('./src/screens/transactions/TransactionHistory').TransactionHistory} />
      <MainStack.Screen name="SettlementHistory" getComponent={() => require('./src/screens/transactions/SettlementHistory').SettlementHistory} />
      <MainStack.Screen name="SellerInterestDetail" getComponent={() => require('./src/screens/SellerInterestDetail').SellerInterestDetail} />
      <MainStack.Screen name="SettlementRequest" getComponent={() => require('./src/screens/transactions/SettlementRequest').SettlementRequest} />
      <MainStack.Screen name="TransactionDetail" getComponent={() => require('./src/screens/transactions/TransactionDetail').TransactionDetail} />
      <MainStack.Screen name="DriverDashboard" getComponent={() => require('./src/screens/DriverDashboard').DriverDashboard} />
      <MainStack.Screen name="DriverSettings" getComponent={() => require('./src/screens/driverManagement/DriverSettings').DriverSettings} />
      <MainStack.Screen name="DriverProfile" getComponent={() => require('./src/screens/driverManagement/DriverProfile').DriverProfile} />
      <MainStack.Screen name="DriverEarnings" getComponent={() => require('./src/screens/DriverEarnings').DriverEarnings} />
      <MainStack.Screen name="DriverRequests" getComponent={() => require('./src/screens/DriverRequests').DriverRequests} />
      <MainStack.Screen name="RentalEarnings" getComponent={() => require('./src/screens/RentalEarnings').RentalEarnings} />
      <MainStack.Screen name="AssetRental" getComponent={() => require('./src/screens/AssetRental').default} />
      {/* Seller KYC flow */}
      <MainStack.Screen name="SellerKycForm" getComponent={() => require('./src/screens/SellerKycForm').SellerKycForm} />
      <MainStack.Screen name="SellerKycBusiness" getComponent={() => require('./src/screens/SellerKycBusiness').SellerKycBusiness} />
      <MainStack.Screen name="SellerKycAddress" getComponent={() => require('./src/screens/SellerKycAddress').SellerKycAddress} />
      <MainStack.Screen name="SellerKycVerification" getComponent={() => require('./src/screens/SellerKycVerification').SellerKycVerification} />
      <MainStack.Screen name="SellerKycConfirmation" getComponent={() => require('./src/screens/SellerKycConfirmation').SellerKycConfirmation} />
      {/* Home Services & Real Estate — nested stacks so back stays within each section */}
      <MainStack.Screen name="HomeServices" getComponent={() => require('./src/navigation/HomeServicesNavigator').HomeServicesNavigator} />
      <MainStack.Screen name="RealEstate" getComponent={() => require('./src/navigation/RealEstateNavigator').RealEstateNavigator} />
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
                    <RootStack.Screen name="Onboarding" getComponent={() => require('./src/screens/Onboarding').Onboarding} />
                    <RootStack.Screen name="Auth" getComponent={() => require('./src/navigation/AuthNavigator').default} />
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
