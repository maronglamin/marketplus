import React from 'react';
import { Route } from 'react-router-dom';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Header } from '../components/Header';
import { BottomNavigation } from '../components/BottomNavigation';
import { HomeServicesHub } from '../pages/home-services/HomeServicesHub';
import { ServiceProvidersList } from '../pages/home-services/ServiceProvidersList';
import { ServiceProviderDetail } from '../pages/home-services/ServiceProviderDetail';
import { ServiceBookingRequest } from '../pages/home-services/ServiceBookingRequest';
import { MyServiceBookings } from '../pages/home-services/MyServiceBookings';
import { ServiceBookingDetail } from '../pages/home-services/ServiceBookingDetail';
import { ServiceBookingChat } from '../pages/home-services/ServiceBookingChat';
import { BecomeServiceProvider } from '../pages/home-services/BecomeServiceProvider';
import { ServiceProviderDashboard } from '../pages/home-services/ServiceProviderDashboard';
import { ServiceProviderBookingDetail } from '../pages/home-services/ServiceProviderBookingDetail';
import { ManageServiceOfferings } from '../pages/home-services/ManageServiceOfferings';
import { ProviderAvailabilityEditor } from '../pages/home-services/ProviderAvailabilityEditor';
import { RealEstateHub } from '../pages/real-estate/RealEstateHub';
import { PropertyListingBrowse } from '../pages/real-estate/PropertyListingBrowse';
import { PropertyDetail } from '../pages/real-estate/PropertyDetail';
import { PropertyVirtualTour } from '../pages/real-estate/PropertyVirtualTour';
import { PropertyBookingForm } from '../pages/real-estate/PropertyBookingForm';
import { PropertyInquiryForm } from '../pages/real-estate/PropertyInquiryForm';
import { MyPropertyBookings } from '../pages/real-estate/MyPropertyBookings';
import { BecomePropertyAgent } from '../pages/real-estate/BecomePropertyAgent';
import { ManageListings } from '../pages/real-estate/ManageListings';
import { ListProperty } from '../pages/real-estate/ListProperty';
import { ListingSetup } from '../pages/real-estate/ListingSetup';

function AppLayout({ children, protected: isProtected = false }: { children: React.ReactNode; protected?: boolean }) {
  const content = (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 pb-16">{children}</main>
      <BottomNavigation />
    </div>
  );
  return isProtected ? <ProtectedRoute>{content}</ProtectedRoute> : content;
}

export const serviceRoutes = (
  <>
    <Route path="/home-services" element={<AppLayout><HomeServicesHub /></AppLayout>} />
    <Route path="/home-services/categories/:categoryId" element={<AppLayout><ServiceProvidersList /></AppLayout>} />
    <Route path="/home-services/providers/:providerId" element={<AppLayout><ServiceProviderDetail /></AppLayout>} />
    <Route path="/home-services/book" element={<AppLayout protected><ServiceBookingRequest /></AppLayout>} />
    <Route path="/home-services/my-bookings" element={<AppLayout protected><MyServiceBookings /></AppLayout>} />
    <Route path="/home-services/bookings/:bookingId" element={<AppLayout protected><ServiceBookingDetail /></AppLayout>} />
    <Route path="/home-services/bookings/:bookingId/chat" element={<AppLayout protected><ServiceBookingChat /></AppLayout>} />
    <Route path="/home-services/become-provider" element={<AppLayout protected><BecomeServiceProvider /></AppLayout>} />
    <Route path="/home-services/dashboard" element={<AppLayout protected><ServiceProviderDashboard /></AppLayout>} />
    <Route path="/home-services/dashboard/services" element={<AppLayout protected><ManageServiceOfferings /></AppLayout>} />
    <Route path="/home-services/dashboard/availability" element={<AppLayout protected><ProviderAvailabilityEditor /></AppLayout>} />
    <Route path="/home-services/provider/bookings/:bookingId" element={<AppLayout protected><ServiceProviderBookingDetail /></AppLayout>} />
    <Route path="/real-estate" element={<AppLayout><RealEstateHub /></AppLayout>} />
    <Route path="/real-estate/browse/:listingType" element={<AppLayout><PropertyListingBrowse /></AppLayout>} />
    <Route path="/real-estate/listings/:listingId" element={<AppLayout><PropertyDetail /></AppLayout>} />
    <Route path="/real-estate/listings/:listingId/setup" element={<AppLayout protected><ListingSetup /></AppLayout>} />
    <Route path="/real-estate/listings/:listingId/tour" element={<AppLayout><PropertyVirtualTour /></AppLayout>} />
    <Route path="/real-estate/listings/:listingId/book" element={<AppLayout protected><PropertyBookingForm /></AppLayout>} />
    <Route path="/real-estate/listings/:listingId/inquire" element={<AppLayout protected><PropertyInquiryForm /></AppLayout>} />
    <Route path="/real-estate/my-reservations" element={<AppLayout protected><MyPropertyBookings /></AppLayout>} />
    <Route path="/real-estate/become-agent" element={<AppLayout protected><BecomePropertyAgent /></AppLayout>} />
    <Route path="/real-estate/manage-listings" element={<AppLayout protected><ManageListings /></AppLayout>} />
    <Route path="/real-estate/list-property" element={<AppLayout protected><ListProperty /></AppLayout>} />
  </>
);
