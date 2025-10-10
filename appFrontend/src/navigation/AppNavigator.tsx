import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../screens/Home';
import { Settings } from '../screens/Settings';
import { BranchesScreen } from '../screens/reps-reports/BranchesScreen';
import { SalesRepsScreen } from '../screens/SalesRepsScreen';
import { SettlementsScreen } from '../screens/SettlementsScreen';
import { ReportsScreen } from '../screens/ReportsScreen';
import { Notifications } from '../screens/Notifications';
import { AccountSettings } from '../screens/AccountSettings';
import Delivery from '@screens/account-settings/Delivery';
import { AccountType } from '../screens/account-settings/AccountType';
import Permissions from '../screens/account-settings/Permissions';
import { ServiceTerms } from '../screens/account-settings/ServiceTerms';
import { Notifications as NotificationsSettings } from '../screens/account-settings/Notifications';
import { PaymentMethods } from '../screens/account-settings/PaymentMethods';
import { ProductDetail } from '../screens/products/buyer/ProductDetail';
import { SellerDashboard } from '../screens/SellerDashboard';
import { AddProduct } from '../screens/add-product';
import { InterestManagement } from '../screens/InterestManagement';
import { ShowInterest } from '../screens/ShowInterest';
import { Order } from '../screens/Order';
import { SellerKycForm } from '../screens/SellerKycForm';
import { SellerKycBusiness } from '../screens/SellerKycBusiness';
import { SellerKycAddress } from '../screens/SellerKycAddress';
import { SellerKycVerification } from '../screens/SellerKycVerification';
import { SellerKycConfirmation } from '../screens/SellerKycConfirmation';
import { SellerKycResponse } from '../services/kycService';
import { ProductListing } from '../screens/products/buyer/ProductListing';
import { SellerProductDetail } from '../screens/SellerProductDetail';
import { UpdateStock } from '../screens/UpdateStock';
import { DeliveryOptions } from '../screens/DeliveryOptions';
import { RevenueDetails } from '../screens/RevenueDetails';
import { TransactionHistory } from '../screens/transactions/TransactionHistory';
import { TransactionDetail } from '../screens/transactions/TransactionDetail';
import { SettlementRequest } from '../screens/transactions/SettlementRequest';
import { SettlementHistory } from '../screens/transactions/SettlementHistory';
import { SettlementDetail } from '../screens/transactions/SettlementDetail';
import { RideSettlementRequest } from '../screens/transactions/RideSettlementRequest';
import { CustomerOrders } from '../screens/CustomerOrders';
import { OrderDetails } from '../screens/OrderDetails';
import { SellerInterestDetail } from '../screens/SellerInterestDetail';
import { RideRequest } from '../screens/RideRequest';
import { FeaturedProducts } from '../screens/products/buyer/FeaturedProducts';
import { ChatList } from '../screens/ChatList';
import { BecomeRider } from '../screens/riders/BecomeRider';
import { DriverDashboard } from '../screens/DriverDashboard';
import { DriverRequests } from '../screens/DriverRequests';
import { DriverEarnings } from '../screens/DriverEarnings';
import { DriverSettings } from '../screens/driverManagement/DriverSettings';
import { DriverProfile } from '../screens/driverManagement/DriverProfile';
import { JourneyMapView } from '../screens/JourneyMapView';
import { CustomerRides } from '../screens/CustomerRides';
import { CustomerRideHistory } from '../screens/CustomerRideHistory';
import { CustomerRideService } from '../screens/CustomerRideService';
import { RideTracking } from '../screens/RideTracking';
import { TokenNotificationCard } from '../components/TokenNotificationCard';
import { View } from 'react-native';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import RentalRequestScreen from '../screens/RentalRequest';
import RentalDetailScreen from '../screens/RentalDetail';
import RentalChatScreen from '../screens/RentalChat';
import AssetRentalScreen from '../screens/AssetRental';
import VehicleDetailsScreen from '../screens/VehicleDetailsScreen';
import CustomerRidesRecordsScreen from '../screens/CustomerRidesRecords';
import FeaturedByCategoriesScreen from '../screens/FeaturedByCategories';
import PopularProductsScreen from '../screens/PopularProducts';
import NewArrivalsScreen from '../screens/NewArrivals';
import UserSearch from '../screens/UserSearch';
import { ProductCategoryOptions } from '../screens/ProductCategoryOptions';
import { RepsActivity } from '../screens/RepsActivity';
import { RepOrderReport } from '../screens/reps-reports/RepOrderReport';
import { RepProductReport } from '../screens/reps-reports/RepProductReport';

