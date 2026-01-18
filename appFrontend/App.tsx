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
import { OrderDetails } from './src/screens/OrderDetails';
import { CustomerOrders } from './src/screens/CustomerOrders';
import ChangePin from './src/screens/ChangePin';
import { RideRequest } from './src/screens/RideRequest';
import { BecomeRider } from './src/screens/riders/BecomeRider';
import { SalesRepsScreen } from './src/screens/SalesRepsScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettlementsScreen } from './src/screens/SettlementsScreen';
import { BranchesScreen } from './src/screens/reps-reports/BranchesScreen';
import { RevenueDetails } from './src/screens/RevenueDetails';
import { TransactionHistory } from './src/screens/transactions/TransactionHistory';
import { SettlementHistory } from './src/screens/transactions/SettlementHistory';
import { SellerInterestDetail } from './src/screens/SellerInterestDetail';
import { SettlementRequest } from './src/screens/transactions/SettlementRequest';
import { TransactionDetail } from './src/screens/transactions/TransactionDetail';
import { DriverDashboard } from './src/screens/DriverDashboard';
import { DriverSettings } from './src/screens/driverManagement/DriverSettings';
import { DriverProfile } from './src/screens/driverManagement/DriverProfile';
import { DriverEarnings } from './src/screens/DriverEarnings';
import { DriverRequests } from './src/screens/DriverRequests';
import { RentalEarnings } from './src/screens/RentalEarnings';
import AssetRental from './src/screens/AssetRental';
import NewPin from './src/screens/NewPin';
import ConfirmPin from './src/screens/ConfirmPin';
import PermissionsScreen from './src/screens/account-settings/Permissions';
import { PaymentMethods } from './src/screens/account-settings/PaymentMethods';
import Delivery from './src/screens/account-settings/Delivery';
import { ServiceTerms } from './src/screens/account-settings/ServiceTerms';
import PrivacyPolicy from './src/screens/PrivacyPolicy';
import { AccountDeletion } from './src/screens/account-settings/AccountDeletion';
import { AccountType } from './src/screens/account-settings/AccountType';
import * as ExpoNotifications from 'expo-notifications';
import { realTimeRideService } from './src/services/realTimeRideService';
import { SellerKycForm } from './src/screens/SellerKycForm';
import { SellerKycBusiness } from './src/screens/SellerKycBusiness';
import { SellerKycAddress } from './src/screens/SellerKycAddress';
import { SellerKycVerification } from './src/screens/SellerKycVerification';
import { SellerKycConfirmation } from './src/screens/SellerKycConfirmation';
import { SellerKycResponse } from './src/services/kycService';
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
      <MainStack.Screen name="OrderDetails" component={OrderDetails} />
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
      <MainStack.Screen name="RideRequest" component={RideRequest} />
      <MainStack.Screen name="BecomeRider" component={BecomeRider} />
      {/* Account & settings related routes (require login via upstream guards) */}
      <MainStack.Screen name="CustomerOrders" component={CustomerOrders} />
      <MainStack.Screen name="ChangePin" component={ChangePin} />
      <MainStack.Screen name="NewPin" component={NewPin} />
      <MainStack.Screen name="ConfirmPin" component={ConfirmPin} />
      <MainStack.Screen name="Permissions" component={PermissionsScreen} />
      <MainStack.Screen name="PaymentMethods" component={PaymentMethods} />
      <MainStack.Screen name="Delivery" component={Delivery} />
      {/* Route notifications settings to Permissions to manage OS-level permissions */}
      <MainStack.Screen name="NotificationsSettings" component={PermissionsScreen} />
      <MainStack.Screen name="ServiceTerms" component={ServiceTerms} />
      <MainStack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      <MainStack.Screen name="AccountDeletion" component={AccountDeletion} />
      <MainStack.Screen name="AccountType" component={AccountType} />
      {/* Seller/Rep management screens */}
      <MainStack.Screen name="SalesRepsScreen" component={SalesRepsScreen} />
      <MainStack.Screen name="ReportsScreen" component={ReportsScreen} />
      <MainStack.Screen name="SettlementsScreen" component={SettlementsScreen} />
      <MainStack.Screen name="BranchesScreen" component={BranchesScreen} />
      <MainStack.Screen name="RevenueDetails" component={RevenueDetails} />
      <MainStack.Screen name="TransactionHistory" component={TransactionHistory} />
      <MainStack.Screen name="SettlementHistory" component={SettlementHistory} />
      <MainStack.Screen name="SellerInterestDetail" component={SellerInterestDetail} />
      <MainStack.Screen name="SettlementRequest" component={SettlementRequest} />
      <MainStack.Screen name="TransactionDetail" component={TransactionDetail} />
      <MainStack.Screen name="DriverDashboard" component={DriverDashboard} />
      <MainStack.Screen name="DriverSettings" component={DriverSettings} />
      <MainStack.Screen name="DriverProfile" component={DriverProfile} />
      <MainStack.Screen name="DriverEarnings" component={DriverEarnings} />
      <MainStack.Screen name="DriverRequests" component={DriverRequests} />
      <MainStack.Screen name="RentalEarnings" component={RentalEarnings} />
      <MainStack.Screen name="AssetRental" component={AssetRental} />
      {/* Seller KYC flow */}
      <MainStack.Screen name="SellerKycForm" component={SellerKycForm} />
      <MainStack.Screen name="SellerKycBusiness" component={SellerKycBusiness} />
      <MainStack.Screen name="SellerKycAddress" component={SellerKycAddress} />
      <MainStack.Screen name="SellerKycVerification" component={SellerKycVerification} />
      <MainStack.Screen name="SellerKycConfirmation" component={SellerKycConfirmation} />
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
