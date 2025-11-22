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
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken } from '../api/auth';
import AddPriceModal from '../components/AddPriceModal';
import UpdatePriceModal from '../components/UpdatePriceModal';

type AssetRentalNavigationProp = NativeStackNavigationProp<AppStackParamList, 'AssetRental'>;

interface RentalRequest {
  id: string;
  requestId: string;
  status: string;
  pickupAddress: string;
  startDate: string;
  endDate: string;
  days: number;
  proposedPrice?: number;
  agreedPrice?: number;
  currency: string;
  currencySymbol: string;
  notes?: string;
  createdAt: string;
  rideService: {
    id: string;
    name: string;
    description?: string;
    currency: string;
    currencySymbol: string;
  };
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderType: 'CUSTOMER' | 'DRIVER';
  senderName: string;
  createdAt: string;
  isRead: boolean;
}

export default function AssetRentalScreen() {
  const navigation = useNavigation<AssetRentalNavigationProp>();
  const { user, isLoading: authLoading, refreshUser, validateAndRefreshUser } = useAuth();
  
  const [rentals, setRentals] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRental, setSelectedRental] = useState<RentalRequest | null>(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [isDriver, setIsDriver] = useState<boolean | null>(null);
  const [showAddPriceModal, setShowAddPriceModal] = useState(false);
  const [showUpdatePriceModal, setShowUpdatePriceModal] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Validate and refresh user data when component mounts
  useEffect(() => {
    const validateUser = async () => {
      if (!authLoading) {
        console.log('AssetRental: Component mounted, validating user data...');
        await validateAndRefreshUser();
      }
    };
    validateUser();
  }, [authLoading, validateAndRefreshUser]);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshOnFocus = async () => {
        if (!authLoading && user?.id) {
          console.log('AssetRental: Screen focused, refreshing user data...');
          await validateAndRefreshUser();
        }
      };
      refreshOnFocus();
    }, [authLoading, user?.id, validateAndRefreshUser])
  );

  useEffect(() => {
    console.log('AssetRental: Auth state changed:', { 
      hasUser: !!user, 
      userId: user?.id,
      authLoading,
      userLoading 
    });
    
    // Wait for auth to finish loading
    if (!authLoading) {
      setUserLoading(false);
      
      if (user?.id) {
        console.log('AssetRental: User authenticated, loading driver rentals...');
        setAuthError(null);
        setError(null);
        setIsDriver(null); // Reset driver status
        setRentals([]); // Clear existing rentals
        loadDriverRentals();
      } else {
        console.log('AssetRental: No user authenticated');
        // User is not authenticated
        setAuthError('Please login to view your rental requests');
        setRentals([]);
        setIsDriver(null);
      }
    }
  }, [user, authLoading]); // Changed from user?.id to user to detect all user changes



  const loadDriverRentals = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthError(null);
      
      console.log('AssetRental: Loading driver rentals...');
      console.log('AssetRental: User:', user);
      console.log('AssetRental: User ID:', user?.id);
      
      if (!user?.id) {
        console.log('AssetRental: No user ID available, checking token...');
        const token = await getAuthToken();
        if (token) {
          console.log('AssetRental: Token exists but no user - attempting to refresh user data...');
          try {
            await refreshUser();
            // If refreshUser succeeds, the user state will be updated and useEffect will trigger loadDriverRentals again
            return;
          } catch (error) {
            console.log('AssetRental: Failed to refresh user data, token may be invalid');
            setAuthError('Authentication expired. Please login again.');
          }
        } else {
          setAuthError('Please login to view your rental requests');
        }
        setRentals([]);
        return;
      }
      
      // Get rentals where the current driver is the asset owner
      const token = await getAuthToken();
      console.log('AssetRental: Token available:', !!token);
      
      if (!token) {
        setAuthError('Please login to view your rental requests');
        setRentals([]);
        return;
      }
      
      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/rentals/driver/me`;
      console.log('AssetRental: API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      console.log('AssetRental: Response status:', response.status);
      
      if (response.status === 401) {
        console.log('AssetRental: Token is invalid (401) - attempting to refresh user data...');
        try {
          await refreshUser();
          // If refreshUser succeeds, retry the API call
          const retryResponse = await fetch(apiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (retryResponse.ok) {
            const data = await retryResponse.json();
            console.log('AssetRental: Retry successful, rentals count:', data.data?.length || 0);
            setIsDriver(true);
            setRentals(data.data || []);
            return;
          } else {
            console.log('AssetRental: Retry failed, token is truly invalid');
            setAuthError('Authentication expired. Please login again.');
            setRentals([]);
            return;
          }
        } catch (error) {
          console.log('AssetRental: Failed to refresh user data after 401');
          setAuthError('Authentication expired. Please login again.');
          setRentals([]);
          return;
        }
      } else if (response.status === 404) {
        // User is not a driver
        console.log('AssetRental: User is not a driver (404 - Driver profile not found)');
        setIsDriver(false);
        setRentals([]);
        return;
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error('AssetRental: Response error:', errorText);
        throw new Error(`Failed to fetch rentals: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('AssetRental: Response data:', data);
      console.log('AssetRental: Rentals count:', data.data?.length || 0);
      setIsDriver(true);
      setRentals(data.data || []);
    } catch (e: any) {
      console.error('AssetRental: Failed to load driver rentals', e);
      if (e.message?.includes('401') || e.message?.includes('Unauthorized')) {
        console.log('AssetRental: Unauthorized error - attempting to refresh user data...');
        try {
          await refreshUser();
          // If refreshUser succeeds, retry the load
          loadDriverRentals();
          return;
        } catch (refreshError) {
          console.log('AssetRental: Failed to refresh user data after unauthorized error');
          setAuthError('Authentication expired. Please login again.');
        }
      } else {
        setError('Failed to load rentals. Please try again.');
      }
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChat = async (rental: RentalRequest) => {
    setSelectedRental(rental);
    setShowChatModal(true);
    
    // Mark messages as read when chat is opened
    try {
      const token = await getAuthToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rental-messages/${rental.id}/messages/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        console.log('AssetRental: Messages marked as read');
        // Reload rentals to update unread counts
        loadDriverRentals();
      }
    } catch (error) {
      console.error('AssetRental: Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedRental) return;
    
    try {
      setSending(true);
      console.log('AssetRental: Sending message:', message.trim());
      console.log('AssetRental: Rental ID:', selectedRental.id);
      
      const token = await getAuthToken();
      console.log('AssetRental: Token available:', !!token);
      
      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/rental-messages/${selectedRental.id}/messages`;
      console.log('AssetRental: API URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: message.trim() }),
      });
      
      console.log('AssetRental: Send message response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AssetRental: Send message error response:', errorText);
        throw new Error(`Failed to send message: ${response.status}`);
      }
      
      const sentMessage = await response.json();
      console.log('AssetRental: Sent message response:', sentMessage);
      
      setMessage('');
      
      // Update the selected rental with the new message
      setSelectedRental(prev => prev ? {
        ...prev,
        messages: [...prev.messages, sentMessage.data]
      } : null);
      
      // Update the rentals list
      setRentals(prev => prev.map(rental => 
        rental.id === selectedRental.id 
          ? { ...rental, messages: [...rental.messages, sentMessage.data] }
          : rental
      ));
    } catch (error: any) {
      console.error('AssetRental: Error sending message:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRental = async (rental: RentalRequest) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/${rental.id}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          agreedPrice: rental.proposedPrice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept rental');
      }

      Alert.alert('Success', 'Rental request accepted successfully!');
      setShowChatModal(false);
      loadDriverRentals(); // Reload the list
    } catch (error) {
      console.error('Error accepting rental:', error);
      Alert.alert('Error', 'Failed to accept rental. Please try again.');
    }
  };

  const handleRejectRental = async (rental: RentalRequest) => {
    if (!rental?.id) {
      console.log('AssetRental: Cannot reject rental - missing rental ID');
      return;
    }
    
    try {
      const token = await getAuthToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/${rental.id}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to reject rental');
      }

      Alert.alert('Success', 'Rental request rejected.');
      setShowChatModal(false);
      loadDriverRentals(); // Reload the list
    } catch (error) {
      console.error('Error rejecting rental:', error);
      Alert.alert('Error', 'Failed to reject rental. Please try again.');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING_QUOTE':
        return 'time-outline';
      case 'QUOTED':
        return 'pricetag-outline';
      case 'ACCEPTED':
        return 'checkmark-circle-outline';
      case 'REJECTED':
        return 'close-circle-outline';
      case 'CANCELLED':
        return 'close-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUnreadCount = (rental: RentalRequest) => {
    return rental.messages.filter(msg => 
      msg.senderType === 'CUSTOMER' && !msg.isRead
    ).length;
  };

  if (authLoading || userLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Rentals</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Rentals</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your rentals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Rentals</Text>
        <TouchableOpacity onPress={loadDriverRentals} style={styles.refreshButton}>
          <Ionicons name="refresh" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {authError || error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{authError || error}</Text>
          {!authError && (
                      <TouchableOpacity onPress={async () => {
            try {
              await refreshUser();
              loadDriverRentals();
            } catch (error) {
              console.log('AssetRental: Manual refresh failed');
            }
          }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Refresh User & Retry</Text>
          </TouchableOpacity>
          )}

        </View>
      ) : isDriver === false ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Driver Profile Required</Text>
          <Text style={styles.emptyText}>
            You need to be a registered driver to view rental requests. Please complete your driver profile first.
          </Text>
          <TouchableOpacity onPress={async () => {
            try {
              await refreshUser();
              loadDriverRentals();
            } catch (error) {
              console.log('AssetRental: Manual refresh failed');
            }
          }} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Refresh User & Retry</Text>
          </TouchableOpacity>
        </View>
      ) : rentals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="car-outline" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Rental Requests</Text>
          <Text style={styles.emptyText}>
            You haven't received any rental requests yet. They will appear here when customers request your vehicle.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {rentals.map((rental) => {
                          const unreadCount = getUnreadCount(rental);
              return (
                <TouchableOpacity key={rental.id} style={styles.rentalCard} onPress={() => handleOpenChat(rental)}>
                <View style={styles.rentalHeader}>
                  <View style={styles.rentalInfo}>
                    <Text style={styles.rentalId}>#{rental.requestId}</Text>
                    <Text style={styles.rentalDate}>
                      {formatDateTime(rental.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(rental.status)}20` }]}>
                    <Ionicons name={getStatusIcon(rental.status)} size={16} color={getStatusColor(rental.status)} />
                    <Text style={[styles.statusText, { color: getStatusColor(rental.status) }]}>
                      {rental.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                <View style={styles.rentalDetails}>
                  <Text style={styles.serviceName}>{rental.rideService.name}</Text>
                  <Text style={styles.customerName}>
                    {rental.customer.firstName} {rental.customer.lastName}
                  </Text>
                  <Text style={styles.location}>{rental.pickupAddress}</Text>
                  <Text style={styles.dates}>
                    {formatDate(rental.startDate)} - {formatDate(rental.endDate)} ({rental.days} days)
                  </Text>
                  
                  {rental.proposedPrice && (
                    <Text style={styles.price}>
                      Proposed: {rental.currency || rental.rideService?.currency || 'USD'} {rental.proposedPrice.toLocaleString()}
                    </Text>
                  )}
                  {rental.agreedPrice && (
                    <Text style={styles.agreedPrice}>
                      Agreed: {rental.currency || rental.rideService?.currency || 'USD'} {rental.agreedPrice.toLocaleString()}
                    </Text>
                  )}
                </View>

                                                    <View style={styles.rentalActions}>
                    <View style={styles.chatButton}>
                      <Ionicons name="chatbubble-ellipses" size={20} color="#3B82F6" />
                      <Text style={styles.chatButtonText}>Chat</Text>
                      {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{unreadCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Chat Modal */}
      <KeyboardAvoidingView 
        style={[styles.chatModal, { display: showChatModal ? 'flex' : 'none' }]}
        enabled={showChatModal && Platform.OS === 'ios'}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <SafeAreaView style={styles.chatModalContent}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.chatTitle}>
              Chat with {selectedRental?.customer.firstName} {selectedRental?.customer.lastName}
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Action Buttons for PENDING_QUOTE status */}
          {selectedRental?.status === 'PENDING_QUOTE' && (
            <View style={styles.chatActionButtons}>
              <TouchableOpacity 
                style={styles.chatRejectButton}
                onPress={() => handleRejectRental(selectedRental)}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.chatRejectButtonText}>Reject</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.chatAddPriceButton}
                onPress={() => setShowAddPriceModal(true)}
              >
                <Ionicons name="pricetag" size={20} color="#FFFFFF" />
                <Text style={styles.chatAddPriceButtonText}>Add Price</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons for QUOTED status */}
          {selectedRental?.status === 'QUOTED' && (
            <View style={styles.chatActionButtons}>
              <TouchableOpacity 
                style={styles.chatRejectButton}
                onPress={() => handleRejectRental(selectedRental)}
              >
                <Ionicons name="close" size={20} color="#EF4444" />
                <Text style={styles.chatRejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons for ACCEPTED status */}
          {selectedRental?.status === 'ACCEPTED' && (
            <View style={styles.chatActionButtons}>
              <TouchableOpacity 
                style={styles.chatUpdatePriceButton}
                onPress={() => setShowUpdatePriceModal(true)}
              >
                <Ionicons name="pricetag" size={20} color="#FFFFFF" />
                <Text style={styles.chatUpdatePriceButtonText}>Update Agreed Price</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
            {selectedRental?.messages.length === 0 ? (
              <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
            ) : (
              selectedRental?.messages.map((msg) => {
                const isOwnMessage = msg.senderType === 'DRIVER';
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
                      <Text style={styles.messageTime}>{formatDateTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              placeholderTextColor="#6B7280"
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
         </SafeAreaView>
       </KeyboardAvoidingView>

      {/* Add Price Modal */}
      <AddPriceModal
        isVisible={showAddPriceModal}
        onClose={() => setShowAddPriceModal(false)}
        onSuccess={() => {
          loadDriverRentals(); // Reload the list after adding price
        }}
        rentalId={selectedRental?.id || ''}
        currencySymbol={selectedRental?.rideService?.currencySymbol || '$'}
        currency={selectedRental?.currency || selectedRental?.rideService?.currency || 'USD'}
      />

      {/* Update Price Modal */}
      <UpdatePriceModal
        isVisible={showUpdatePriceModal}
        onClose={() => setShowUpdatePriceModal(false)}
        onSuccess={() => {
          loadDriverRentals(); // Reload the list after updating price
        }}
        rentalId={selectedRental?.id || ''}
        currencySymbol={selectedRental?.rideService?.currencySymbol || '$'}
        currency={selectedRental?.currency || selectedRental?.rideService?.currency || 'USD'}
        currentAgreedPrice={selectedRental?.agreedPrice}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  refreshButton: {
    padding: 8,
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
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },

  rentalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rentalInfo: {
    flex: 1,
  },
  rentalId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  rentalDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  rentalDetails: {
    marginBottom: 16,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
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
    color: '#F59E0B',
  },
  agreedPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  rentalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  unreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 4,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  chatModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
  chatModalContent: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  noMessages: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 32,
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
    backgroundColor: '#3B82F6',
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
    color: '#3B82F6',
    fontWeight: '700',
  },
  otherSenderName: {
    color: '#10B981',
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
    color: '#1F2937',
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: '#3B82F6',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  chatActionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatRejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  chatRejectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 4,
  },
  chatAcceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  chatAcceptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  chatAddPriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  chatAddPriceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  chatUpdatePriceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  chatUpdatePriceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
});
