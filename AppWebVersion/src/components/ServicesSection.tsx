import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Building2, Bed, ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { homeServicesApi, type ServiceBooking } from '../api/homeServicesApi';
import { realEstateApi, type PropertyListing } from '../api/realEstateApi';
import { formatPrice, formatStatus } from '../utils/formatPrice';
import { getListingCoverUrl } from '../utils/propertyImages';

const SERVICE_STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: 'text-amber-600 bg-amber-50',
  QUOTED: 'text-sky-600 bg-sky-50',
  ACCEPTED: 'text-emerald-600 bg-emerald-50',
  PAID: 'text-green-700 bg-green-50',
  COMPLETED: 'text-indigo-600 bg-indigo-50',
};

export function ServicesSection() {
  const { isAuthenticated } = useAuth();
  const [recentBookings, setRecentBookings] = useState<ServiceBooking[]>([]);
  const [featuredProperties, setFeaturedProperties] = useState<PropertyListing[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    realEstateApi.getFeatured(6).then(setFeaturedProperties).catch(() => setFeaturedProperties([]));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecentBookings([]);
      return;
    }
    setLoadingBookings(true);
    homeServicesApi.getMyBookings()
      .then((data) => setRecentBookings(data.slice(0, 3)))
      .catch(() => setRecentBookings([]))
      .finally(() => setLoadingBookings(false));
  }, [isAuthenticated]);

  return (
    <div className="space-y-4 mb-4">
      {/* Service hub cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/home-services"
          className="relative overflow-hidden rounded-xl shadow-sm group h-36 bg-gradient-to-br from-sky-500 to-sky-600"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
          <div className="relative p-5 flex flex-col justify-between h-full text-white">
            <Wrench className="w-8 h-8 opacity-90" />
            <div>
              <h3 className="text-lg font-semibold">Home & Professional Services</h3>
              <p className="text-sm text-sky-100">Book trusted trades & coaches</p>
            </div>
          </div>
        </Link>

        <Link
          to="/real-estate?section=stay"
          className="relative overflow-hidden rounded-xl shadow-sm group h-36 bg-gradient-to-br from-violet-600 to-violet-700"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
          <div className="relative p-5 flex flex-col justify-between h-full text-white">
            <Bed className="w-8 h-8 opacity-90" />
            <div>
              <h3 className="text-lg font-semibold">Stay & Accommodation</h3>
              <p className="text-sm text-violet-100">Hotels, rentals, lodges & trips</p>
            </div>
          </div>
        </Link>

        <Link
          to="/real-estate?section=realestate"
          className="relative overflow-hidden rounded-xl shadow-sm group h-36 bg-gradient-to-br from-emerald-600 to-emerald-700"
        >
          <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
          <div className="relative p-5 flex flex-col justify-between h-full text-white">
            <Building2 className="w-8 h-8 opacity-90" />
            <div>
              <h3 className="text-lg font-semibold">Real Estate</h3>
              <p className="text-sm text-emerald-100">Homes & land for sale</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Home Services section */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">Home Services</h3>
          <Link to="/home-services" className="flex items-center text-sm text-sky-600 hover:text-sky-700">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {loadingBookings ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentBookings.length > 0 ? (
          <div className="space-y-3">
            {recentBookings.map((booking) => (
              <Link
                key={booking.id}
                to={`/home-services/bookings/${booking.id}`}
                className="block p-3 rounded-lg border border-gray-100 hover:border-sky-200 hover:bg-sky-50/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-900">{booking.bookingRef}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SERVICE_STATUS_COLORS[booking.status] || 'text-gray-600 bg-gray-100'}`}>
                    {formatStatus(booking.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{booking.category?.name}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">Book plumbers, cleaners, electricians & more</p>
            <Link
              to="/home-services"
              className="inline-block px-4 py-2 bg-sky-500 text-white text-sm font-medium rounded-lg hover:bg-sky-600"
            >
              Book a Service
            </Link>
          </div>
        )}
      </div>

      {/* Properties section */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-800">Properties</h3>
          <Link to="/real-estate" className="flex items-center text-sm text-violet-600 hover:text-violet-700">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {featuredProperties.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {featuredProperties.map((listing) => {
              const imageUrl = getListingCoverUrl(listing);
              return (
                <Link
                  key={listing.id}
                  to={`/real-estate/listings/${listing.id}`}
                  className="flex-none w-48 rounded-lg overflow-hidden border border-gray-100 hover:border-violet-200 transition-colors"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={listing.title} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-gray-100 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{listing.title}</p>
                    <p className="text-sm font-semibold text-violet-600 mt-1">
                      {formatPrice(listing.price, listing.currency)}
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {listing.city}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-3">Hotels, apartments, homes & land</p>
            <Link
              to="/real-estate"
              className="inline-block px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
            >
              Browse Properties
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
