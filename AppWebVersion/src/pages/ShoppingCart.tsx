import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart as CartIcon, Calendar, Receipt, Wallet, CheckCircle2, XCircle, CreditCard, Loader2, Check, AlertCircle } from 'lucide-react';
import { orderService, type Order } from '../api/orders';
import { getApi } from '../api/config';
import { PaymentMethodModal } from '../components/PaymentMethodModal';
import StripePaymentModal from '../components/StripePaymentModal';
import BulkStripePaymentModal from '../components/BulkStripePaymentModal';
import { PaymentModal } from '../components/PaymentModal';
import WaveQRPaymentModal from '../components/WaveQRPaymentModal';
import { waveGambiaPaymentService } from '../api/waveGambiaPayment';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'pay' | 'orders';

interface OrderSummaryItem {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
  productLabel?: string;
}

export function ShoppingCart() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<TabType>('pay');
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [actioningOrderId, setActioningOrderId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTitle, setSuccessTitle] = useState<string>('Success');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoTitle, setInfoTitle] = useState<string>('Notice');
  const [infoMessage, setInfoMessage] = useState<string>('');

  // Payment modals
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [stripeOpen, setStripeOpen] = useState(false);
  const [stripeAmount, setStripeAmount] = useState(0);
  const [stripeCurrency, setStripeCurrency] = useState('USD');
  const [stripeOrderId, setStripeOrderId] = useState('');
  const [bulkStripeOpen, setBulkStripeOpen] = useState(false);
  const [bulkStripeAmount, setBulkStripeAmount] = useState(0);
  const [bulkStripeCurrency, setBulkStripeCurrency] = useState('USD');
  const [bulkOrderIds, setBulkOrderIds] = useState<string[]>([]);
  const [waveOpen, setWaveOpen] = useState(false);
  const [waveSessionId, setWaveSessionId] = useState<string | null>(null);
  const [wavePaymentUrl, setWavePaymentUrl] = useState<string | null>(null);
  const [waveAmount, setWaveAmount] = useState(0);
  const [waveCurrency, setWaveCurrency] = useState('GMD');
  const [showWaveProcessing, setShowWaveProcessing] = useState(false);
  const [waveProcessingMessage, setWaveProcessingMessage] = useState('Preparing Wave checkout...');
  const waveRetryTimerRef = useRef<number | null>(null);
  const [yonnaOpen, setYonnaOpen] = useState(false);
  const [yonnaPaymentMethod, setYonnaPaymentMethod] = useState<{ id: string; type: string; provider: string } | null>(null);

  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status?.toLowerCase() === 'authorized' && (o.paymentStatus || '').toLowerCase() !== 'paid');
  }, [orders]);

  const pendingBuyerOrders = useMemo(() => {
    return orders.filter(o => (o.status || '').toLowerCase() === 'pending');
  }, [orders]);

  const selectedCurrencyCode = useMemo(() => {
    const ids = Array.from(selectedOrderIds);
    for (let i = 0; i < ids.length; i++) {
      const order = pendingOrders.find(o => o.id === ids[i]);
      if (order) return order.currencyCode;
    }
    return null;
  }, [selectedOrderIds, pendingOrders]);

  const selectedOrder = useMemo(() => {
    if (selectedOrderIds.size === 0) return null;
    const firstId = Array.from(selectedOrderIds)[0];
    return pendingOrders.find(o => o.id === firstId) || null;
  }, [selectedOrderIds, pendingOrders]);

  const selectedCount = useMemo(() => selectedOrderIds.size, [selectedOrderIds]);

  const selectedTotalForCurrency = useMemo(() => {
    if (!selectedCurrencyCode) return 0;
    return pendingOrders.reduce((sum, o) => {
      if (selectedOrderIds.has(o.id) && o.currencyCode === selectedCurrencyCode) {
        return sum + Number(o.totalAmount || 0);
      }
      return sum;
    }, 0);
  }, [pendingOrders, selectedOrderIds, selectedCurrencyCode]);

  const totalsByCurrencyAll = useMemo(() => {
    const map = new Map<string, number>();
    pendingOrders.forEach(o => {
      const cur = o.currencyCode || 'USD';
      map.set(cur, (map.get(cur) || 0) + Number(o.totalAmount || 0));
    });
    return map;
  }, [pendingOrders]);

  const formatPrice = (price: number, currencyCode: string) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(price);
    } catch {
      return `${currencyCode} ${Number(price || 0).toFixed(2)}`;
    }
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await orderService.getMyOrders(1, 100);
      const list = response.orders || [];
      const simplified: OrderSummaryItem[] = list.map((o: Order) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        paymentStatus: o.paymentStatus,
        totalAmount: Number(o.totalAmount || 0),
        currencyCode: (o as any).currencyCode || 'USD',
        createdAt: o.createdAt,
        productLabel: (() => {
          try {
            const items = Array.isArray(o.items) ? o.items : [];
            const names = items
              .map((it: any) => it?.product?.name || it?.product?.title || it?.productName || it?.name)
              .filter(Boolean);
            const primary = names[0] || 'Item';
            return names.length > 1 ? `${primary} +${names.length - 1} more` : primary;
          } catch {
            return 'Item';
          }
        })(),
      }));
      setOrders(simplified);
      // keep valid selections
      setSelectedOrderIds(prev => {
        const next = new Set<string>();
        simplified.forEach(o => {
          if (prev.has(o.id) && o.status?.toLowerCase() === 'authorized' && (o.paymentStatus || '').toLowerCase() !== 'paid') {
            next.add(o.id);
          }
        });
        return next;
      });
    } catch (e: any) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    return () => {
      if (waveRetryTimerRef.current) {
        window.clearInterval(waveRetryTimerRef.current);
        waveRetryTimerRef.current = null;
      }
    };
  }, [loadOrders]);

  const toggleSelectOrder = (order: OrderSummaryItem) => {
    if (selectedOrderIds.size > 0 && selectedCurrencyCode && order.currencyCode !== selectedCurrencyCode) {
      setInfoTitle('Different Currency');
      setInfoMessage('Please select orders with the same currency to pay together.');
      setShowInfoModal(true);
      return;
    }
    setSelectedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(order.id)) next.delete(order.id);
      else next.add(order.id);
      return next;
    });
  };

  const handleAuthorizeOrder = async (order: OrderSummaryItem) => {
    try {
      setActioningOrderId(order.id);
      await getApi().patch(`/orders/${order.id}/authorize`, { action: 'authorize' });
      setSuccessTitle('Order Authorized');
      setSuccessMessage(`Order #${order.orderNumber} has been authorized.`);
      setShowSuccessModal(true);
      await loadOrders();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to authorize order.');
    } finally {
      setActioningOrderId(null);
    }
  };

  const handleCancelOrder = async (order: OrderSummaryItem) => {
    try {
      setActioningOrderId(order.id);
      await getApi().patch(`/orders/${order.id}/authorize`, { action: 'cancel' });
      setSuccessTitle('Order Cancelled');
      setSuccessMessage(`Order #${order.orderNumber} has been cancelled.`);
      setShowSuccessModal(true);
      await loadOrders();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to cancel order.');
    } finally {
      setActioningOrderId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link to="/home" className="text-gray-600 hover:text-gray-900 mr-4">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-900">Shopping Cart</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-3 border-b border-gray-200 mb-6">
          <button
            className={`py-2 px-3 border-b-2 text-sm font-medium ${
              activeTab === 'pay' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('pay')}
          >
            Pay
          </button>
          <button
            className={`py-2 px-3 border-b-2 text-sm font-medium ${
              activeTab === 'orders' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('orders')}
          >
            Pending Orders
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
            <span className="text-gray-600">Loading your cart...</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-16">
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">{error}</p>
            <button
              onClick={loadOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Pay tab */}
        {!loading && !error && activeTab === 'pay' && (
          <>
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16">
                <CartIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No pending payments</h3>
                <p className="text-gray-600">Orders awaiting payment will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Totals by currency (all pending)</div>
                  <div className="space-y-2">
                    {Array.from(totalsByCurrencyAll.entries()).map(([cur, total]) => (
                      <div key={cur} className="flex items-center justify-between">
                        <span className="text-gray-700">{cur}</span>
                        <span className="font-semibold text-gray-900">{formatPrice(total, cur)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {pendingOrders.map((o) => {
                    const isSelected = selectedOrderIds.has(o.id);
                    return (
                      <div
                        key={o.id}
                        className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all cursor-pointer ${isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                        onClick={() => toggleSelectOrder(o)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectOrder(o);
                              }}
                              className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-600' : 'bg-white border-gray-300'}`}
                              aria-label="Select order"
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <div className="text-sm font-semibold text-gray-900">#{o.orderNumber}</div>
                          </div>
                          <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            Authorized
                          </div>
                        </div>

                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center justify-between text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-500">Date</span>
                            </div>
                            <span className="font-medium">
                              {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-gray-700">
                            <div className="flex items-center space-x-2">
                              <Receipt className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-500">Product</span>
                            </div>
                            <span className="font-medium truncate max-w-[60%] text-right">{o.productLabel || 'Item'}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Wallet className="w-4 h-4 text-emerald-600" />
                              <span className="text-gray-600">Payable</span>
                            </div>
                            <span className="font-bold text-emerald-700">{formatPrice(o.totalAmount, o.currencyCode)}</span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-3 inline-flex items-center text-emerald-700 text-sm">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Selected for payment
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600">Selected Orders</div>
                      <div className="text-lg font-semibold text-gray-900">{selectedCount}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-emerald-700 font-semibold">
                        Grand Total {selectedCurrencyCode ? `(${selectedCurrencyCode})` : ''}
                      </div>
                      <div className="text-xl font-bold text-emerald-700">
                        {selectedCurrencyCode ? formatPrice(selectedTotalForCurrency, selectedCurrencyCode) : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      className={`px-4 py-2 rounded-lg text-white font-semibold inline-flex items-center ${selectedCount === 0 || !selectedCurrencyCode ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                      disabled={selectedCount === 0 || !selectedCurrencyCode}
                      onClick={() => setShowPaymentMethodModal(true)}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Process Payment
                    </button>
                    {selectedCount > 0 && (
                      <button
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        onClick={() => setSelectedOrderIds(new Set())}
                      >
                        Clear Selection
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pending Orders tab */}
        {!loading && !error && activeTab === 'orders' && (
          <>
            {pendingBuyerOrders.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No pending orders</h3>
                <p className="text-gray-600">Orders awaiting your authorization will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingBuyerOrders.map((o) => (
                  <div key={o.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-900">#{o.orderNumber}</div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">Date</span>
                        </div>
                        <span className="font-medium">
                          {new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-gray-700">
                        <div className="flex items-center space-x-2">
                          <Receipt className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-500">Product</span>
                        </div>
                        <span className="font-medium truncate max-w-[60%] text-right">{o.productLabel || 'Item'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <span className="text-gray-600">Total</span>
                        </div>
                        <span className="font-bold text-emerald-700">{formatPrice(o.totalAmount, o.currencyCode)}</span>
                      </div>
                      <div className="pt-3 flex items-center gap-3">
                        <button
                          className={`flex items-center justify-center px-3 py-2 rounded-lg text-white text-sm font-semibold ${actioningOrderId === o.id ? 'bg-emerald-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                          disabled={actioningOrderId === o.id}
                          onClick={() => handleAuthorizeOrder(o)}
                        >
                          {actioningOrderId === o.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          )}
                          Authorize
                        </button>
                        <button
                          className={`flex items-center justify-center px-3 py-2 rounded-lg text-white text-sm font-semibold ${actioningOrderId === o.id ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                          disabled={actioningOrderId === o.id}
                          onClick={() => handleCancelOrder(o)}
                        >
                          {actioningOrderId === o.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowSuccessModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                  <Check className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{successTitle}</h3>
                <p className="text-sm text-gray-600 text-center mb-6">{successMessage}</p>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowInfoModal(false)}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{infoTitle}</h3>
                <p className="text-sm text-gray-600 text-center mb-6">{infoMessage}</p>
                <div className="flex items-center justify-center">
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectPaymentMethod={(method) => {
          setShowPaymentMethodModal(false);
            // For card payments, open Stripe (single) or BulkStripe (multiple)
            if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
              const currency = (selectedCurrencyCode || selectedOrder?.currencyCode || 'USD') as string;
              if (selectedCount > 1) {
                const ids = Array.from(selectedOrderIds);
                setBulkStripeAmount(selectedTotalForCurrency);
                setBulkStripeCurrency(currency);
                setBulkOrderIds(ids);
                setBulkStripeOpen(true);
              } else {
                const amount = (selectedOrder?.totalAmount || 0);
                const anyOrderId = (selectedOrder?.id || '');
                setStripeAmount(amount);
                setStripeCurrency(currency);
                setStripeOrderId(anyOrderId);
                setStripeOpen(true);
              }
          } else {
            // MOBILE_MONEY flows
            const provider = ((method as any)?.provider || (method as any)?.metadata?.providerName || '').toString().toLowerCase();
            if (provider.includes('wave')) {
              (async () => {
                try {
                  const amount = selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0);
                  const currency = (selectedCurrencyCode || selectedOrder?.currencyCode || 'GMD') as string;
                  const orderId = selectedCount > 1 ? undefined : (selectedOrder?.id || undefined);
                  const res = await waveGambiaPaymentService.processPayment({
                    amount,
                    currency,
                    description: selectedCount > 1
                      ? `Bulk payment for ${selectedCount} orders via Wave`
                      : `Payment for Order #${selectedOrder?.orderNumber} via Wave`,
                    orderId
                  });
                  if (res.success && res.data?.waveLaunchUrl && res.data.sessionId) {
                    setWaveAmount(amount);
                    setWaveCurrency(currency);
                    setWaveSessionId(res.data.sessionId);
                    setWavePaymentUrl(res.data.waveLaunchUrl);
                    setWaveOpen(true);
                  } else {
                    // Backend might still be preparing session; show processing modal and retry
                    setWaveAmount(amount);
                    setWaveCurrency(currency);
                    setShowWaveProcessing(true);
                    setWaveProcessingMessage('Processing your Wave payment request. This may take a few seconds...');
                    let attempts = 0;
                    const maxAttempts = 20; // ~60s at 3s interval
                    const tryCreate = async () => {
                      attempts += 1;
                      try {
                        const retryRes = await waveGambiaPaymentService.processPayment({
                          amount,
                          currency,
                          description: selectedCount > 1
                            ? `Bulk payment for ${selectedCount} orders via Wave`
                            : `Payment for Order #${selectedOrder?.orderNumber} via Wave`,
                          orderId
                        });
                        if (retryRes.success && retryRes.data?.waveLaunchUrl && retryRes.data.sessionId) {
                          if (waveRetryTimerRef.current) {
                            window.clearInterval(waveRetryTimerRef.current);
                            waveRetryTimerRef.current = null;
                          }
                          setShowWaveProcessing(false);
                          setWaveSessionId(retryRes.data.sessionId);
                          setWavePaymentUrl(retryRes.data.waveLaunchUrl);
                          setWaveOpen(true);
                          return;
                        }
                      } catch {
                        // ignore each attempt error
                      }
                      if (attempts >= maxAttempts) {
                        if (waveRetryTimerRef.current) {
                          window.clearInterval(waveRetryTimerRef.current);
                          waveRetryTimerRef.current = null;
                        }
                        setShowWaveProcessing(false);
                        setInfoTitle('Wave Payment');
                        setInfoMessage('We could not prepare the Wave checkout at this time. Please try again shortly.');
                        setShowInfoModal(true);
                      }
                    };
                    // Start interval retries
                    waveRetryTimerRef.current = window.setInterval(tryCreate, 3000);
                    // Run first retry immediately to avoid initial 3s delay
                    tryCreate();
                  }
                } catch (err: any) {
                  // Treat transient setup errors as in-progress; show processing and retry
                  const amount = selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0);
                  const currency = (selectedCurrencyCode || selectedOrder?.currencyCode || 'GMD') as string;
                  setWaveAmount(amount);
                  setWaveCurrency(currency);
                  setShowWaveProcessing(true);
                  setWaveProcessingMessage('Processing your Wave payment request. This may take a few seconds...');
                  let attempts = 0;
                  const maxAttempts = 20;
                  const tryCreate = async () => {
                    attempts += 1;
                    try {
                      const retryRes = await waveGambiaPaymentService.processPayment({
                        amount,
                        currency,
                        description: selectedCount > 1
                          ? `Bulk payment for ${selectedCount} orders via Wave`
                          : `Payment for Order #${selectedOrder?.orderNumber} via Wave`,
                        orderId: selectedCount > 1 ? undefined : (selectedOrder?.id || undefined)
                      });
                      if (retryRes.success && retryRes.data?.waveLaunchUrl && retryRes.data.sessionId) {
                        if (waveRetryTimerRef.current) {
                          window.clearInterval(waveRetryTimerRef.current);
                          waveRetryTimerRef.current = null;
                        }
                        setShowWaveProcessing(false);
                        setWaveSessionId(retryRes.data.sessionId);
                        setWavePaymentUrl(retryRes.data.waveLaunchUrl);
                        setWaveOpen(true);
                        return;
                      }
                    } catch {
                      // ignore each attempt
                    }
                    if (attempts >= maxAttempts) {
                      if (waveRetryTimerRef.current) {
                        window.clearInterval(waveRetryTimerRef.current);
                        waveRetryTimerRef.current = null;
                      }
                      setShowWaveProcessing(false);
                      setInfoTitle('Wave Payment');
                      setInfoMessage('We could not prepare the Wave checkout at this time. Please try again shortly.');
                      setShowInfoModal(true);
                    }
                  };
                  waveRetryTimerRef.current = window.setInterval(tryCreate, 3000);
                  tryCreate();
                }
              })();
            } else {
              const isYonna = provider.includes('yonna') || provider.includes('aps');
              if (isYonna) {
                if (selectedCount !== 1 || !selectedOrder) {
                  setInfoTitle('Yonna Payment');
                  setInfoMessage('Please select exactly one order to pay with Yonna Wallet.');
                  setShowInfoModal(true);
                  return;
                }
                setYonnaPaymentMethod({
                  id: (method as any).id,
                  type: (method as any).type,
                  provider: (method as any).provider,
                });
                setYonnaOpen(true);
                return;
              }
              // Default non-card, non-wave
              navigate('/orders');
            }
          }
        }}
        orderTotal={selectedCount > 1 ? selectedTotalForCurrency : (selectedOrder?.totalAmount || 0)}
        currencyCode={(selectedCurrencyCode || selectedOrder?.currencyCode || 'USD') as string}
        userPhoneNumber={user?.phoneNumber}
      />
      {/* Wave Processing Modal */}
      {showWaveProcessing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => { /* prevent closing during processing */ }}></div>
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing</h3>
                <p className="text-sm text-gray-600">{waveProcessingMessage}</p>
                <p className="text-xs text-gray-400 mt-2">Do not close this window.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Modal */}
      <StripePaymentModal
        isOpen={stripeOpen}
        onClose={() => setStripeOpen(false)}
        onPaymentSuccess={() => {
          setStripeOpen(false);
          loadOrders();
        }}
        orderId={stripeOrderId}
        amount={stripeAmount}
        currency={stripeCurrency}
      />
      <BulkStripePaymentModal
        isOpen={bulkStripeOpen}
        onClose={() => setBulkStripeOpen(false)}
        onPaymentSuccess={() => {
          setBulkStripeOpen(false);
          setBulkOrderIds([]);
          loadOrders();
        }}
        amount={bulkStripeAmount}
        currency={bulkStripeCurrency}
        orderIds={bulkOrderIds}
        description={`Bulk payment for ${bulkOrderIds.length} orders`}
      />
      {/* Yonna Forex Payment Modal */}
      {yonnaOpen && selectedOrder && yonnaPaymentMethod && (
        <PaymentModal
          isOpen={yonnaOpen}
          onClose={() => {
            setYonnaOpen(false);
            setYonnaPaymentMethod(null);
          }}
          onPaymentSuccess={() => {
            setYonnaOpen(false);
            setYonnaPaymentMethod(null);
            loadOrders();
          }}
          orderId={selectedOrder.id}
          amount={selectedOrder.totalAmount}
          currency={selectedOrder.currencyCode}
          description={`Payment for Order #${selectedOrder.orderNumber}`}
          customerId={user?.id}
          paymentMethod={yonnaPaymentMethod}
          gateway={{ id: 'yonna_forex', name: 'Yonna Forex', type: 'yonna_forex' }}
        />
      )}
      {/* Wave Payment Modal */}
      <WaveQRPaymentModal
        isOpen={waveOpen}
        onClose={() => setWaveOpen(false)}
        sessionId={waveSessionId || ''}
        paymentUrl={wavePaymentUrl || ''}
        amount={waveAmount}
        currency={waveCurrency}
        onCompleted={async ({ sessionId, transactionId }) => {
          try {
            if (selectedCount > 1 && selectedCurrencyCode) {
              await getApi().post('/payments/bulk-external-success', {
                provider: 'wave_gambia',
                transactionReference: transactionId || sessionId,
                orderIds: Array.from(selectedOrderIds),
                currencyCode: selectedCurrencyCode,
                amount: selectedTotalForCurrency,
              });
            } else if (selectedOrder && selectedCurrencyCode) {
              // Single-order reconciliation
              await getApi().post('/payments/external-success', {
                provider: 'wave_gambia',
                transactionReference: transactionId || sessionId,
                orderId: selectedOrder.id,
                currencyCode: selectedCurrencyCode,
              });
            }
          } catch (e) {
            // ignore and continue
          } finally {
            setWaveOpen(false);
            setWaveSessionId(null);
            setWavePaymentUrl(null);
            await loadOrders();
          }
        }}
        onFailed={() => {}}
      />
    </div>
  );
}

export default ShoppingCart;


