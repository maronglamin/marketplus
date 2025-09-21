import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Send, MessageCircle, User, Star } from 'lucide-react';
import { productService } from '../api/products';
import { getApi } from '../api/config';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

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

export function ShowInterest() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interestExists, setInterestExists] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Form data
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  
  const messagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesRef.current) {
      setTimeout(() => {
        messagesRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    if (productId) {
      initializeScreen();
    }
  }, [productId, user]);

  const initializeScreen = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load product details
      const productData = await productService.getProductById(productId!);
      setProduct(productData as ProductDetail);
      
      // Check if interest already exists
      const interestCheck = await getApi().get(`/products/${productId}/interest/check`);
      console.log('Interest check response:', interestCheck.data);
      
      const exists = interestCheck.data.exists;
      setInterestExists(exists);
      
      // If interest exists, load messages
      if (exists && interestCheck.data.interest?.id) {
        console.log('Loading messages for interest:', interestCheck.data.interest.id);
        await loadInterestMessages(interestCheck.data.interest.id);
      }
      
      console.log('Interest exists state set to:', exists);
    } catch (error: any) {
      console.error('Error initializing screen:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadInterestMessages = async (interestId: string) => {
    try {
      setLoadingMessages(true);
      console.log('Loading messages for interest ID:', interestId);
      
      const response = await getApi().get(`/products/interests/${interestId}`);
      console.log('Messages response:', response.data);
      
      if (response.data.messages && Array.isArray(response.data.messages)) {
        // Validate and transform messages to ensure correct format
        const validatedMessages = response.data.messages.map((msg: any, index: number) => {
          // Handle different message formats
          if (typeof msg === 'object' && msg !== null) {
            // New format: { id, content, senderId, senderName, createdAt }
            if (msg.content && msg.senderId) {
              return {
                id: msg.id || `msg_${index}`,
                content: String(msg.content),
                senderId: String(msg.senderId),
                senderName: String(msg.senderName || 'Unknown'),
                createdAt: msg.createdAt || new Date().toISOString()
              };
            }
            // Old format: { userName, message, timestamp }
            else if (msg.message && msg.userName) {
              return {
                id: msg.id || `msg_${index}`,
                content: String(msg.message),
                senderId: String(msg.userId || 'unknown'),
                senderName: String(msg.userName),
                createdAt: msg.timestamp || msg.createdAt || new Date().toISOString()
              };
            }
            // Fallback: try to extract any string content
            else {
              const content = msg.content || msg.message || JSON.stringify(msg);
              return {
                id: msg.id || `msg_${index}`,
                content: String(content),
                senderId: String(msg.senderId || msg.userId || 'unknown'),
                senderName: String(msg.senderName || msg.userName || 'Unknown'),
                createdAt: msg.createdAt || msg.timestamp || new Date().toISOString()
              };
            }
          }
          
          // If it's a string, wrap it in a message object
          if (typeof msg === 'string') {
            return {
              id: `msg_${index}`,
              content: msg,
              senderId: 'unknown',
              senderName: 'Unknown',
              createdAt: new Date().toISOString()
            };
          }
          
          // Fallback for any other type
          return {
            id: `msg_${index}`,
            content: String(msg),
            senderId: 'unknown',
            senderName: 'Unknown',
            createdAt: new Date().toISOString()
          };
        });
        
        setMessages(validatedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) {
      return;
    }

    if (!user) {
      setError('Please log in to send messages');
      return;
    }

    try {
      setSendingMessage(true);
      
      // First, get the interest ID if we don't have it
      const interestCheckResponse = await getApi().get(`/products/${productId}/interest/check`);
      if (!interestCheckResponse.data.exists) {
        setError('Interest not found');
        return;
      }

      const interestId = interestCheckResponse.data.interest.id;
      
      // Send message using the correct endpoint
      const response = await getApi().post(`/products/interests/${interestId}/messages`, {
        content: message.trim()
      });
      
      // Add the new message to the list
      const newMessage = {
        id: response.data.id,
        content: message.trim(),
        senderId: user.id || 'unknown',
        senderName: user.firstName || 'You',
        createdAt: response.data.createdAt
      };
      
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const messageExists = prev.some(msg => msg.id === newMessage.id);
        if (messageExists) {
          return prev;
        }
        return [...prev, newMessage];
      });
      setMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    if (!product) {
      setError('Product information not available');
      return;
    }

    if (!user) {
      setError('Please log in to submit interest');
      return;
    }

    // If interest already exists, send a message instead of creating new interest
    if (interestExists) {
      console.log('Interest already exists, sending message instead');
      await sendMessage();
      return;
    }

    // Double-check interest existence before creating new one
    try {
      const doubleCheck = await getApi().get(`/products/${productId}/interest/check`);
      if (doubleCheck.data.exists) {
        console.log('Interest exists on double-check, switching to chat mode');
        setInterestExists(true);
        if (doubleCheck.data.interest?.id) {
          await loadInterestMessages(doubleCheck.data.interest.id);
        }
        await sendMessage();
        return;
      }
    } catch (checkError) {
      console.error('Error in double-check:', checkError);
      // Continue with normal flow if check fails
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await getApi().post(`/products/${productId}/interest`, {
        quantity: quantity,
        notes: JSON.stringify({
          [`${user.id}_${user.firstName || 'You'}_${Date.now()}`]: message.trim()
        }),
      });

      console.log('Interest submitted successfully:', response.data);
      setInterestExists(true);
      
      // Reload messages to get the proper format
      if (response.data.interest?.id) {
        loadInterestMessages(response.data.interest.id);
      }
      
      setMessage('');
      setError(null);
      
    } catch (error: any) {
      console.error('Error submitting interest:', error);
      
      let errorMessage = 'Failed to submit interest. Please try again.';
      
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('already have a pending interest')) {
          // If we get this error, it means the interest exists but our state wasn't updated
          // Let's refresh the interest check and switch to chat mode
          console.log('Interest exists but state not updated, refreshing...');
          try {
            const interestCheck = await getApi().get(`/products/${productId}/interest/check`);
            if (interestCheck.data.exists) {
              setInterestExists(true);
              if (interestCheck.data.interest?.id) {
                loadInterestMessages(interestCheck.data.interest.id);
              }
              // Now send the message
              await sendMessage();
              return;
            }
          } catch (refreshError) {
            console.error('Error refreshing interest check:', refreshError);
          }
          errorMessage = 'You already have a pending interest for this product. Please use the chat to continue the conversation.';
        } else {
          errorMessage = error.response.data.error;
        }
      }
      
      setError(errorMessage);
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

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('Error formatting time:', error);
      return 'Invalid time';
    }
  };

  const renderMessage = (message: any, index: number) => {
    // Safety check: ensure message is an object with required properties
    if (!message || typeof message !== 'object') {
      console.warn('Invalid message object:', message);
      return null;
    }
    
    // Ensure all required properties are strings
    const safeMessage = {
      id: String(message.id || `msg_${index}`),
      content: String(message.content || message.message || ''),
      senderId: String(message.senderId || message.userId || 'unknown'),
      senderName: String(message.senderName || message.userName || 'Unknown'),
      createdAt: String(message.createdAt || message.timestamp || new Date().toISOString())
    };
    
    // Handle legacy key format for backward compatibility
    if (safeMessage.id.includes('_') && !safeMessage.id.match(/\d{13,}$/)) {
      const keyParts = safeMessage.id.split('_');
      safeMessage.senderId = keyParts[0];
      safeMessage.senderName = keyParts.slice(1).join('_');
    }
    
    const isOwnMessage = safeMessage.senderId === user?.id;
    
    return (
      <div key={safeMessage.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwnMessage 
            ? 'bg-blue-600 text-white rounded-br-sm' 
            : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}>
          <p className="text-sm">{safeMessage.content}</p>
          <div className="flex justify-between items-center mt-1">
            <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
              {isOwnMessage ? 'You' : safeMessage.senderName}
            </span>
            <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
              {formatTime(safeMessage.createdAt)}
            </span>
          </div>
        </div>
      </div>
    );
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
              onClick={() => initializeScreen()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/product/${productId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Product
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Show Interest</h1>
          <p className="text-gray-600 mt-2">Express your interest in this product to the seller</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Product Details */}
          <div className="space-y-6">
            {/* Product Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Details</h2>
              {product && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(product.price, product.currencyCode)}
                      </p>
                      <p className="text-sm text-gray-500">by {product.seller.name}</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">{product.description}</p>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Stock: {product.stock}</span>
                      <span>Views: {product.views}</span>
                      <span>Category: {product.category}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Seller Card */}
            {product && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Seller Information</h2>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-gray-700">
                      {product.seller.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-lg">{product.seller.name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      {product.seller.rating ? (
                        <>
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                          <span className="text-sm text-gray-600">{product.seller.rating.toFixed(1)}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-600">No rating</span>
                      )}
                      <span className="text-sm text-gray-500">• {product.seller.products} products</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Interest Form or Chat */}
          <div>
          {!interestExists ? (
            // Original form for new interest
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Express Your Interest</h2>
              <p className="text-sm text-gray-600 mb-6">Send a message to the seller to express your interest in this product.</p>
                
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
                      Total: {product && formatPrice(product.price * quantity, product.currencyCode)}
                    </p>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message to Seller <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell the seller about your interest, ask questions, or discuss details..."
                      required
                    />
                  </div>

                  {/* Tips */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for a successful interest:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Be specific about what you're interested in</li>
                      <li>• Mention any questions you have about the product</li>
                      <li>• Be polite and professional in your message</li>
                    </ul>
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
                    disabled={submitting || !message.trim()}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Heart className="w-5 h-5 mr-2" />
                        Submit Interest
                      </>
                    )}
                  </button>
                </form>
              </div>
            ) : (
              // Chat interface for existing interest
              <div className="bg-white rounded-xl shadow-sm p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Conversation</h2>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                    Interest Submitted
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">Continue your conversation with the seller about this product.</p>
                
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading messages...</span>
                  </div>
                ) : messages.length > 0 ? (
                  <div className="h-96 overflow-y-auto space-y-4 mb-6" ref={messagesRef}>
                    {messages
                      .map((message, index) => renderMessage(message, index))
                      .filter(Boolean) // Filter out null messages
                    }
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No messages yet. Start the conversation!</p>
                  </div>
                )}

                {/* Chat Input */}
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim() || sendingMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {sendingMessage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
