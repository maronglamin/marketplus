import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { homeServicesApi, type ServiceBooking } from '../../api/homeServicesApi';
import { formatStatus } from '../../utils/formatPrice';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: 'text-amber-600 bg-amber-50',
  QUOTED: 'text-sky-600 bg-sky-50',
  ACCEPTED: 'text-emerald-600 bg-emerald-50',
  PAID: 'text-green-700 bg-green-50',
  COMPLETED: 'text-indigo-600 bg-indigo-50',
  REJECTED: 'text-red-600 bg-red-50',
  CANCELLED: 'text-gray-600 bg-gray-100',
};

export function MyServiceBookings() {
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await homeServicesApi.getMyBookings();
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="My Service Bookings" subtitle="Track your service requests" backTo="/home-services" />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 px-6">
          <p className="font-semibold text-gray-700">No bookings yet</p>
          <p className="text-sm text-gray-500 mt-1">Book a service to get started</p>
          <Link to="/home-services" className="inline-block mt-4 px-4 py-2 bg-sky-500 text-white text-sm rounded-lg">
            Browse Services
          </Link>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <button
            type="button"
            onClick={() => loadBookings(true)}
            disabled={refreshing}
            className="text-sm text-sky-600 hover:text-sky-700 mb-2"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              to={`/home-services/bookings/${booking.id}`}
              className="block p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{booking.bookingRef}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || 'text-gray-600 bg-gray-100'}`}>
                  {formatStatus(booking.status)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{booking.category?.name}</p>
              {booking.provider?.displayName && (
                <p className="text-sm text-gray-500 mt-0.5">{booking.provider.displayName}</p>
              )}
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                <MapPin className="w-3 h-3" /> {booking.serviceAddress}
              </p>
              {(booking.agreedPrice ?? booking.proposedPrice) != null && (
                <p className="text-sm font-semibold text-sky-600 mt-2">
                  {booking.currency} {(booking.agreedPrice ?? booking.proposedPrice)?.toLocaleString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
