import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { realEstateApi, type PropertyBooking } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-700 bg-amber-50',
  CONFIRMED: 'text-green-700 bg-green-50',
  CANCELLED: 'text-red-700 bg-red-50',
  COMPLETED: 'text-indigo-700 bg-indigo-50',
};

export function AgentReservationDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<PropertyBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const data = await realEstateApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      alert('Failed to load reservation details.');
      navigate('/real-estate/manage-listings');
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const updateStatus = async (status: 'CONFIRMED' | 'CANCELLED') => {
    if (!bookingId) return;
    const label = status === 'CONFIRMED' ? 'Confirm' : 'Cancel';
    if (!window.confirm(`${label} this reservation?`)) return;
    try {
      setSubmitting(true);
      const updated = await realEstateApi.updateBookingStatus(bookingId, status);
      setBooking(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update reservation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const customerName = booking.customer
    ? `${booking.customer.firstName || ''} ${booking.customer.lastName || ''}`.trim() || 'Customer'
    : 'Customer';
  const statusClass = STATUS_COLORS[booking.status] || 'text-gray-700 bg-gray-100';

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Reservation</h1>
          <p className="text-sm text-gray-500">{booking.bookingRef}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${statusClass}`}>
          {booking.status} · Payment {booking.paymentStatus}
        </div>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Property</h2>
          <p className="text-sm text-gray-700">{booking.listing?.title}</p>
          {booking.roomType?.name ? <p className="text-sm text-gray-500">Room: {booking.roomType.name}</p> : null}
          <p className="text-base font-bold text-violet-600">{formatPrice(booking.totalPrice, booking.currency)}</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Stay details</h2>
          <p className="text-sm text-gray-700">
            {format(new Date(booking.checkIn), 'EEE, MMM d, yyyy')} – {format(new Date(booking.checkOut), 'EEE, MMM d, yyyy')}
          </p>
          <p className="text-sm text-gray-500">
            {booking.nights} night{booking.nights !== 1 ? 's' : ''} · {booking.adults} adult{booking.adults !== 1 ? 's' : ''}
            {booking.children ? `, ${booking.children} child${booking.children !== 1 ? 'ren' : ''}` : ''} · {booking.roomsBooked} room{booking.roomsBooked !== 1 ? 's' : ''}
          </p>
          {booking.notes ? <p className="text-sm text-gray-600">Notes: {booking.notes}</p> : null}
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Guest</h2>
          <p className="text-sm text-gray-700">{customerName}</p>
          {booking.customer?.phoneNumber ? (
            <a href={`tel:${booking.customer.phoneNumber}`} className="flex items-center gap-2 text-sm text-violet-600">
              <Phone className="w-4 h-4" /> {booking.customer.phoneNumber}
            </a>
          ) : null}
          <p className="text-xs text-gray-400">Booked {format(new Date(booking.createdAt), 'MMM d, yyyy · h:mm a')}</p>
        </section>

        {booking.status === 'PENDING' && (
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('CONFIRMED')}
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('CANCELLED')}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        )}

        <Link to="/real-estate/manage-listings" className="block text-center text-sm text-violet-600 pt-2">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
