import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home } from '../screens/Home';
import { Settings } from '../screens/Settings';
import { Notifications } from '../screens/Notifications';
import { AccountSettings } from '../screens/AccountSettings';
import { ProductDetail } from '../screens/ProductDetail';
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
import { ProductListing } from '../screens/ProductListing';
import { SellerProductDetail } from '../screens/SellerProductDetail';
import { UpdateStock } from '../screens/UpdateStock';
import { DeliveryOptions } from '../screens/DeliveryOptions';
import { RevenueDetails } from '../screens/RevenueDetails';
import { TransactionHistory } from '../screens/transactions/TransactionHistory';
import { TransactionDetail } from '../screens/transactions/TransactionDetail';
import { CustomerOrders } from '../screens/CustomerOrders';
import { OrderDetails } from '../screens/OrderDetails';
import { SellerInterestDetail } from '../screens/SellerInterestDetail';

export type AppStackParamList = {
  Home: undefined;
  Settings: undefined;
  Notifications: undefined;
  AccountSettings: undefined;
  ProductDetail: { productId: string };
  SellerDashboard: undefined;
  AddProduct: { productId?: string };
  ProductListing: undefined;
  SellerProductDetail: { productId: string };
  InterestManagement: undefined;
  CustomerOrders: undefined;
  ShowInterest: { productId: string };
  Order: { productId: string };
  OrderDetails: { orderId: string };
  SellerInterestDetail: { interestId: string };
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
};

const Stack = createNativeStackNavigator<AppStackParamList>();

const AppNavigator = () => {
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
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Settings" component={Settings} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="AccountSettings" component={AccountSettings} />
      <Stack.Screen name="ProductDetail" component={ProductDetail} />
      <Stack.Screen name="SellerDashboard" component={SellerDashboard} />
      <Stack.Screen name="AddProduct" component={AddProduct} />
      <Stack.Screen name="ProductListing" component={ProductListing} />
      <Stack.Screen name="SellerProductDetail" component={SellerProductDetail} />
      <Stack.Screen name="InterestManagement" component={InterestManagement} />
      <Stack.Screen name="CustomerOrders" component={CustomerOrders} />
      <Stack.Screen name="ShowInterest" component={ShowInterest} />
      <Stack.Screen name="Order" component={Order} />
      <Stack.Screen 
        name="SellerKycForm" 
        component={SellerKycForm}
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen 
        name="SellerKycBusiness" 
        component={SellerKycBusiness}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="SellerKycAddress" 
        component={SellerKycAddress}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="SellerKycVerification" 
        component={SellerKycVerification}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen 
        name="SellerKycConfirmation" 
        component={SellerKycConfirmation}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen name="UpdateStock" component={UpdateStock} />
      <Stack.Screen name="DeliveryOptions" component={DeliveryOptions} />
      <Stack.Screen name="RevenueDetails" component={RevenueDetails} />
      <Stack.Screen name="TransactionHistory" component={TransactionHistory} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetail} />
      <Stack.Screen name="OrderDetails" component={OrderDetails} />
      <Stack.Screen name="SellerInterestDetail" component={SellerInterestDetail} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 