export type AppStackParamList = {
  Home: { openSearch?: boolean } | undefined;
  Settings: undefined;
  BranchesScreen: undefined;
  SalesRepsScreen: undefined;
  SettlementsScreen: undefined;
  ReportsScreen: undefined;
  RepsActivity: undefined;
  RepOrderReport: undefined;
  RepProductReport: undefined;
  Notifications: undefined;
  AccountSettings: undefined;
  AccountType: undefined;
  Permissions: undefined;
  ServiceTerms: undefined;
  NotificationsSettings: undefined;
  PaymentMethods: undefined;
  Delivery: undefined;
  ProductDetail: { productId: string };
  SellerDashboard: undefined;
  AddProduct: { productId?: string };
  ProductListing: { searchQuery?: string; filteredProducts?: any[] } | undefined;
  SellerProductDetail: { productId: string };
  InterestManagement: undefined;
  CustomerOrders: undefined;
  ShowInterest: { productId: string };
  Order: { productId: string };
  OrderDetails: { orderId: string };
  SellerInterestDetail: { interestId: string };
  ChatList: undefined;
  RideRequest: {
    showRoute?: boolean;
    pickupLocation?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    destinationLocation?: {
      latitude: number;
      longitude: number;
      address: string;
    };
    routeData?: {
      distance: number;
      duration: number;
      price: number;
    };
  } | undefined;
  FeaturedProducts: undefined;
  SellerKycForm: undefined | {
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
  UpdateStock: { productId: string };
  DeliveryOptions: { productId: string };
  RevenueDetails: undefined;
  TransactionHistory: { currency: string; currencySymbol: string };
  TransactionDetail: { transactionId: string; currency: string; currencySymbol: string };
  SettlementRequest: undefined;
  SettlementHistory: undefined;
  SettlementDetail: { settlementId: string; currency: string; currencySymbol: string };
  RideSettlementRequest: undefined;
  BecomeRider: { 
    type: 'driver' | 'motorcycle' | 'bicycle';
    existingData?: any;
  };
  DriverDashboard: undefined;
  DriverRequests: undefined;
  DriverEarnings: undefined;
  DriverSettings: undefined;
  DriverProfile: undefined;
  JourneyMapView: {
    rideId: string;
    pickupLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    destinationLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    customerName: string;
    estimatedDuration: string;
    estimatedDistance: string;
    totalFare: number;
    currencySymbol: string;
  };
  CustomerRideService: undefined;
  CustomerRides: undefined;
  CustomerRideHistory: undefined;
  CustomerRidesRecords: undefined;
  FeaturedByCategories: { categoryId: string; categoryName: string };
  PopularProducts: undefined;
  NewArrivals: undefined;
  UserSearch: undefined;
  ProductCategoryOptions: undefined;
  RentalRequest: undefined;
  RentalDetail: { rentalId: string };
  RentalChat: { rentalId: string };
  AssetRental: undefined;
  VehicleDetails: {
    driver: any;
    selectedService: any;
    scheduleData: any;
  };
  RideTracking: {
    rideId: string;
    requestId: string;
    pickupLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    destinationLocation: {
      latitude: number;
      longitude: number;
      address: string;
    };
    driver?: {
      id: string;
      firstName: string;
      lastName: string;
      rating?: number;
      vehicleInfo?: {
        model?: string;
        color?: string;
        plateNumber?: string;
      };
    };
  };
  PrivacyPolicy: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <TokenNotificationCard />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      >
        <Stack.Screen 
          name="Home" 
          component={Home}
          options={{
            gestureEnabled: false, // Disable swipe back gesture
          }}
        />
        <Stack.Screen name="SellerInterestDetail" component={SellerInterestDetail} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="BranchesScreen" component={BranchesScreen} />
        <Stack.Screen name="SalesRepsScreen" component={SalesRepsScreen} />
        <Stack.Screen name="SettlementsScreen" component={SettlementsScreen} />
        <Stack.Screen name="ReportsScreen" component={ReportsScreen} />
        <Stack.Screen name="RepsActivity" component={RepsActivity} />
        <Stack.Screen name="RepOrderReport" component={RepOrderReport} />
        <Stack.Screen name="RepProductReport" component={RepProductReport} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="AccountSettings" component={AccountSettings} />
        <Stack.Screen name="AccountType" component={AccountType} />
        <Stack.Screen name="Permissions" component={Permissions} />
        <Stack.Screen name="ServiceTerms" component={ServiceTerms} />
        <Stack.Screen name="NotificationsSettings" component={NotificationsSettings} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethods} />
        <Stack.Screen name="Delivery" component={Delivery} />
        <Stack.Screen name="ProductDetail" component={ProductDetail} />
        <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
        <Stack.Screen name="AddProduct" component={AddProduct} />
        <Stack.Screen name="ProductListing" component={ProductListing} />
        <Stack.Screen name="FeaturedProducts" component={FeaturedProducts} />
        <Stack.Screen name="SellerProductDetail" component={SellerProductDetail} />
        <Stack.Screen name="InterestManagement" component={InterestManagement} />
        <Stack.Screen name="CustomerOrders" component={CustomerOrders} />
        <Stack.Screen name="ShowInterest" component={ShowInterest} />
        <Stack.Screen name="Order" component={Order} />
        <Stack.Screen name="SellerKycForm" component={SellerKycForm} options={{ animation: 'fade' }} />
        <Stack.Screen name="SellerKycBusiness" component={SellerKycBusiness} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SellerKycAddress" component={SellerKycAddress} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SellerKycVerification" component={SellerKycVerification} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="SellerKycConfirmation" component={SellerKycConfirmation} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="UpdateStock" component={UpdateStock} />
        <Stack.Screen name="DeliveryOptions" component={DeliveryOptions} />
        <Stack.Screen name="RevenueDetails" component={RevenueDetails} />
        <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
        <Stack.Screen name="TransactionDetail" component={TransactionDetail} />
        <Stack.Screen name="SettlementRequest" component={SettlementRequest} />
        <Stack.Screen name="SettlementHistory" component={SettlementHistory} />
        <Stack.Screen name="SettlementDetail" component={SettlementDetail} />
        <Stack.Screen name="RideSettlementRequest" component={RideSettlementRequest} />
        <Stack.Screen name="OrderDetails" component={OrderDetails} />
        <Stack.Screen name="ChatList" component={ChatList} />
        <Stack.Screen name="RideRequest" component={RideRequest} />
        <Stack.Screen name="BecomeRider" component={BecomeRider} />
        <Stack.Screen name="DriverDashboard" component={DriverDashboard} options={{ gestureEnabled: true }} />
        <Stack.Screen name="DriverRequests" component={DriverRequests} options={{ gestureEnabled: true }} />
        <Stack.Screen name="DriverEarnings" component={DriverEarnings} options={{ gestureEnabled: true }} />
        <Stack.Screen name="DriverSettings" component={DriverSettings} options={{ gestureEnabled: true }} />
        <Stack.Screen name="DriverProfile" component={DriverProfile} options={{ gestureEnabled: true }} />
        <Stack.Screen name="JourneyMapView" component={JourneyMapView} options={{ gestureEnabled: true }} />
        <Stack.Screen name="CustomerRideService" component={CustomerRideService} />
        <Stack.Screen name="CustomerRides" component={CustomerRides} />
        <Stack.Screen name="CustomerRideHistory" component={CustomerRideHistory} />
        <Stack.Screen name="CustomerRidesRecords" component={CustomerRidesRecordsScreen} />
        <Stack.Screen name="FeaturedByCategories" component={FeaturedByCategoriesScreen} />
        <Stack.Screen name="PopularProducts" component={PopularProductsScreen} />
        <Stack.Screen name="NewArrivals" component={NewArrivalsScreen} />
        <Stack.Screen name="UserSearch" component={UserSearch} />
        <Stack.Screen name="ProductCategoryOptions" component={ProductCategoryOptions} />
        <Stack.Screen name="RentalRequest" component={RentalRequestScreen} />
        <Stack.Screen name="RentalDetail" component={RentalDetailScreen} />
        <Stack.Screen name="RentalChat" component={RentalChatScreen} />
        <Stack.Screen name="AssetRental" component={AssetRentalScreen} />
        <Stack.Screen name="VehicleDetails" component={VehicleDetailsScreen} />
        <Stack.Screen name="RideTracking" component={RideTracking} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      </Stack.Navigator>
    </View>
  );
} 