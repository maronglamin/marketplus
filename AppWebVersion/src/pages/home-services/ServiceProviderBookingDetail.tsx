import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, MapPin, Calendar, FileText, Clock, User } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { homeServicesApi, type ServiceBooking } from '../../api/homeServicesApi';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { formatStatus } from '../../utils/formatPrice';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
};

export function ServiceProviderBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');

  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const data = await homeServicesApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      navigate('/home-services/dashboard');
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigate]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const handleSubmitQuote = async () => {
    const price = parseFloat(quotePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price.');
      return;
    }
    if (!bookingId) return;
    try {
      setSubmitting(true);
      await homeServicesApi.quoteBooking(bookingId, price);
      setShowQuoteModal(false);
      setQuotePrice('');
      await loadBooking();
      alert('Quote submitted successfully.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit quote.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async () => {
    if (!bookingId || !window.confirm('Mark this service as completed?')) return;
    try {
      setSubmitting(true);
      await homeServicesApi.completeBooking(bookingId);
      await loadBooking();
      alert('Booking marked as completed.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete booking.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#6B7280';

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader
        title={booking.bookingRef}
        subtitle={booking.category?.name}
        backTo="/home-services/dashboard"
        right={
          <Link to={`/home-services/bookings/${bookingId}/chat`} className="p-2 text-sky-500 hover:bg-sky-50 rounded-lg">
            <MessageCircle className="w-5 h-5" />
          </Link>
        }
      />

      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: `${statusColor}15` }}>
          <span className="text-sm font-semibold" style={{ color: statusColor }}>
            {formatStatus(booking.status)}
          </span>
        </div>

        <section className="space-y-3">
          {booking.customer && (
            <DetailRow icon={<User className="w-4 h-4" />} label="Customer" value={`${booking.customer.firstName} ${booking.customer.lastName}`} />
          )}
          <DetailRow icon={<MapPin className="w-4 h-4" />} label="Address" value={booking.serviceAddress} />
          {booking.serviceLatitude != null && booking.serviceLongitude != null && (
            <LocationMapPreview
              location={{
                latitude: booking.serviceLatitude,
                longitude: booking.serviceLongitude,
                address: booking.serviceAddress,
              }}
              accent="text-sky-600"
            />
          )}
          {booking.scheduledAt && (
            <DetailRow icon={<Calendar className="w-4 h-4" />} label="Scheduled" value={new Date(booking.scheduledAt).toLocaleString()} />
          )}
          {booking.notes && (
            <DetailRow icon={<FileText className="w-4 h-4" />} label="Notes" value={booking.notes} />
          )}
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Created" value={new Date(booking.createdAt).toLocaleString()} />
        </section>

        {booking.status === 'PENDING_QUOTE' && (
          <button type="button" onClick={() => setShowQuoteModal(true)} className="w-full py-4 bg-sky-500 text-white font-semibold rounded-xl">
            Submit Quote
          </button>
        )}

        {booking.status === 'PAID' && (
          <button type="button" onClick={handleComplete} disabled={submitting} className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-60">
            Mark as Completed
          </button>
        )}
      </div>

      {showQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowQuoteModal(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Submit Quote</h3>
            <input
              type="number"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="Price"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowQuoteModal(false)} className="flex-1 py-2 border border-gray-300 rounded-lg">Cancel</button>
              <button type="button" onClick={handleSubmitQuote} disabled={submitting} className="flex-1 py-2 bg-sky-500 text-white rounded-lg disabled:opacity-60">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <div className="text-gray-400 mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
