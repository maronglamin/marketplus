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
  const [payingInquiry, setPayingInquiry] = useState<PropertyInquiry | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentProgressMessage, setPaymentProgressMessage] = useState('Processing payment...');

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

  const activePaymentTarget = payingBooking || payingInquiry;
  const paymentAmount = payingInquiry
    ? Number(payingInquiry.salePrice ?? payingInquiry.listing?.price ?? 0)
    : payingBooking?.totalPrice ?? 0;
  const paymentCurrency =
    payingInquiry?.currency ||
    payingInquiry?.listing?.currency ||
    payingBooking?.currency ||
    'GMD';

  const completePayment = async (gatewayId: string, paymentIntentId?: string) => {
    if (payingInquiry) {
      const result = await realEstateApi.processInquiryPayment(payingInquiry.id, gatewayId, paymentIntentId);
      const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
      if (launchUrl) {
        setPaymentProgressMessage('Opening Wave…');
        window.open(launchUrl, '_blank');
        return;
      }
      setPayingInquiry(null);
      loadData();
      return;
    }

    if (!payingBooking) return;
    const result = await realEstateApi.processPayment(payingBooking.id, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      setPaymentProgressMessage('Opening Wave…');
      window.open(launchUrl, '_blank');
      return;
    }
    setPayingBooking(null);
    loadData();
  };

  const openPaymentSelector = async (booking?: PropertyBooking, inquiry?: PropertyInquiry) => {
    setPayingBooking(booking || null);
    setPayingInquiry(inquiry || null);
    const methods = await loadSavedPaymentMethods();
    if (methods.length === 0) {
      alert('No payment methods found.');
      setPayingBooking(null);
      setPayingInquiry(null);
      return;
    }
    setPaymentMethods(methods);
    setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
    setShowPaymentSelector(true);
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    if (!payingBooking && !payingInquiry) return;
    const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');
    const isTestPayment =
      method.id === 'test-payment' ||
      method.metadata?.simulated === true ||
      providerName.includes('test payment');

    if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
      setShowPaymentSelector(false);
      setShowStripe(true);
      return;
    }

    try {
      setProcessing(true);
      const wasSalePurchase = !!payingInquiry;
      if (isTestPayment) {
        setPaymentProgressMessage('Simulating payment…');
        await completePayment('test-payment');
        setShowPaymentSelector(false);
        setPayingBooking(null);
        setPayingInquiry(null);
        alert(
          wasSalePurchase
            ? 'Test payment complete. Property marked as sold.'
            : 'Test payment complete. Booking marked as paid — you can now test settlement.',
        );
        loadData();
        return;
      }

      setPaymentProgressMessage(isWave ? 'Connecting to Wave…' : 'Processing payment…');
      const gatewayId = isYonna ? 'yonna-forex' : isWave ? 'wave-gambia' : resolveGatewayPaymentMethodId(method);
      await completePayment(gatewayId);
      setShowPaymentSelector(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payment failed.');
    } finally {
      setProcessing(false);
      setPaymentProgressMessage('Processing payment...');
    }
  };

  const clearPaymentTarget = () => {
    if (processing) return;
    setShowPaymentSelector(false);
    setPayingBooking(null);
    setPayingInquiry(null);
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
                    onClick={() => openPaymentSelector(booking)}
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
            inquiries.map((inquiry) => {
              const salePrice = Number(inquiry.salePrice ?? inquiry.listing?.price ?? 0);
              const currency = inquiry.currency || inquiry.listing?.currency || 'GMD';
              const displayStatus =
                inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED'
                  ? 'PURCHASED'
                  : inquiry.status;
              const canPay =
                inquiry.status === 'OFFERED' &&
                inquiry.paymentStatus !== 'PAID' &&
                inquiry.listing?.status !== 'SOLD' &&
                salePrice > 0;

              return (
                <div key={inquiry.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-gray-900">{inquiry.listing?.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 font-medium shrink-0">
                      {displayStatus}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{inquiry.message}</p>
                  {salePrice > 0 ? (
                    <p className="text-sm font-semibold text-violet-600 mt-2">
                      {formatPrice(salePrice, currency)}
                    </p>
                  ) : null}
                  <p className="text-xs text-gray-400 mt-2">{format(new Date(inquiry.createdAt), 'MMM d, yyyy')}</p>
                  {canPay && (
                    <button
                      type="button"
                      onClick={() => openPaymentSelector(undefined, inquiry)}
                      className="mt-3 w-full py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700"
                    >
                      Pay to Purchase
                    </button>
                  )}
                  {inquiry.status === 'OFFERED' && inquiry.paymentStatus !== 'PAID' && inquiry.listing?.status !== 'SOLD' && (
                    <p className="text-xs text-violet-600 mt-2">The agent invited you to complete this purchase.</p>
                  )}
                  {inquiry.status !== 'OFFERED' &&
                    inquiry.paymentStatus !== 'PAID' &&
                    inquiry.status !== 'PURCHASED' &&
                    inquiry.listing?.status !== 'SOLD' && (
                      <p className="text-xs text-gray-500 mt-2">Waiting for the agent to offer purchase.</p>
                    )}
                  {(inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED' || inquiry.listing?.status === 'SOLD') &&
                    inquiry.paymentStatus !== 'PAID' &&
                    inquiry.status !== 'PURCHASED' && (
                      <p className="text-xs text-gray-500 mt-2">This property has been sold.</p>
                    )}
                </div>
              );
            })
          )}
        </div>
      )}

      {showPaymentSelector && activePaymentTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={clearPaymentTarget} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 border-b font-semibold">Select Payment Method</div>
            <div className="p-4 bg-violet-50 text-violet-800 text-sm font-medium">
              Amount: {formatPrice(paymentAmount, paymentCurrency)}
            </div>
            <div className={`p-4 space-y-2 max-h-60 overflow-y-auto ${processing ? 'pointer-events-none opacity-60' : ''}`}>
              {paymentMethods.map((method) => {
                const providerName =
                  method.metadata?.providerName || method.provider || 'Payment Method';
                const accountLabel =
                  method.metadata?.phoneNumber || method.accountId || method.accountName || '';
                const providerLower = providerName.toString().toLowerCase();
                const isWave = providerLower.includes('wave');
                const isYonna = providerLower.includes('yonna') || providerLower.includes('aps');
                const isTest = method.id === 'test-payment' || method.metadata?.simulated;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentMethodId(method.id)}
                    className={`w-full p-3 rounded-lg border text-left flex items-center gap-3 ${
                      selectedPaymentMethodId === method.id
                        ? 'border-violet-500 bg-violet-50'
                        : isTest
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-gray-200'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                      {isTest ? (
                        <span className="text-xs font-bold text-amber-600">TEST</span>
                      ) : isWave ? (
                        <img src="/assets/wave.jpg" alt="Wave" className="w-7 h-7 object-cover rounded" />
                      ) : isYonna ? (
                        <img src="/assets/yonna_wallet.svg" alt="Yonna" className="w-7 h-7" />
                      ) : (
                        <span className="text-xs font-semibold text-violet-600">
                          {providerName.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{providerName}</p>
                      {accountLabel ? (
                        <p className="text-xs text-gray-500 truncate">{accountLabel}</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                disabled={!selectedPaymentMethodId || processing}
                onClick={async () => {
                  const method = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
                  if (!method) return;
                  await handlePaymentMethodSelect(method);
                }}
                className="w-full py-3 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Please wait…
                  </>
                ) : (
                  'Process Payment'
                )}
              </button>
            </div>

            {processing && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center p-6">
                <div className="text-center max-w-xs">
                  <div className="mx-auto w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                  <p className="mt-4 text-base font-semibold text-gray-900">{paymentProgressMessage}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    This can take a few seconds. Please don’t close this window.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activePaymentTarget && user?.id ? (
        <StripePaymentModal
          isOpen={showStripe}
          onClose={() => setShowStripe(false)}
          amount={paymentAmount}
          currency={paymentCurrency}
          orderId={(payingBooking?.id || payingInquiry?.id)!}
          customerId={user.id}
          onPaymentSuccess={async (data) => {
            await completePayment('stripe', data?.paymentIntentId || data?.id);
            setShowStripe(false);
            setPayingBooking(null);
            setPayingInquiry(null);
          }}
        />
      ) : null}
    </div>
  );
}
