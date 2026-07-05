import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MessageCircle, MapPin, Calendar, FileText, Clock, User, CreditCard } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import StripePaymentModal from '../../components/StripePaymentModal';
import { useAuth } from '../../contexts/AuthContext';
import { homeServicesApi, type ServiceBooking } from '../../api/homeServicesApi';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import {
  loadSavedPaymentMethods,
  getDefaultPaymentMethodId,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';
import { PaymentMethod } from '../../api/paymentMethods';
import { formatStatus } from '../../utils/formatPrice';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

export function ServiceBookingDetail() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<ServiceBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [error, setError] = useState('');

  const loadBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      setLoading(true);
      const data = await homeServicesApi.getBooking(bookingId);
      setBooking(data);
    } catch {
      setError('Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    loadBooking();
  }, [loadBooking]);

  const completePayment = async (gatewayId: string, paymentIntentId?: string) => {
    if (!bookingId) return;
    const result = await homeServicesApi.processPayment(bookingId, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      window.open(launchUrl, '_blank');
      return;
    }
    await loadBooking();
  };

  const handlePayPress = async () => {
    try {
      setActionLoading(true);
      const methods = await loadSavedPaymentMethods();
      if (methods.length === 0) {
        alert('No payment methods found. Please add a payment method in your account settings.');
        return;
      }
      setPaymentMethods(methods);
      setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
      setShowPaymentSelector(true);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (!booking) return;
    const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');

    if (method.type === 'CASH') {
      alert('Cash payment is not supported.');
      return;
    }

    if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
      setShowStripe(true);
    } else if (method.type === 'MOBILE_MONEY' && (isYonna || isWave)) {
      try {
        setActionLoading(true);
        await completePayment(isYonna ? 'yonna-forex' : 'wave-gambia');
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Payment could not be processed.');
      } finally {
        setActionLoading(false);
      }
    } else {
      try {
        setActionLoading(true);
        await completePayment(resolveGatewayPaymentMethodId(method));
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Payment could not be processed.');
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleAcceptQuote = async () => {
    if (!bookingId || !window.confirm('Accept this quote and proceed to payment?')) return;
    try {
      setActionLoading(true);
      const updated = await homeServicesApi.acceptBooking(bookingId);
      setBooking(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to accept quote.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">{error || 'Booking not found'}</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sky-600 text-sm">Go back</button>
      </div>
    );
  }

  const statusColor = STATUS_COLORS[booking.status] || '#6B7280';
  const displayPrice = booking.agreedPrice ?? booking.proposedPrice;

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader
        title={booking.bookingRef}
        subtitle={booking.category?.name}
        backTo="/home-services/my-bookings"
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
          <h2 className="font-semibold text-gray-900">Details</h2>
          {booking.provider?.displayName && (
            <DetailRow icon={<User className="w-4 h-4" />} label="Provider" value={booking.provider.displayName} />
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
          {displayPrice != null && (
            <DetailRow
              icon={<CreditCard className="w-4 h-4" />}
              label={booking.agreedPrice ? 'Agreed Price' : 'Quoted Price'}
              value={`${booking.currency} ${displayPrice.toLocaleString()}`}
            />
          )}
          <DetailRow icon={<Clock className="w-4 h-4" />} label="Created" value={new Date(booking.createdAt).toLocaleString()} />
        </section>

        {booking.status === 'QUOTED' && (
          <button
            type="button"
            onClick={handleAcceptQuote}
            disabled={actionLoading}
            className="w-full py-4 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-60"
          >
            Accept Quote
          </button>
        )}

        {booking.status === 'ACCEPTED' && (
          <button
            type="button"
            onClick={handlePayPress}
            disabled={actionLoading}
            className="w-full py-4 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-60"
          >
            Pay {booking.currency} {booking.agreedPrice?.toLocaleString()}
          </button>
        )}

        <Link
          to={`/home-services/bookings/${bookingId}/chat`}
          className="block w-full py-3 text-center border border-sky-200 bg-sky-50 text-sky-600 font-medium rounded-xl hover:bg-sky-100"
        >
          Open Chat
        </Link>
      </div>

      {showPaymentSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentSelector(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
              <button type="button" onClick={() => setShowPaymentSelector(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-4 bg-sky-50 text-sky-800 font-medium text-sm">
              Amount: {booking.currency} {booking.agreedPrice?.toLocaleString()}
            </div>
            <div className="p-4 space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethodId(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left ${
                    selectedPaymentMethodId === method.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{method.accountName || method.provider}</p>
                    <p className="text-xs text-gray-500">{method.type.replace(/_/g, ' ')}</p>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${selectedPaymentMethodId === method.id ? 'border-sky-500 bg-sky-500' : 'border-gray-300'}`} />
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                disabled={!selectedPaymentMethodId || actionLoading}
                onClick={async () => {
                  const method = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
                  if (!method) return;
                  setShowPaymentSelector(false);
                  await handlePaymentMethodSelect(method);
                }}
                className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl disabled:opacity-60"
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {booking.agreedPrice != null && user?.id && (
        <StripePaymentModal
          isOpen={showStripe}
          onClose={() => setShowStripe(false)}
          amount={booking.agreedPrice}
          currency={booking.currency}
          orderId={booking.id}
          customerId={user.id}
          onPaymentSuccess={async (data) => {
            await completePayment('stripe', data?.paymentIntentId || data?.id);
            setShowStripe(false);
          }}
        />
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
