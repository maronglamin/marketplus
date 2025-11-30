import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Truck, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  Edit,
  Save,
  Percent,
  Shield
} from 'lucide-react';
import { orderService, type Order, type UpdateOrderPricingRequest } from '../api/orders';
import { useAuth } from '../contexts/AuthContext';
import { API_CONFIG } from '../config/api';
import { getApi } from '../api/config';
import { PaymentMethodModal } from './PaymentMethodModal';
import { AddPaymentMethodModal } from './AddPaymentMethodModal';
import { PaymentModal } from './PaymentModal';
import { PaymentGatewayModal } from './PaymentGatewayModal';
import { StripePaymentModal } from './StripePaymentModal';
import { paymentMethodService, PaymentMethod } from '../api/paymentMethods';
import { PaymentGateway } from '../api/paymentService';
import { getImageUrl } from '../config/api';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdate?: (updatedOrder: Order) => void;
  isSeller?: boolean;
  freshUser?: any;
}

export function OrderDetailsModal({ 
  order, 
  isOpen, 
  onClose, 
  onOrderUpdate,
  isSeller = false,
  freshUser = null
}: OrderDetailsModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingPricing, setEditingPricing] = useState(false);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showAuthorizeModal, setShowAuthorizeModal] = useState(false);
  const [pricingForm, setPricingForm] = useState<UpdateOrderPricingRequest>({
    discountAmount: 0
  });
  const [deliveryForm, setDeliveryForm] = useState({
    method: '',
    price: 0
  });
  const [isCustomer, setIsCustomer] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  
  // Payment state
  const [hasActiveTransaction, setHasActiveTransaction] = useState(false);
  const [canMakePayment, setCanMakePayment] = useState(true);
  const [checkingTransactions, setCheckingTransactions] = useState(false);
  
  // Payment method modals
  const [showPaymentGatewayModal, setShowPaymentGatewayModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showStripePaymentModal, setShowStripePaymentModal] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);

  // Image URL helper function (same as Products page)
  // const getImageUrl = (image: string | null) => {
  //   if (!image) return 'https://via.placeholder.com/300x300?text=No+Image';
  //   if (image.startsWith('http')) return image;
  //   const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
  //   return `${baseUrl}${image}`;
  // };

  useEffect(() => {
    if (order) {
      setPricingForm({
        discountAmount: order.discountAmount || 0
      });
      setDeliveryForm({
        method: order.shippingMethod || '',
        price: order.shippingAmount || 0
      });
      
      // Check if current user is the customer (works for both regular customers and seller-customers)
      // Use freshUser if available, otherwise fall back to user from context
      const currentUser = freshUser || user;
      
      // WORKAROUND: Since the database has null userId/sellerId, we'll use a different approach
      // For now, we'll assume the user is the customer if they're viewing "My Orders" tab
      // This is a temporary fix until the data integrity issue is resolved
      const isCustomerUser = !isSeller; // If not viewing as seller, then they're the customer
      
      // Debug logging to see what's happening
      console.log('OrderDetailsModal - Customer Detection:', {
        currentUserId: currentUser?.id,
        orderCustomerId: order.User_orders_userIdToUser?.id,
        orderUserId: order.userId,
        orderSellerId: order.sellerId,
        isCustomerUser,
        orderStatus: order.status,
        isSeller: isSeller,
        freshUser: freshUser?.id,
        contextUser: user?.id,
        note: 'Using workaround due to null userId/sellerId in database'
      });
      
      setIsCustomer(isCustomerUser);
      
      // Check for existing transactions if order is authorized
      if (order.status.toUpperCase() === 'AUTHORIZED') {
        checkExistingTransactions();
      }
    }
  }, [order, user, freshUser]);

  if (!isOpen || !order) return null;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'authorized': return '#10B981';
      case 'confirmed': return '#3B82F6';
      case 'processing': return '#8B5CF6';
      case 'shipped': return '#10B981';
      case 'delivered': return '#059669';
      case 'cancelled': return '#EF4444';
      case 'refunded': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'authorized': return <Shield className="w-4 h-4" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Package className="w-4 h-4" />;
      case 'shipped': return <Truck className="w-4 h-4" />;
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'refunded': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'authorized': return '#3B82F6';
      case 'paid': return '#10B981';
      case 'failed': return '#EF4444';
      case 'refunded': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    }).format(price);
    
    return `${symbol}${formattedPrice}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const computeOrderTotal = (order: Order): number => {
    try {
      if (Array.isArray(order.items)) {
        return order.items.reduce((sum, item) => {
          const itemTotal = typeof item.totalPrice === 'number'
            ? item.totalPrice
            : (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
          return sum + (Number(itemTotal) || 0);
        }, 0);
      }
      return Number(order.totalAmount) || 0;
    } catch {
      return Number(order.totalAmount) || 0;
    }
  };

  const computeOrderPayableTotal = (order: Order): number => {
    const itemsTotal = computeOrderTotal(order);
    const shipping = Number(order.shippingAmount) || 0;
    const discount = Number(order.discountAmount) || 0;
    const total = itemsTotal + shipping - discount;
    return total >= 0 ? total : 0;
  };


  const handlePricingUpdate = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      // Update discount if discount amount changed
      if (pricingForm.discountAmount !== (order.discountAmount || 0)) {
        await orderService.updateOrderDiscount(order.id, {
          discountAmount: pricingForm.discountAmount || 0,
          currency: order.currencyCode || 'USD'
        });
      }
      
      // Refresh the order data
      const updatedOrder = await orderService.getOrderById(order.id);
      onOrderUpdate?.(updatedOrder);
      setEditingPricing(false);
      setModalMessage('Discount updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating discount:', error);
      setModalMessage('Failed to update discount');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryUpdate = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      
      // Update delivery method and pricing
      await orderService.updateOrderDeliveryPricing(order.id, {
        shippingMethod: deliveryForm.method,
        deliveryType: deliveryForm.method,
        customPrice: deliveryForm.price,
        customCurrency: order.currencyCode
      });
      
      // Refresh the order data
      const updatedOrder = await orderService.getOrderById(order.id);
      onOrderUpdate?.(updatedOrder);
      setEditingDelivery(false);
      setModalMessage('Delivery details updated successfully');
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Error updating delivery details:', error);
      setModalMessage('Failed to update delivery details');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      const updatedOrder = await orderService.updateOrderStatus(order.id, {
        status: 'CANCELLED',
        notes: 'Cancelled by customer'
      });
      onOrderUpdate?.(updatedOrder);
      setShowCancelModal(false);
      setModalMessage('Order cancelled successfully');
      setShowSuccessModal(true);
      
      // Redirect to orders page and refresh after showing success message
      setTimeout(() => {
        window.location.href = '/orders';
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error cancelling order:', error);
      setModalMessage('Failed to cancel order');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthorizeOrder = async () => {
    if (!order) return;
    
    try {
      setLoading(true);
      const updatedOrder = await orderService.updateOrderStatus(order.id, {
        status: 'AUTHORIZED',
        notes: 'Authorized by customer'
      });
      onOrderUpdate?.(updatedOrder);
      setShowAuthorizeModal(false);
      setModalMessage('Order authorized successfully');
      setShowSuccessModal(true);
      
      // Redirect to orders page and refresh after showing success message
      setTimeout(() => {
        window.location.href = '/orders';
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error authorizing order:', error);
      setModalMessage('Failed to authorize order');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };


  const canCancelOrder = () => {
    // Don't allow cancellation if there's an active payment transaction
    if (hasActiveTransaction) {
      return false;
    }
    return isCustomer && ['PENDING', 'AUTHORIZED'].includes(order.status.toUpperCase());
  };

  const canAuthorizeOrder = () => {
    return isCustomer && order.status.toUpperCase() === 'PENDING';
  };

  const checkExistingTransactions = async () => {
    if (!order) return;
    
    try {
      setCheckingTransactions(true);
      const api = getApi();
      const response = await api.get(`/payments/yonna-forex/check-transactions/${order.id}`);
      
      if (response.data.success) {
        const { hasActiveTransaction, canMakePayment } = response.data.data;
        setHasActiveTransaction(hasActiveTransaction);
        setCanMakePayment(canMakePayment);
        
        console.log('Transaction check result:', {
          hasActiveTransaction,
          canMakePayment,
          orderId: order.id
        });
      }
    } catch (error) {
      console.error('Error checking existing transactions:', error);
      // Don't show error to user, just log it
    } finally {
      setCheckingTransactions(false);
    }
  };

  const checkPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      console.log('Checking payment methods...');
      const response = await paymentMethodService.getPaymentMethods();
      console.log('Payment methods response:', response);
      
      // Filter payment methods based on selected gateway type
      let filteredMethods = response.paymentMethods;
      if (selectedGateway?.type === 'card') {
        filteredMethods = response.paymentMethods.filter(method => 
          method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD'
        );
        console.log('Filtered for Stripe:', filteredMethods);
      } else if (selectedGateway?.type === 'mobile_wallet') {
        filteredMethods = response.paymentMethods.filter(method => 
          method.type === 'MOBILE_MONEY'
        );
        console.log('Filtered for Yonna Forex:', filteredMethods);
      }
      
      setPaymentMethods(filteredMethods);
      console.log('Payment methods count:', filteredMethods.length);
      return filteredMethods.length > 0;
    } catch (error) {
      console.error('Error checking payment methods:', error);
      return false;
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  const handlePaymentButtonClick = async () => {
    if (!canMakePayment) {
      alert('Payment transaction is already in progress. Please wait for it to complete.');
      return;
    }

    // Show payment gateway selection first
    setShowPaymentGatewayModal(true);
  };

  const handleGatewaySelected = async (gateway: PaymentGateway) => {
    setSelectedGateway(gateway);
    setShowPaymentGatewayModal(false);

    // Check if user has payment methods for this gateway
    const hasPaymentMethods = await checkPaymentMethods();
    console.log('Gateway selected:', gateway.type, 'Has payment methods:', hasPaymentMethods);
    
    if (hasPaymentMethods) {
      setShowPaymentMethodModal(true);
    } else {
      // If no payment methods, show add payment method modal
      console.log('No payment methods found, showing add payment method modal');
      setShowAddPaymentMethodModal(true);
    }
  };

  const handlePaymentMethodSelected = (method: PaymentMethod) => {
    setShowPaymentMethodModal(false);
    setSelectedPaymentMethod(method);
    
    // For Stripe, show the new Stripe Elements payment modal
      if (selectedGateway?.type === 'card') {
      setShowStripePaymentModal(true);
    } else {
      // For Yonna Forex, go directly to payment processing
      setShowPaymentModal(true);
    }
  };

  const handlePaymentMethodAdded = () => {
    setShowAddPaymentMethodModal(false);
    // Refresh payment methods and show selection modal
    checkPaymentMethods().then(hasMethods => {
      if (hasMethods) {
        setShowPaymentMethodModal(true);
      }
    });
  };


  const handlePaymentSuccess = (paymentData: any) => {
    setShowPaymentModal(false);
    setShowStripePaymentModal(false);
    setSelectedPaymentMethod(null);
    setSelectedGateway(null);
    
    // Show success message
    setModalMessage(`Payment successful! Transaction ID: ${paymentData.transactionId || paymentData.paymentIntentId}`);
    setShowSuccessModal(true);
    
    // Redirect to orders page and refresh after showing success message
    setTimeout(() => {
      window.location.href = '/orders';
      window.location.reload();
    }, 2000);
  };

  const handleStripePaymentSuccess = (paymentData: any) => {
    setShowStripePaymentModal(false);
    setSelectedPaymentMethod(null);
    setSelectedGateway(null);
    
    // Show success message
    setModalMessage(`Payment successful! Transaction ID: ${paymentData.transactionId || paymentData.paymentIntentId}`);
    setShowSuccessModal(true);
    
    // Redirect to orders page and refresh after showing success message
    setTimeout(() => {
      window.location.href = '/orders';
      window.location.reload();
    }, 2000);
  };

  const canEditDelivery = () => {
    if (!isSeller || order.status.toUpperCase() !== 'PENDING') return false;
    // Allow editing if payment status is pending or undefined
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return !paymentStatus || paymentStatus === 'pending';
  };

  const canEditPricing = () => {
    if (!isSeller || order.status.toUpperCase() !== 'PENDING') return false;
    // Allow editing if payment status is pending or undefined
    const paymentStatus = order.paymentStatus?.toLowerCase();
    return !paymentStatus || paymentStatus === 'pending';
  };


  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Order #{order.orderNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Placed on {formatDate(order.createdAt)}
                  </p>
                </div>
                
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-4"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column - Order Details */}
              <div className="space-y-6">
                {/* Order Status */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Order Status</h4>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div
                      className="flex items-center px-4 py-2 rounded-lg"
                      style={{
                        backgroundColor: `${getStatusColor(order.status)}20`,
                        color: getStatusColor(order.status)
                      }}
                    >
                      {getStatusIcon(order.status)}
                      <span className="ml-2 font-medium capitalize">{order.status}</span>
                    </div>
                    
                    {/* Customer Status Actions */}
                    {(() => {
                      console.log('OrderDetailsModal - Action Buttons Debug:', {
                        isCustomer,
                        canAuthorize: canAuthorizeOrder(),
                        canCancel: canCancelOrder(),
                        orderStatus: order.status,
                        hasActiveTransaction,
                        isSeller,
                        currentUserId: (freshUser || user)?.id,
                        orderCustomerId: order.User_orders_userIdToUser?.id
                      });
                      return null;
                    })()}
                    {isCustomer && (
                      <div className="flex items-center space-x-2">
                        {canAuthorizeOrder() && (
                          <button
                            onClick={() => setShowAuthorizeModal(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 border border-green-300 rounded-lg hover:bg-green-200"
                          >
                            <Shield className="w-4 h-4 mr-1" />
                            Authorize
                          </button>
                        )}
                        {canCancelOrder() && (
                          <button
                            onClick={() => setShowCancelModal(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-lg hover:bg-red-200"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>


                {/* Order Items */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Order Items</h4>
                  <div className="space-y-4">
                    {order.items && order.items.length > 0 ? order.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <img
                            src={getImageUrl(item.product?.images?.[0] || null)}
                            alt={item.product?.title || 'Product'}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        </div>
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.product?.title || 'Unknown Product'}</h5>
                          {item.product?.seller && (
                            <p className="text-sm text-gray-500">by {item.product.seller.name || 'Unknown Seller'}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            {formatPrice(item.unitPrice, order.currencyCode)} × {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatPrice(item.totalPrice, order.currencyCode)}
                          </p>
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">
                        No items found for this order
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Shipping Address</h4>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-gray-900">{order.shippingAddress.address}</p>
                          <p className="text-gray-600">
                            {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                          </p>
                          <p className="text-gray-600">{order.shippingAddress.country}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Details */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Delivery Details</h4>
                    {canEditDelivery() && (
                      <button
                        onClick={() => setEditingDelivery(!editingDelivery)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {editingDelivery ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>
                  
                  {editingDelivery ? (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Method
                        </label>
                        <select
                          value={deliveryForm.method}
                          onChange={(e) => setDeliveryForm(prev => ({ ...prev, method: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select delivery method</option>
                          <option value="standard">Standard Delivery</option>
                          <option value="express">Express Delivery</option>
                          <option value="pickup">Pick Up</option>
                          <option value="international">International Delivery</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delivery Price ({order?.currencyCode || 'USD'})
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={deliveryForm.price}
                          onChange={(e) => setDeliveryForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter delivery price"
                        />
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleDeliveryUpdate}
                          disabled={loading || !deliveryForm.method}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {loading ? 'Updating...' : 'Update Delivery'}
                        </button>
                        <button
                          onClick={() => setEditingDelivery(false)}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Method:</span>
                        <span className="text-gray-900">{order.shippingMethod || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="text-gray-900 capitalize">{order.status}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Order Summary & Actions */}
              <div className="space-y-6">
                {/* Customer Information */}
                {order.customer && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h4>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      {order.customer.phone && (
                        <div className="flex items-center space-x-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{order.customer.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">{order.customer.name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                {order.paymentStatus && (
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h4>
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className="font-medium"
                          style={{ color: getPaymentStatusColor(order.paymentStatus) }}
                        >
                          {order.paymentStatus}
                        </span>
                      </div>
                      {order.paymentMethod && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Method:</span>
                          <span className="text-gray-900">{order.paymentMethod}</span>
                        </div>
                      )}
                      {order.paidAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Paid At:</span>
                          <span className="text-gray-900">{formatDate(order.paidAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Order Summary */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-medium text-gray-900">Order Summary</h4>
                    {canEditPricing() && (
                      <button
                        onClick={() => setEditingPricing(!editingPricing)}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {editingPricing ? 'Cancel' : 'Edit Discount'}
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    {/* Items Breakdown */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Items ({order.items?.length || 0}):</span>
                        <span className="text-gray-900">{formatPrice(computeOrderTotal(order), order.currencyCode)}</span>
                      </div>
                      
                      {/* Individual Items */}
                      {order.items && order.items.map((item, index) => (
                        <div key={item.id} className="ml-4 text-sm text-gray-500">
                          {item.product?.title || 'Unknown Product'} × {item.quantity} = {formatPrice(item.totalPrice, order.currencyCode)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Delivery */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Delivery:</span>
                      <span className="text-gray-900">{formatPrice(order.shippingAmount || 0, order.currencyCode)}</span>
                    </div>
                    
                    {/* Discount */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Discount:</span>
                      {editingPricing ? (
                        <div className="flex items-center space-x-2">
                          <Percent className="w-4 h-4 text-gray-400" />
                          <input
                            type="number"
                            value={pricingForm.discountAmount}
                            onChange={(e) => setPricingForm(prev => ({ ...prev, discountAmount: Number(e.target.value) }))}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      ) : (
                        <span className="text-gray-900">-{formatPrice(order.discountAmount || 0, order.currencyCode)}</span>
                      )}
                    </div>
                    
                    {/* Tax (if applicable) */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Tax:</span>
                      <span className="text-gray-900">{formatPrice(0, order.currencyCode)}</span>
                    </div>
                    
                    {/* Total */}
                    <div className="border-t border-gray-300 pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900">Total:</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatPrice(computeOrderPayableTotal(order), order.currencyCode)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Edit Pricing Actions */}
                    {editingPricing && (
                      <div className="pt-4 border-t border-gray-300">
                        <div className="flex space-x-3">
                          <button
                            onClick={handlePricingUpdate}
                            disabled={loading}
                            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? 'Updating...' : 'Save Discount'}
                          </button>
                          <button
                            onClick={() => setEditingPricing(false)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Section for Authorized Orders */}
                {isCustomer && order.status.toUpperCase() === 'AUTHORIZED' && (
                  <div className={`p-6 rounded-xl border-2 ${
                    checkingTransactions 
                      ? 'bg-amber-50 border-amber-200' 
                      : !canMakePayment
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-start space-x-4">
                      <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                        checkingTransactions 
                          ? 'bg-amber-100' 
                          : !canMakePayment
                            ? 'bg-orange-100'
                            : 'bg-green-100'
                      }`}>
                        {checkingTransactions ? (
                          <Clock className="w-6 h-6 text-amber-600 animate-spin" />
                        ) : !canMakePayment ? (
                          <Clock className="w-6 h-6 text-orange-600" />
                        ) : (
                          <Shield className="w-6 h-6 text-green-600" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-xl font-semibold mb-2 ${
                          checkingTransactions 
                            ? 'text-amber-900' 
                            : !canMakePayment
                              ? 'text-orange-900'
                              : 'text-green-900'
                        }`}>
                          {checkingTransactions 
                            ? 'Checking Payment Status'
                            : !canMakePayment
                              ? 'Payment in Progress'
                              : 'Complete Your Payment'
                          }
                        </h4>
                        
                        <p className={`text-base leading-relaxed mb-4 ${
                          checkingTransactions 
                            ? 'text-amber-700' 
                            : !canMakePayment
                              ? 'text-orange-700'
                              : 'text-green-700'
                        }`}>
                          {checkingTransactions 
                            ? 'Please wait while we check for any existing payment transactions...'
                            : !canMakePayment
                              ? 'This order has a payment transaction currently in progress. Please wait for it to complete before attempting another payment.'
                              : 'Your order has been authorized and is ready for payment. Complete the payment to finalize your purchase and confirm your order.'
                          }
                        </p>
                        
                        <div className="flex items-center space-x-3">
                      <button
                        onClick={handlePaymentButtonClick}
                        disabled={checkingTransactions || !canMakePayment || loadingPaymentMethods}
                        className={`inline-flex items-center px-8 py-3 text-base font-semibold rounded-xl transition-all duration-200 ${
                          checkingTransactions || !canMakePayment || loadingPaymentMethods
                            ? 'text-gray-500 bg-gray-100 border-2 border-gray-200 cursor-not-allowed shadow-sm'
                            : 'text-white bg-gradient-to-r from-green-600 to-green-700 border-2 border-green-600 hover:from-green-700 hover:to-green-800 hover:shadow-lg hover:scale-105 active:scale-95'
                        }`}
                      >
                            {checkingTransactions ? (
                              <>
                                <Clock className="w-5 h-5 mr-3 animate-spin" />
                                Checking Status...
                              </>
                            ) : loadingPaymentMethods ? (
                              <>
                                <Clock className="w-5 h-5 mr-3 animate-spin" />
                                Loading Payment Methods...
                              </>
                            ) : !canMakePayment ? (
                              <>
                                <Clock className="w-5 h-5 mr-3" />
                                Payment in Progress
                              </>
                            ) : (
                              <>
                                <Shield className="w-5 h-5 mr-3" />
                                Pay Now
                              </>
                            )}
                          </button>
                          
                          {!canMakePayment && (
                            <span className="text-sm text-orange-600 font-medium">
                              Please wait for completion
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Authorization Modal */}
      {showAuthorizeModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowAuthorizeModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <Shield className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Authorize Order</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Are you sure you want to authorize this order? This will confirm the order and allow the seller to proceed with processing.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowAuthorizeModal(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAuthorizeOrder}
                      disabled={loading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading ? 'Authorizing...' : 'Authorize Order'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowCancelModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cancel Order</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to cancel this order? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowCancelModal(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Keep Order
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={loading}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {loading ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowSuccessModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Success</h3>
                  <p className="text-sm text-gray-500 mb-4">{modalMessage}</p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowErrorModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-sm text-gray-500 mb-4">{modalMessage}</p>
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Selection Modal */}
      {order && (
        <PaymentGatewayModal
          isOpen={showPaymentGatewayModal}
          onClose={() => setShowPaymentGatewayModal(false)}
          onGatewaySelected={handleGatewaySelected}
          amount={order.totalAmount}
          currency={order.currencyCode}
        />
      )}

      {/* Payment Method Selection Modal */}
      <PaymentMethodModal
        isOpen={showPaymentMethodModal}
        onClose={() => setShowPaymentMethodModal(false)}
        onSelectPaymentMethod={handlePaymentMethodSelected}
        orderTotal={order?.totalAmount || 0}
        currencyCode={order?.currencyCode || 'USD'}
        userPhoneNumber={user?.phoneNumber}
        gatewayType={selectedGateway?.type}
      />

      {/* Add Payment Method Modal */}
      <AddPaymentMethodModal
        isOpen={showAddPaymentMethodModal}
        onClose={() => setShowAddPaymentMethodModal(false)}
        onPaymentMethodAdded={handlePaymentMethodAdded}
        userPhoneNumber={user?.phoneNumber}
        existingPaymentMethods={paymentMethods.map(method => ({
          provider: method.provider,
          type: method.type
        }))}
      />


      {/* New Stripe Elements Payment Modal */}
      {order && selectedGateway?.type === 'card' && (
        <StripePaymentModal
          isOpen={showStripePaymentModal}
          onClose={() => {
            setShowStripePaymentModal(false);
            setSelectedPaymentMethod(null);
            setSelectedGateway(null);
          }}
          onPaymentSuccess={handleStripePaymentSuccess}
          orderId={order.id}
          amount={computeOrderPayableTotal(order)}
          currency={order.currencyCode}
          description={`Payment for Order ${order.orderNumber}`}
          customerId={user?.id}
          cardholderName={selectedPaymentMethod?.accountName}
        />
      )}

      {/* Payment Processing Modal */}
      {selectedPaymentMethod && order && selectedGateway && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPaymentMethod(null);
            setSelectedGateway(null);
          }}
          onPaymentSuccess={handlePaymentSuccess}
          orderId={order.id}
          amount={order.totalAmount}
          currency={order.currencyCode}
          description={`Payment for Order ${order.orderNumber}`}
          customerId={user?.id}
          paymentMethod={selectedPaymentMethod}
          gateway={selectedGateway}
        />
      )}
    </div>
  );
}
