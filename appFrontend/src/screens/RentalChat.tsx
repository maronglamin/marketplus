import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { rentalApi } from '../services/rentalApi';

type RentalChatNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RentalChat'>;

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  createdAt: string;
}

export default function RentalChatScreen() {
  const navigation = useNavigation<RentalChatNavigationProp>();
  const route = useRoute();
  const { rentalId } = route.params as { rentalId: string };
  const { user } = useAuth();
  
  const [rental, setRental] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadRentalDetails();
  }, [rentalId]);

  const loadRentalDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('RentalChat: Loading rental details for ID:', rentalId);
      console.log('RentalChat: User:', user?.id);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
      // Load rental details and messages in parallel
      const [rentalData, messagesData] = await Promise.all([
        rentalApi.getRentalById(rentalId),
        rentalApi.getRentalMessages(rentalId)
      ]);
      
      console.log('RentalChat: Rental data loaded:', !!rentalData);
      console.log('RentalChat: Messages loaded:', messagesData?.length || 0);
      
      setRental(rentalData);
      setMessages(messagesData || []);
    } catch (e: any) {
      console.error('RentalChat: Failed to load rental details', e);
      setError(e.message || 'Failed to load rental details');
      Alert.alert('Error', e.message || 'Failed to load rental details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    try {
      setSending(true);
      
      console.log('RentalChat: Sending message:', message.trim());
      
      const sentMessage = await rentalApi.sendRentalMessage(rentalId, message.trim());
      
      console.log('RentalChat: Message sent successfully:', sentMessage?.id);
      
      setMessage('');
      setMessages(prev => [...prev, sentMessage]);
    } catch (error: any) {
      console.error('RentalChat: Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return '#F59E0B';
      case 'QUOTED':
        return '#3B82F6';
      case 'ACCEPTED':
        return '#10B981';
      case 'REJECTED':
        return '#EF4444';
      case 'CANCELLED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
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

  if (!user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rental Chat</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-outline" size={48} color="#9CA3AF" />
          <Text style={styles.loadingText}>Authentication Required</Text>
          <Text style={styles.errorText}>Please login to access rental chat</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rental Chat</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading rental details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rental Chat</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Rental not found'}</Text>
          <TouchableOpacity onPress={loadRentalDetails} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rental Chat</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Rental Info Header */}
          <View style={styles.rentalInfoSection}>
            <View style={styles.rentalHeader}>
              <Text style={styles.rentalId}>#{rental.requestId}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(rental.status)}20` }]}>
                <Text style={[styles.statusText, { color: getStatusColor(rental.status) }]}>
                  {rental.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
            
            <View style={styles.rentalDetails}>
              <Text style={styles.serviceName}>{rental.rideService?.name}</Text>
              <Text style={styles.location}>{rental.pickupAddress}</Text>
              <Text style={styles.dates}>
                {new Date(rental.startDate).toLocaleDateString()} - {new Date(rental.endDate).toLocaleDateString()} ({rental.days} days)
              </Text>
              {rental.agreedPrice && (
                <Text style={styles.price}>Price: {rental.currencySymbol}{Number(rental.agreedPrice).toLocaleString()}</Text>
              )}
            </View>

            <View style={styles.participants}>
              <View style={styles.participant}>
                <Ionicons name="person" size={16} color="#6B7280" />
                <Text style={styles.participantName}>
                  {rental.customer?.firstName} {rental.customer?.lastName}
                </Text>
              </View>
              <View style={styles.participant}>
                <Ionicons name="car" size={16} color="#6B7280" />
                <Text style={styles.participantName}>
                  {rental.driver?.user?.firstName} {rental.driver?.user?.lastName}
                </Text>
              </View>
            </View>
          </View>

          {/* Messages */}
          <View style={styles.messagesSection}>
            <Text style={styles.sectionTitle}>Conversation</Text>
            {messages.length === 0 ? (
              <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
            ) : (
              <View style={styles.messagesContainer}>
                {messages.map((msg) => {
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

        {/* Message Input */}
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  rentalInfoSection: {
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
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rentalId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
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
  rentalDetails: {
    marginBottom: 12,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  dates: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  participants: {
    flexDirection: 'row',
    gap: 16,
  },
  participant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantName: {
    fontSize: 14,
    color: '#6B7280',
  },
  messagesSection: {
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
