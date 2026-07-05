import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { PageHeader } from '../../components/PageHeader';
import StripePaymentModal from '../../components/StripePaymentModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  realEstateApi,
  type PropertyBooking,
  type PropertyInquiry,
} from '../../api/realEstateApi';
import {
  loadSavedPaymentMethods,
  getDefaultPaymentMethodId,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';
import { PaymentMethod } from '../../api/paymentMethods';
import { formatPrice } from '../../utils/formatPrice';

type Tab = 'bookings' | 'inquiries';

export function MyPropertyBookings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('bookings');
  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingBooking, setPayingBooking] = useState<PropertyBooking | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [bookingsData, inquiriesData] = await Promise.all([
        realEstateApi.getMyBookings(),
        realEstateApi.getMyInquiries(),
      ]);
      setBookings(bookingsData);
      setInquiries(inquiriesData);
    } catch {
      setBookings([]);
      setInquiries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const completePayment = async (gatewayId: string, paymentIntentId?: string) => {
    if (!payingBooking) return;
    const result = await realEstateApi.processPayment(payingBooking.id, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      window.open(launchUrl, '_blank');
      return;
    }
    setPayingBooking(null);
    loadData();
  };

  const handlePayPress = async (booking: PropertyBooking) => {
    setPayingBooking(booking);
    const methods = await loadSavedPaymentMethods();
    if (methods.length === 0) {
      alert('No payment methods found.');
      setPayingBooking(null);
      return;
    }
    setPaymentMethods(methods);
    setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
    setShowPaymentSelector(true);
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (!payingBooking) return;
    const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');

    if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
      setShowStripe(true);
    } else {
      try {
        setProcessing(true);
        const gatewayId = isYonna ? 'yonna-forex' : isWave ? 'wave-gambia' : resolveGatewayPaymentMethodId(method);
        await completePayment(gatewayId);
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Payment failed.');
      } finally {
        setProcessing(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="My Reservations" subtitle="Bookings & inquiries" backTo="/real-estate" />

      <div className="flex border-b border-gray-100">
        {(['bookings', 'inquiries'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab === tab ? 'text-violet-600 border-b-2 border-violet-500' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'bookings' ? (
        <div className="p-4 space-y-3">
          {bookings.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No reservations yet</p>
          ) : (
            bookings.map((booking) => (
              <div key={booking.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{booking.bookingRef}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium">
                    {booking.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">{booking.listing?.title}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(booking.checkIn), 'MMM d')} – {format(new Date(booking.checkOut), 'MMM d, yyyy')} · {booking.guests} guest(s)
                </p>
                <p className="text-sm font-semibold text-violet-600 mt-2">
                  {formatPrice(booking.totalPrice, booking.currency)}
                </p>
                {booking.status === 'PENDING' && booking.paymentStatus !== 'PAID' && (
                  <button
                    type="button"
                    onClick={() => handlePayPress(booking)}
                    className="mt-3 w-full py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {inquiries.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No inquiries yet</p>
          ) : (
            inquiries.map((inquiry) => (
              <div key={inquiry.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                <p className="font-semibold text-gray-900">{inquiry.listing?.title}</p>
                <p className="text-sm text-gray-600 mt-2">{inquiry.message}</p>
                <p className="text-xs text-gray-400 mt-2">{format(new Date(inquiry.createdAt), 'MMM d, yyyy')}</p>
                <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">{inquiry.status}</span>
              </div>
            ))
          )}
        </div>
      )}

      {showPaymentSelector && payingBooking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowPaymentSelector(false); setPayingBooking(null); }} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="p-4 border-b font-semibold">Select Payment Method</div>
            <div className="p-4 bg-violet-50 text-violet-800 text-sm font-medium">
              Amount: {formatPrice(payingBooking.totalPrice, payingBooking.currency)}
            </div>
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethodId(method.id)}
                  className={`w-full p-3 rounded-lg border text-left ${selectedPaymentMethodId === method.id ? 'border-violet-500 bg-violet-50' : 'border-gray-200'}`}
                >
                  <p className="text-sm font-medium">{method.accountName || method.provider}</p>
                  <p className="text-xs text-gray-500">{method.type.replace(/_/g, ' ')}</p>
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                disabled={!selectedPaymentMethodId || processing}
                onClick={async () => {
                  const method = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
                  if (!method) return;
                  setShowPaymentSelector(false);
                  await handlePaymentMethodSelect(method);
                }}
                className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60"
              >
                Process Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {payingBooking && user?.id && (
        <StripePaymentModal
          isOpen={showStripe}
          onClose={() => setShowStripe(false)}
          amount={payingBooking.totalPrice}
          currency={payingBooking.currency}
          orderId={payingBooking.id}
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
