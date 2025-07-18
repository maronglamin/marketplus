import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { Ionicons } from '@expo/vector-icons';
import { productService, type ProductDetail } from '../services/productService';
import { getImageUrl } from '../config/env';
import { api } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';

// Debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

type ShowInterestNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ShowInterest'>;
type ShowInterestRouteProp = RouteProp<AppStackParamList, 'ShowInterest'>;

export function ShowInterest() {
  const navigation = useNavigation<ShowInterestNavigationProp>();
  const route = useRoute<ShowInterestRouteProp>();
  const { productId } = route.params;
  const { user, token, isLoading: authLoading } = useAuth();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [interestExists, setInterestExists] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const messagesRef = useRef<ScrollView | null>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    if (messagesRef.current) {
      setTimeout(() => {
        messagesRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  // Add notification listeners
  useEffect(() => {
    const notificationListener = notificationService.addNotificationListener((notification) => {
      console.log('ShowInterest: Received notification:', notification);
      // Refresh messages when a new message notification is received
      const data = notification.request.content.data as any;
      if (data?.type === 'new_message' && data?.interestId) {
        loadInterestMessages(data.interestId);
      }
    });

    const notificationResponseListener = notificationService.addNotificationResponseListener((response) => {
      console.log('ShowInterest: Notification tapped:', response);
      // Handle notification tap if needed
    });

    return () => {
      notificationService.removeNotificationListener(notificationListener);
      notificationService.removeNotificationListener(notificationResponseListener);
    };
  }, []);

  // Single useEffect to handle all initial loading
  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const initializeScreen = async () => {
      console.log('ShowInterest: initializeScreen called', { 
        authLoading, 
        user: !!user, 
        token: !!token, 
        productId 
      });
      
      // Debug: Check AsyncStorage directly
      const storedToken = await AsyncStorage.getItem('token');
      const storedUser = await AsyncStorage.getItem('user');
      console.log('ShowInterest: Direct AsyncStorage check:', {
        hasStoredToken: !!storedToken,
        hasStoredUser: !!storedUser,
        tokenLength: storedToken?.length,
        userData: storedUser ? JSON.parse(storedUser) : null
      });
      
      // Always wait for auth to finish loading first
      if (authLoading) {
        console.log('ShowInterest: Waiting for auth to finish loading');
        return; // Wait for auth to finish loading
      }
      
      // Add a small delay to ensure auth context has fully settled
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // CRITICAL: If we have a stored token, we should be able to proceed regardless of auth context state
      if (storedToken) {
        console.log('ShowInterest: Found stored token, proceeding with stored data');
        
        // If auth context doesn't have user data but we have stored token, create basic user data
        if (!storedUser) {
          console.log('ShowInterest: No stored user data, creating from token');
          try {
            const tokenParts = storedToken.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log('ShowInterest: Token payload:', payload);
              
              if (payload.userId) {
                const basicUserData = {
                  id: payload.userId,
                  firstName: 'User',
                  lastName: 'User',
                  phoneNumber: 'Unknown',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                
                await AsyncStorage.setItem('user', JSON.stringify(basicUserData));
                console.log('ShowInterest: Basic user data created and saved');
              }
            }
          } catch (error) {
            console.error('ShowInterest: Error creating user data from token:', error);
          }
        }
        
        // Proceed with the stored token regardless of auth context state
        console.log('ShowInterest: Proceeding with stored token');
      } else {
        // No stored token - this is a real auth issue
        console.log('ShowInterest: No stored token found, user needs to log in');
        if (isMounted) {
          setError('Please log in to continue');
          setLoading(false);
        }
        return;
      }

      // Register for push notifications
      try {
        console.log('ShowInterest: Registering for push notifications');
        const fcmToken = await notificationService.registerForPushNotifications();
        if (fcmToken && user?.id) {
          console.log('ShowInterest: Sending FCM token to backend');
          await notificationService.sendTokenToBackend(user.id);
        }
      } catch (notificationError) {
        console.error('ShowInterest: Error registering for notifications:', notificationError);
        // Don't fail the request if notification registration fails
      }

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted && loading) {
          console.log('ShowInterest: Loading timeout reached');
          setError('Loading timeout. Please try again.');
          setLoading(false);
        }
      }, 30000); // 30 second timeout

      try {
        console.log('ShowInterest: Starting to load data');
        if (isMounted) {
      setLoading(true);
      setError(null);
        }
        
        // Test API connection first
        console.log('ShowInterest: Testing API connection...');
        try {
          const testResponse = await api.get('/api/health');
          console.log('ShowInterest: API health check successful:', testResponse.status);
        } catch (testError) {
          console.error('ShowInterest: API health check failed:', testError);
          if (isMounted) {
            setError('Cannot connect to server. Please check your internet connection.');
            setLoading(false);
          }
          return;
        }
        
        // Load product details first
        console.log('ShowInterest: Loading product details');
      const productDetail = await productService.getProductById(productId);
        console.log('ShowInterest: Product loaded successfully', { productId: productDetail.id });
        
        if (isMounted) {
      setProduct(productDetail);
        }
        
        // Then check interest
        console.log('ShowInterest: Checking interest');
        const interestCheck = await api.get(`/api/products/${productId}/interest/check`);
        console.log('ShowInterest: Interest check result', interestCheck.data);
        
        if (isMounted) {
          setInterestExists(interestCheck.data.exists);
        }
        
        // If interest exists, load messages
        if (interestCheck.data.exists && interestCheck.data.interest?.id) {
          console.log('ShowInterest: Loading messages for existing interest');
          loadInterestMessages(interestCheck.data.interest.id);
        }
    } catch (error) {
        console.error('ShowInterest: Error initializing screen:', error);
        if (isMounted) {
          let errorMessage = 'Failed to load data. Please try again.';
          if (error instanceof Error) {
            errorMessage = `Error: ${error.message}`;
          } else if (typeof error === 'object' && error !== null) {
            errorMessage = `Error: ${JSON.stringify(error)}`;
          }
          setError(errorMessage);
        }
    } finally {
        if (isMounted) {
          console.log('ShowInterest: Finished loading, setting loading to false');
      setLoading(false);
        }
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    initializeScreen();

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [productId, authLoading, user?.id, token]); // Only depend on user.id instead of entire user object

  const loadInterestMessages = async (interestId: string) => {
    try {
      setLoadingMessages(true);
      
      const response = await api.get(`/api/products/interests/${interestId}`);
      
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
            // Legacy key format: userId_userName (without timestamp)
            else if (msg.id && msg.id.includes('_') && !msg.id.match(/\d{13,}$/)) {
              const keyParts = msg.id.split('_');
              const senderId = keyParts[0];
              const senderName = keyParts.slice(1).join('_');
              return {
                id: msg.id,
                content: String(msg.content || msg.message || ''),
                senderId: String(senderId),
                senderName: String(senderName || 'Unknown'),
                createdAt: msg.createdAt || msg.timestamp || new Date().toISOString()
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

    // Check auth state - we need at least a token
    const currentToken = await AsyncStorage.getItem('token');
    
    if (!currentToken) {
      Alert.alert('Error', 'Please log in to send messages');
      return;
    }

    try {
      setSendingMessage(true);
      
      // First, get the interest ID if we don't have it
      const interestCheckResponse = await api.get(`/api/products/${productId}/interest/check`);
      if (!interestCheckResponse.data.exists) {
        Alert.alert('Error', 'Interest not found');
        return;
      }

      const interestId = interestCheckResponse.data.interest.id;
      
      // Send message using the correct endpoint
      const response = await api.post(`/api/products/interests/${interestId}/messages`, {
        content: message.trim()
      });
      
      // Add the new message to the list
      const newMessage = {
        id: response.data.id,
        content: message.trim(),
        senderId: user?.id || 'unknown',
        senderName: user?.firstName || user?.name || 'You',
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
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const incrementQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    if (!product) {
      Alert.alert('Error', 'Product information not available');
      return;
    }

    try {
      setSubmitting(true);
      
      const response = await api.post(`/api/products/${productId}/interest`, {
        quantity: quantity,
        notes: JSON.stringify({
          [`${user?.id}_${user?.firstName || user?.name || 'You'}_${Date.now()}`]: message.trim()
        }),
      });

      console.log('Interest submitted successfully:', response.data);

      setInterestExists(true);
      
      // Reload messages to get the proper format
      if (response.data.interest?.id) {
        loadInterestMessages(response.data.interest.id);
      }
      
      setMessage('');

      Alert.alert(
        'Success',
        'Your interest has been submitted successfully! You can now continue the conversation with the seller.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Stay on the same screen to continue chatting
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting interest:', error);
      
      let errorMessage = 'Failed to submit interest. Please try again.';
      
      if (error.response?.data?.error) {
        if (error.response.data.error.includes('already have a pending interest')) {
          errorMessage = 'You already have a pending interest for this product.';
        } else {
          errorMessage = error.response.data.error;
        }
      }
      
      Alert.alert('Error', errorMessage);
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
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
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
      <View key={safeMessage.id} style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {safeMessage.content}
          </Text>
        </View>
        
        <View style={styles.messageMeta}>
          <Text style={[
            styles.senderName,
            isOwnMessage ? styles.ownSenderName : styles.otherSenderName
          ]}>
            {isOwnMessage ? 'You' : safeMessage.senderName}
          </Text>
          <Text style={styles.messageTime}>{formatTime(safeMessage.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (authLoading || loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Show Interest</Text>
            <View style={styles.headerRight} />
          </View>
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>
              {authLoading ? 'Loading authentication...' : 'Loading product details...'}
            </Text>
            {authLoading && (
              <Text style={styles.loadingSubtext}>
                Please wait while we verify your login status...
              </Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Show Interest</Text>
            <View style={styles.headerRight} />
          </View>
          
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || 'Product not found'}</Text>
            <TouchableOpacity onPress={() => {
              console.log('ShowInterest: Retry button pressed');
              setLoading(true);
              setError(null);
              // Re-initialize the screen
              const initializeScreen = async () => {
                try {
                  // Wait for auth to be ready
                  if (authLoading) {
                    console.log('ShowInterest: Retry - waiting for auth to finish');
                    setError('Please wait for authentication to complete...');
                    return;
                  }
                  
                  if (!user || !token) {
                    console.log('ShowInterest: Retry - no auth data available');
                    setError('Please log in to continue');
                    setLoading(false);
                    return;
                  }
                  
                  console.log('ShowInterest: Retry - loading product details');
                  const productDetail = await productService.getProductById(productId);
                  console.log('ShowInterest: Retry - product loaded');
                  setProduct(productDetail);
                  
                  console.log('ShowInterest: Retry - checking interest');
                  const interestCheck = await api.get(`/api/products/${productId}/interest/check`);
                  console.log('ShowInterest: Retry - interest check result', interestCheck.data);
                  setInterestExists(interestCheck.data.exists);
                  
                  if (interestCheck.data.exists && interestCheck.data.interest?.id) {
                    console.log('ShowInterest: Retry - loading messages');
                    loadInterestMessages(interestCheck.data.interest.id);
                  }
                } catch (error) {
                  console.error('ShowInterest: Retry error:', error);
                  setError(`Failed to load data: ${error instanceof Error ? error.message : 'Unknown error'}`);
                } finally {
                  setLoading(false);
                }
              };
              initializeScreen();
            }} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Show Interest</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} ref={messagesRef}>
          <View style={styles.productCard}>
            <Image
              source={{ 
                uri: product.images[0] || 'https://via.placeholder.com/400x300?text=No+Image'
              }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.price}>
                {formatPrice(product.price, product.currencyCode)}
              </Text>
            </View>
          </View>

          <View style={styles.sellerCard}>
            <View style={styles.sellerImageContainer}>
              <Text style={styles.sellerInitial}>
                {product.seller.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.seller.name}</Text>
              <View style={styles.ratingContainer}>
                {product.seller.rating ? (
                  <>
                    <Ionicons name="star" size={16} color="#F59E0B" />
                    <Text style={styles.rating}>{product.seller.rating.toFixed(1)}</Text>
                  </>
                ) : (
                  <Text style={styles.rating}>No rating</Text>
                )}
                <Text style={styles.sellerProducts}>
                  {product.seller.products} products
                </Text>
              </View>
            </View>
          </View>

          {!interestExists ? (
            // Original form for new interest
            <>
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message to Seller *</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Write a message to the seller..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.quantityContainer}>
            <Text style={styles.quantityLabel}>Quantity:</Text>
            <TouchableOpacity 
              onPress={decrementQuantity} 
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              disabled={quantity <= 1}
            >
              <Ionicons name="remove" size={20} color={quantity <= 1 ? "#9CA3AF" : "#111827"} />
            </TouchableOpacity>
            <Text style={styles.quantity}>{quantity}</Text>
            <TouchableOpacity 
              onPress={incrementQuantity} 
              style={[styles.quantityButton, product && quantity >= product.stock && styles.quantityButtonDisabled]}
              disabled={product ? quantity >= product.stock : false}
            >
              <Ionicons name="add" size={20} color={product && quantity >= product.stock ? "#9CA3AF" : "#111827"} />
            </TouchableOpacity>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Price:</Text>
            <Text style={styles.totalPrice}>
              {formatPrice(product.price * quantity, product.currencyCode)}
            </Text>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Tips for a successful interest:</Text>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Be specific about what you're interested in
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Mention any questions you have about the product
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.tipText}>
                Be polite and professional in your message
              </Text>
            </View>
          </View>
            </>
          ) : (
            // Chat interface for existing interest
            <>
              <View style={styles.messagesSection}>
                <Text style={styles.sectionTitle}>Conversation</Text>
                
                {loadingMessages ? (
                  <View style={styles.messagesLoading}>
                    <ActivityIndicator size="small" color="#2563EB" />
                    <Text style={styles.messagesLoadingText}>Loading messages...</Text>
                  </View>
                ) : messages.length > 0 ? (
                  <ScrollView 
                    style={styles.messagesScrollView}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    ref={messagesRef}
                    onContentSizeChange={scrollToBottom}
                    onLayout={scrollToBottom}
                  >
                    {messages
                      .map((message, index) => renderMessage(message, index))
                      .filter(Boolean) // Filter out null messages
                    }
                  </ScrollView>
                ) : (
                  <View style={styles.noMessages}>
                    <Ionicons name="chatbubble-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Fixed Chat Input for existing interest */}
        {interestExists && (
          <View style={styles.fixedChatInput}>
            <View style={styles.messageInputContainer}>
              <TextInput
                style={styles.chatInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Type your message..."
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!message.trim() || sendingMessage) && styles.sendButtonDisabled]}
                onPress={() => {
                  sendMessage();
                  Keyboard.dismiss(); // Dismiss keyboard after sending
                }}
                disabled={!message.trim() || sendingMessage}
              >
                {sendingMessage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.footer}>
          {!interestExists ? (
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit Interest</Text>
            )}
          </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563EB',
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sellerImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInitial: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  sellerInfo: {
    marginLeft: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  sellerProducts: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  messageContainer: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    height: 120,
    textAlignVertical: 'top',
    width: '100%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  quantityButton: {
    padding: 8,
  },
  quantityButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginRight: 8,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tipsContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#4B5563',
    marginLeft: 8,
    flex: 1,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    padding: 16,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  ownMessageBubble: {
    backgroundColor: '#2563EB',
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: '#E8F5E8',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#D1F2D1',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
    width: '80%',
  },
  messageText: {
    fontSize: 16,
    color: '#111827',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  ownSenderName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  otherSenderName: {
    color: '#059669',
    fontWeight: '600',
  },
  messagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  messagesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messagesLoadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  messagesScrollView: {
    maxHeight: 400,
    minHeight: 200,
  },
  messagesContent: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  noMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 200,
  },
  noMessagesText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  fixedChatInput: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    zIndex: 1000,
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 8,
  },
  chatInput: {
    flex: 1,
    padding: 8,
    fontSize: 16,
    color: '#111827',
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    backgroundColor: '#2563EB',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
}); 