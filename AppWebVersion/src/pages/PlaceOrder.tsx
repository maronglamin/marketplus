import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, MapPin, Plus, Trash2 } from 'lucide-react';
import { productService } from '../api/products';
import { deliveryAddressService, type DeliveryAddress, type CreateDeliveryAddressRequest } from '../api/deliveryAddresses';
import { getApi } from '../api/config';
import { API_CONFIG } from '../config/api';

interface ProductDetail {
  id: string;
  name: string;
  price: number;
  currencyCode: string;
  images: string[];
  description: string;
  condition: string;
  category: string;
  views: number;
  stock: number;
  seller: {
    name: string;
    rating: number | null;
    products: number;
    image: string | null;
  };
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export function PlaceOrder() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  
  // Form data
  const [quantity, setQuantity] = useState(1);
  const [shippingAddress, setShippingAddress] = useState('');

  // Delivery address management
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  
  // New address form state
  const [newAddress, setNewAddress] = useState<CreateDeliveryAddressRequest>({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    label: '',
    isDefault: false
  });
  
  // Validation errors for new address
  const [addressErrors, setAddressErrors] = useState<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }>({});

  // Modal states for confirmations
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState('');

  const loadProductDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const productData = await productService.getProductById(productId!);
      setProduct(productData as ProductDetail);
    } catch (error: any) {
      console.error('Error loading product details:', error);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadDeliveryAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const response = await deliveryAddressService.getDeliveryAddresses();
      setDeliveryAddresses(response.addresses);
      
      // Set default address if available
      const defaultAddress = response.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress);
        setShippingAddress(formatAddressString(defaultAddress));
      }
    } catch (error) {
      console.error('Error loading delivery addresses:', error);
      // Don't show error for addresses as they're not critical
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (productId) {
      loadProductDetails();
      loadDeliveryAddresses();
    }
  }, [productId, loadProductDetails, loadDeliveryAddresses]);

  const formatAddressString = (address: DeliveryAddress): string => {
    const parts = [
      address.address,
      address.city,
      address.state,
      address.postalCode,
      address.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  const handleAddNewAddress = async () => {
    if (!validateNewAddress()) {
      return;
    }

    try {
      const response = await deliveryAddressService.createDeliveryAddress(newAddress);
      
      // Refresh addresses and select the new one
      await loadDeliveryAddresses();
      setSelectedAddress(response.address);
      setShippingAddress(formatAddressString(response.address));
      
      // Reset form
      setNewAddress({
        address: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
        label: '',
        isDefault: false
      });
      setShowAddAddressModal(false);
      setAddressErrors({});
      
      setModalMessage('Delivery address added successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      setModalMessage(error.message || 'Failed to add delivery address');
      setShowErrorModal(true);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteAddress = async () => {
    if (!addressToDelete) return;

    try {
      await deliveryAddressService.deleteDeliveryAddress(addressToDelete);
      
      // Refresh addresses
      await loadDeliveryAddresses();
      
      // If the deleted address was selected, clear selection
      if (selectedAddress?.id === addressToDelete) {
        setSelectedAddress(null);
        setShippingAddress('');
      }
      
      setShowDeleteConfirmModal(false);
      setAddressToDelete(null);
      setModalMessage('Delivery address deleted successfully!');
      setShowSuccessModal(true);
    } catch (error: any) {
      setShowDeleteConfirmModal(false);
      setAddressToDelete(null);
      setModalMessage(error.message || 'Failed to delete delivery address');
      setShowErrorModal(true);
    }
  };

  const validateField = (field: string, value: string, required: boolean = true) => {
    if (required && !value.trim()) {
      return `${field} is required`;
    }
    return '';
  };

  const validateNewAddress = () => {
    const newErrors: {
      address?: string;
      city?: string;
      state?: string;
      country?: string;
    } = {};

    // Validate required fields
    const addressError = validateField('Address', newAddress.address);
    const cityError = validateField('City', newAddress.city);
    const stateError = validateField('State/Province', newAddress.state);
    const countryError = validateField('Country', newAddress.country);

    if (addressError) newErrors.address = addressError;
    if (cityError) newErrors.city = cityError;
    if (stateError) newErrors.state = stateError;
    if (countryError) newErrors.country = countryError;

    setAddressErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (addressErrors[field as keyof typeof addressErrors]) {
      setAddressErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!product) {
      setError('Product information not available');
      return;
    }

    // Basic validation
    if (!shippingAddress.trim()) {
      setError('Please select a delivery address');
      return;
    }


    try {
      setSubmitting(true);
      setError(null);
      
      const orderData = {
        productId: product.id,
        quantity,
        totalAmount: product.price * quantity,
        currencyCode: product.currencyCode,
        shippingAddress: selectedAddress ? JSON.stringify({
          address: selectedAddress.address,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.postalCode || '',
          country: selectedAddress.country,
        }) : '',
        // Add a unique client request id to avoid duplicate conflicts and enable repeat orders
        clientRequestId: `${product.id}-${Date.now()}`,
      };

      console.log('Placing order with data:', orderData);

      const response = await getApi().post('/orders', orderData);
      
      console.log('Order placed successfully:', response.data);
      setOrderNumber(response.data.order?.orderNumber || 'N/A');
      setSuccess(true);
      
    } catch (error: any) {
      console.error('Error creating order:', error);
      
      // Handle specific API errors
      if (error.response?.status === 400) {
        const errorMessage = error.response?.data?.message || 'Invalid order data. Please check your information.';
        setError(errorMessage);
      } else if (error.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (error.response?.status === 404) {
        setError('The product is no longer available.');
      } else if (error.response?.status === 409 && error.response?.data?.message === 'Order already exist') {
        setError('A similar order was recently submitted. Please try again in a moment.');
      } else if (error.response?.status === 409) {
        setError('The requested quantity is no longer available. Please try with a smaller quantity.');
      } else {
        setError('Failed to place order. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      GMD: 'D',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  };

  const getImageUrl = (image: string) => {
    if (!image) return 'https://via.placeholder.com/400x300?text=No+Image';
    if (image.startsWith('http')) return image;
    const baseUrl = API_CONFIG.BASE_URL.replace('/api', '');
    return `${baseUrl}${image}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-gray-600">Loading product details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button
              onClick={loadProductDetails}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingCart className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully!</h1>
            <p className="text-gray-600 mb-2">Your order has been created and sent to the seller.</p>
            <p className="text-sm text-gray-500 mb-8">Order Number: {orderNumber}</p>
            <div className="space-x-4">
              <button
                onClick={() => navigate(`/product/${productId}`)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Product
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/product/${productId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Product
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Place Order</h1>
          <p className="text-gray-600 mt-2">Complete your order for this product</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Info & Order Summary */}
          <div className="space-y-6">
            {/* Product Details */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h2>
              {product && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(product.price, product.currencyCode)}
                      </p>
                      <p className="text-sm text-gray-500">by {product.seller.name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Quantity:</span>
                  <span className="font-medium">{quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Unit Price:</span>
                  <span className="font-medium">
                    {product && formatPrice(product.price, product.currencyCode)}
                  </span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      {product && formatPrice(product.price * quantity, product.currencyCode)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Form */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Information</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(product?.stock || 1, quantity + 1))}
                    className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Available: {product?.stock || 0} units
                </p>
              </div>


              {/* Shipping Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Delivery Address</h3>
                
                {selectedAddress ? (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                          <span className="font-medium text-gray-900">
                            {selectedAddress.label || 'Selected Address'}
                          </span>
                          {selectedAddress.isDefault && (
                            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 text-sm">{selectedAddress.address}</p>
                        <p className="text-gray-700 text-sm">
                          {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}
                        </p>
                        <p className="text-gray-700 text-sm">{selectedAddress.country}</p>
                </div>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Change
                      </button>
                </div>
              </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddressModal(true)}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Plus className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <span className="text-gray-600 font-medium">Select Delivery Address</span>
                  </button>
                )}

              </div>


              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedAddress}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Creating Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Place Order
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowAddressModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Select Delivery Address</h3>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                {loadingAddresses ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading addresses...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deliveryAddresses.map((address) => (
                      <div
                        key={address.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAddress?.id === address.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => {
                          setSelectedAddress(address);
                          setShippingAddress(formatAddressString(address));
                          setShowAddressModal(false);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center mb-1">
                              <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                              <span className="font-medium text-gray-900">
                                {address.label || 'Address'}
                              </span>
                              {address.isDefault && (
                                <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-gray-700 text-sm">{address.address}</p>
                            <p className="text-gray-700 text-sm">
                              {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-gray-700 text-sm">{address.country}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAddress(address.id);
                            }}
                            className="ml-2 text-red-600 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => {
                        setShowAddressModal(false);
                        setShowAddAddressModal(true);
                      }}
                      className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Plus className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                      <span className="text-gray-600 font-medium">Add New Address</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Address Modal */}
      {showAddAddressModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowAddAddressModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Add New Address</h3>
                <button
                  onClick={() => {
                    setShowAddAddressModal(false);
                    setNewAddress({
                      address: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: '',
                      label: '',
                      isDefault: false
                    });
                    setAddressErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-96">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label (Optional)</label>
                    <input
                      type="text"
                      value={newAddress.label}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Home, Office"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                    <textarea
                      value={newAddress.address}
                      onChange={(e) => {
                        setNewAddress(prev => ({ ...prev, address: e.target.value }));
                        clearFieldError('address');
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        addressErrors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your street address"
                      rows={2}
                    />
                    {addressErrors.address && (
                      <p className="mt-1 text-sm text-red-600">{addressErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                      <input
                        type="text"
                        value={newAddress.city}
                        onChange={(e) => {
                          setNewAddress(prev => ({ ...prev, city: e.target.value }));
                          clearFieldError('city');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          addressErrors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="City"
                      />
                      {addressErrors.city && (
                        <p className="mt-1 text-sm text-red-600">{addressErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State/Province *</label>
                      <input
                        type="text"
                        value={newAddress.state}
                        onChange={(e) => {
                          setNewAddress(prev => ({ ...prev, state: e.target.value }));
                          clearFieldError('state');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          addressErrors.state ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="State"
                      />
                      {addressErrors.state && (
                        <p className="mt-1 text-sm text-red-600">{addressErrors.state}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={newAddress.postalCode}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, postalCode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Postal Code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                      <input
                        type="text"
                        value={newAddress.country}
                        onChange={(e) => {
                          setNewAddress(prev => ({ ...prev, country: e.target.value }));
                          clearFieldError('country');
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          addressErrors.country ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Country"
                      />
                      {addressErrors.country && (
                        <p className="mt-1 text-sm text-red-600">{addressErrors.country}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="makeDefault"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, isDefault: e.target.checked }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="makeDefault" className="ml-2 block text-sm text-gray-700">
                      Set as default address
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => {
                    setShowAddAddressModal(false);
                    setNewAddress({
                      address: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: '',
                      label: '',
                      isDefault: false
                    });
                    setAddressErrors({});
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNewAddress}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700"
                >
                  Save Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowDeleteConfirmModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Address</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete this delivery address? This action cannot be undone.
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowDeleteConfirmModal(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteAddress}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700"
                    >
                      Delete
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowSuccessModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Success</h3>
                  <p className="text-sm text-gray-500 mb-6">{modalMessage}</p>
                  <button
                    onClick={() => setShowSuccessModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700"
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
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setShowErrorModal(false)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
                  <p className="text-sm text-gray-500 mb-6">{modalMessage}</p>
                  <button
                    onClick={() => setShowErrorModal(false)}
                    className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
