import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RealEstateHub } from '../screens/real-estate/RealEstateHub';
import { PropertyListingBrowse } from '../screens/real-estate/PropertyListingBrowse';
import { PropertyDetail } from '../screens/real-estate/PropertyDetail';
import { PropertyVirtualTour } from '../screens/real-estate/PropertyVirtualTour';
import { PropertyBookingForm } from '../screens/real-estate/PropertyBookingForm';
import { PropertyInquiryForm } from '../screens/real-estate/PropertyInquiryForm';
import { MyPropertyBookings } from '../screens/real-estate/MyPropertyBookings';
import { BecomePropertyAgent } from '../screens/real-estate/BecomePropertyAgent';
import { ManageListings } from '../screens/real-estate/ManageListings';
import { ListProperty } from '../screens/real-estate/ListProperty';
import { ListingSetup } from '../screens/real-estate/ListingSetup';

export type RealEstateStackParamList = {
  RealEstateHub: undefined;
  PropertyListingBrowse: {
    listingType: 'HOTEL' | 'APARTMENT_RENTAL' | 'HOME_SALE' | 'LAND_SALE';
    title: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  };
  PropertyDetail: { listingId: string };
  PropertyVirtualTour: { listingId?: string; tourUrl: string; tourType?: string; title?: string };
  PropertyBookingForm: {
    listingId: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
    childAges?: number[];
    roomTypeId?: string;
    roomsBooked?: number;
  };
  PropertyInquiryForm: { listingId: string };
  MyPropertyBookings: undefined;
  BecomePropertyAgent: undefined;
  ManageListings: undefined;
  ListProperty: undefined;
  ListingSetup: { listingId: string; listingTitle: string };
};

const Stack = createNativeStackNavigator<RealEstateStackParamList>();

export function RealEstateNavigator() {
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
      <Stack.Screen name="RealEstateHub" component={RealEstateHub} />
      <Stack.Screen name="PropertyListingBrowse" component={PropertyListingBrowse} />
      <Stack.Screen name="PropertyDetail" component={PropertyDetail} />
      <Stack.Screen name="PropertyVirtualTour" component={PropertyVirtualTour} />
      <Stack.Screen name="PropertyBookingForm" component={PropertyBookingForm} />
      <Stack.Screen name="PropertyInquiryForm" component={PropertyInquiryForm} />
      <Stack.Screen name="MyPropertyBookings" component={MyPropertyBookings} />
      <Stack.Screen name="BecomePropertyAgent" component={BecomePropertyAgent} />
      <Stack.Screen name="ManageListings" component={ManageListings} />
      <Stack.Screen name="ListProperty" component={ListProperty} />
      <Stack.Screen name="ListingSetup" component={ListingSetup} />
    </Stack.Navigator>
  );
}
