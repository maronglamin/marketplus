import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import Constants from 'expo-constants';
import { getImageUrl } from '../config/env';

const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.0.199';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type SellerInterestDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerInterestDetail'>;

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

interface Interest {
  id: string;
  productId: string;
  customerId: string;
  quantity: number;
  totalAmount: number;
  currencyCode: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  notes: string;
  product: {
    id: string;
    title: string;
    image: string;
    price: number;
  };
  customer: {
    id: string;
    name: string;
    email: string;
  };
  messages: Message[];
}

export function SellerInterestDetail() {
  const navigation = useNavigation<SellerInterestDetailNavigationProp>();
  const route = useRoute();
  const { user, token } = useAuth();
  const { interestId } = route.params as { interestId: string };
  
  const [interest, setInterest] = useState<Interest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    console.log('SellerInterestDetail: Loading interest with ID:', interestId);
    console.log('SellerInterestDetail: Component mounted successfully');
    loadInterestDetails();
  }, [interestId]);

  const loadInterestDetails = async () => {
    try {
      console.log('SellerInterestDetail: Starting to load interest details for ID:', interestId);
      console.log('SellerInterestDetail: API call starting...');
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/api/products/interests/${interestId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      console.log('SellerInterestDetail: Successfully loaded interest:', response.data);
      setInterest(response.data);
    } catch (error: any) {
      console.error('Error loading interest details:', error);
      
      if (error.response?.status === 404) {
        setError('Interest not found. It may have been deleted or is no longer available.');
        Alert.alert(
          'Interest Not Found', 
          'This interest may have been deleted or is no longer available. Please check your interest list.',
          [
            { text: 'Go Back', onPress: () => navigation.goBack() }
          ]
        );
      } else {
        setError('Failed to load interest details');
        Alert.alert('Error', 'Failed to load interest details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !interest) return;
    
    try {
      setSending(true);
      
      const response = await api.post(`/api/products/interests/${interestId}/messages`, {
        content: message.trim(),
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setMessage('');
      setInterest(prev => prev ? {
        ...prev,
        messages: prev.messages.some(msg => msg.id === response.data.id) 
          ? prev.messages 
          : [...prev.messages, response.data]
      } : null);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const updateInterestStatus = async (newStatus: string) => {
    try {
      // Convert to uppercase to match Prisma enum
      const statusToSend = newStatus.toUpperCase();
      
      await api.patch(`/api/products/interests/${interestId}/status`, {
        status: statusToSend,
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setInterest(prev => prev ? { ...prev, status: statusToSend } : null);
      
      const statusMessages = {
        'confirmed': 'Interest confirmed successfully!',
        'rejected': 'Interest rejected successfully!',
        'cancelled': 'Interest cancelled successfully!',
        'accepted': 'Interest accepted successfully!'
      };
      
      Alert.alert('Success', statusMessages[newStatus.toLowerCase() as keyof typeof statusMessages] || `Interest status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating interest status:', error);
      Alert.alert('Error', 'Failed to update interest status. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#10B981';
      case 'accepted': return '#059669';
      case 'rejected': return '#EF4444';
      case 'expired': return '#6B7280';
      case 'cancelled': return '#DC2626';
      default: return '#6B7280';
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvailableStatuses = (currentStatus: string) => {
    const statusFlow = {
      'pending': ['confirmed', 'rejected', 'cancelled'],
      'confirmed': ['accepted', 'rejected', 'cancelled'],
      'accepted': [],
      'rejected': [],
      'expired': [],
      'cancelled': [],
    };
    
    return statusFlow[currentStatus.toLowerCase() as keyof typeof statusFlow] || [];
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Interest Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading interest details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !interest) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Interest Details</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Interest not found'}</Text>
          <Text style={styles.errorSubtext}>
            The interest you're looking for may have been deleted or is no longer available.
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity onPress={loadInterestDetails} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backToInterestsButton}>
              <Text style={styles.backToInterestsButtonText}>Back to Interests</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const availableStatuses = getAvailableStatuses(interest.status);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interest Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.statusSection}>
            <View style={styles.statusHeader}>
              <Text style={styles.sectionTitle}>Interest Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(interest.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(interest.status) }]}>
                  {interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
                </Text>
              </View>
            </View>
            
            {availableStatuses.length > 0 && (
              <View style={styles.statusActions}>
                <Text style={styles.statusActionsTitle}>Update Status:</Text>
                <View style={styles.statusButtons}>
                  {availableStatuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusButton,
                        status === 'confirmed' && styles.confirmButton,
                        status === 'rejected' && styles.rejectButton,
                        status === 'cancelled' && styles.cancelButton,
                      ]}
                      onPress={() => updateInterestStatus(status)}
                    >
                      <Text style={[
                        styles.statusButtonText,
                        status === 'confirmed' && styles.confirmButtonText,
                        status === 'rejected' && styles.rejectButtonText,
                        status === 'cancelled' && styles.cancelButtonText,
                      ]}>
                        {status === 'confirmed' ? 'Confirm' : 
                         status === 'rejected' ? 'Reject' : 
                         status === 'cancelled' ? 'Cancel' : 
                         status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{interest.customer.name}</Text>
              <Text style={styles.customerEmail}>{interest.customer.email}</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Information</Text>
            <View style={styles.productInfo}>
              <Image
                source={{ 
                  uri: interest.product.image 
                    ? getImageUrl(interest.product.image)
                    : 'https://via.placeholder.com/80x80?text=No+Image'
                }}
                style={styles.productImage}
                resizeMode="cover"
              />
              <View style={styles.productDetails}>
                <Text style={styles.productName}>{interest.product.title}</Text>
                <Text style={styles.productPrice}>
                  {formatPrice(interest.product.price, interest.currencyCode)}
                </Text>
                <Text style={styles.quantity}>
                  Quantity: {interest.quantity}
                </Text>
                <Text style={styles.totalAmount}>
                  Total: {formatPrice(interest.totalAmount, interest.currencyCode)}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Conversation</Text>
            {interest.messages.length === 0 ? (
              <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
            ) : (
              <View style={styles.messagesContainer}>
                {interest.messages.map((msg) => {
                  const isOwnMessage = msg.senderId === user?.id;
                  return (
                    <View key={msg.id} style={[
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
                          {msg.content}
                        </Text>
                      </View>
                      
                      <View style={styles.messageMeta}>
                        <Text style={[
                          styles.senderName,
                          isOwnMessage ? styles.ownSenderName : styles.otherSenderName
                        ]}>
                          {isOwnMessage ? 'You' : msg.senderName}
                        </Text>
                        <Text style={styles.messageTime}>{formatDate(msg.createdAt)}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.messageInput}
            placeholder="Type your message..."
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!message.trim() || sending}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={message.trim() ? '#FFFFFF' : '#9CA3AF'} 
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorActions: {
    marginTop: 24,
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backToInterestsButton: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  backToInterestsButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusActions: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  statusActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    color: '#FFFFFF',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  rejectButtonText: {
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#6B7280',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
  customerInfo: {
    gap: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  productInfo: {
    flexDirection: 'row',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#059669',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  noMessages: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 16,
    fontStyle: 'italic',
  },
  messagesContainer: {
    gap: 12,
  },
  messageContainer: {
    marginBottom: 12,
    width: '100%',
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
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
  messageText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  messageMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: 4,
    maxWidth: '80%',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  ownSenderName: {
    color: '#2563EB',
    fontWeight: '700',
  },
  otherSenderName: {
    color: '#059669',
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#2563EB',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
});
