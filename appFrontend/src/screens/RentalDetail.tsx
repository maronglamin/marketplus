import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, StatusBar, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { rentalApi } from '../services/rentalApi';
import { ImageSlideshowModal } from '../components/ImageSlideshowModal';
import { getAuthToken } from '../api/auth';
 

// Currency symbol mapping
const getCurrencySymbol = (currencyCode?: string): string => {
  const currencySymbolMap: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: 'C$', AUD: 'A$', CHF: 'CHF',
    CNY: '¥', INR: '₹', BRL: 'R$', MXN: '$', KRW: '₩', SGD: 'S$', HKD: 'HK$', NZD: 'NZ$',
    GMD: 'D'
  };
  return currencySymbolMap[currencyCode || ''] || (currencyCode || '$');
};

type RentalDetailNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RentalDetail'>;

export default function RentalDetailScreen() {
  const navigation = useNavigation<RentalDetailNavigationProp>();
  const route = useRoute();
  const { rentalId } = route.params as { rentalId: string };
  
  const [isLoading, setIsLoading] = useState(true);
  const [rental, setRental] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [images, setImages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  

  useEffect(() => {
    loadRentalDetails();
  }, [rentalId]);

  const loadRentalDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await rentalApi.getRentalById(rentalId);
      console.log('Rental data loaded:', JSON.stringify(data, null, 2));
      
      // Debug: Log price information
      console.log('RentalDetail: Price debug info:', {
        proposedPrice: data?.proposedPrice,
        agreedPrice: data?.agreedPrice,
        currency: data?.currency,
        rideServiceCurrency: data?.rideService?.currency,
        rideServiceCurrencySymbol: data?.rideService?.currencySymbol,
        proposedPriceType: typeof data?.proposedPrice,
        agreedPriceType: typeof data?.agreedPrice
      });
      
      setRental(data);
      
      // Set images if available
      if (data?.driver?.riderApplication?.documents) {
        setImages(data.driver.riderApplication.documents);
      } else {
        setImages([]);
      }
      
      // Load unread count
      try {
        const token = await getAuthToken();
        const unreadResponse = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rental-messages/${rentalId}/messages/unread`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (unreadResponse.ok) {
          const unreadData = await unreadResponse.json();
          setUnreadCount(unreadData.data?.unreadCount || 0);
        }
      } catch (e) {
        console.error('Failed to load unread count:', e);
      }
    } catch (e) {
      console.error('Failed to load rental details', e);
      setError('Failed to load rental details');
      Alert.alert('Error', 'Failed to load rental details. Please try again.');
    } finally {
      setIsLoading(false);
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
        return 'time';
      case 'QUOTED':
        return 'pricetag';
      case 'ACCEPTED':
        return 'checkmark-circle';
      case 'REJECTED':
        return 'close-circle';
      case 'CANCELLED':
        return 'close';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewImages = () => {
    const docs = rental?.driver?.riderApplication?.documents || images;
    if (docs && docs.length > 0) {
      console.log('Opening image modal with documents:', docs);
      setShowImageModal(true);
    } else {
      Alert.alert('No Images', 'No asset images available for this rental.');
    }
  };

  const handleContactAssetOwner = () => {
    if (rental?.driver?.user?.phoneNumber) {
      Alert.alert(
        'Contact Asset Owner',
        `Call ${rental.driver.user.firstName} ${rental.driver.user.lastName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Call', 
            onPress: () => {
              const phoneNumber = rental.driver.user.phoneNumber;
              const phoneUrl = `tel:${phoneNumber}`;
              Linking.canOpenURL(phoneUrl)
                .then((supported) => {
                  if (supported) {
                    return Linking.openURL(phoneUrl);
                  } else {
                    Alert.alert('Error', 'Phone calls are not supported on this device');
                  }
                })
                .catch((err) => {
                  console.error('Error opening phone app:', err);
                  Alert.alert('Error', 'Unable to make phone call');
                });
            }
          }
        ]
      );
    } else {
      Alert.alert('No Phone Number', 'Phone number not available for this asset owner');
    }
  };

  const handleOpenChat = () => {
    // Mark messages as read when opening chat
    rentalApi.markRentalMessagesAsRead(rental.id).catch(console.error);
    navigation.navigate('RentalChat', { rentalId: rental.id });
  };

  const handleAcceptQuote = async () => {
    Alert.alert(
      'Accept Quote',
      'Are you sure you want to accept this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await getAuthToken();
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/${rental.id}/customer/accept`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to accept quote');
              }

              Alert.alert('Success', 'Quote accepted successfully!');
              loadRentalDetails(); // Reload the rental details
            } catch (error: any) {
              console.error('Error accepting quote:', error);
              Alert.alert('Error', error.message || 'Failed to accept quote. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleRejectQuote = async () => {
    Alert.alert(
      'Reject Quote',
      'Are you sure you want to reject this quote?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reject', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const token = await getAuthToken();
              const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/rentals/${rental.id}/customer/reject`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to reject quote');
              }

              Alert.alert('Success', 'Quote rejected successfully!');
              loadRentalDetails(); // Reload the rental details
            } catch (error: any) {
              console.error('Error rejecting quote:', error);
              Alert.alert('Error', error.message || 'Failed to reject quote. Please try again.');
            }
          }
        }
      ]
    );
  };

  // (Payment-related functions removed as part of cleanup)

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading rental details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !rental) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Unable to load rental details</Text>
          <Text style={styles.errorText}>{error || 'Rental not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRentalDetails}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
              <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={22} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title}>Rental Details</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleOpenChat} style={styles.headerIconBtn}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#374151" />
              {unreadCount > 0 && (
                <View style={styles.headerUnreadBadge}>
                  <Text style={styles.headerUnreadText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={loadRentalDetails} style={styles.headerIconBtn}>
              <Ionicons name="refresh" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

              <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusInfo}>
                <Text style={styles.requestId}>#{rental.requestId}</Text>
                <Text style={styles.createdDate}>Created {formatDateTime(rental.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(rental.status)}15` }]}>
                <Ionicons name={getStatusIcon(rental.status) as any} size={16} color={getStatusColor(rental.status)} />
                <Text style={[styles.statusText, { color: getStatusColor(rental.status) }]}>
                  {rental.status.replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Service Details</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Ionicons name="car" size={20} color="#3B82F6" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Service</Text>
                  <Text style={styles.cardValue}>{rental.rideService?.name}</Text>
                </View>
              </View>
              {rental.rideService?.description && (
                <View style={styles.cardRow}>
                  <Ionicons name="information-circle" size={20} color="#6B7280" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Description</Text>
                    <Text style={styles.cardValue}>{rental.rideService.description}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Location Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location Details</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Ionicons name="location" size={20} color="#EF4444" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Pickup Location</Text>
                  <Text style={styles.cardValue}>{rental.pickupAddress}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Date & Duration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Period</Text>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Ionicons name="calendar" size={20} color="#10B981" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Start Date</Text>
                  <Text style={styles.cardValue}>{formatDate(rental.startDate)}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="calendar" size={20} color="#F59E0B" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>End Date</Text>
                  <Text style={styles.cardValue}>{formatDate(rental.endDate)}</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="time" size={20} color="#8B5CF6" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Duration</Text>
                  <Text style={styles.cardValue}>{rental.days} day{rental.days !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Pricing Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            <View style={styles.card}>
              {rental.proposedPrice && (
                <View style={styles.cardRow}>
                  <Ionicons name="pricetag" size={20} color="#3B82F6" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Proposed Price</Text>
                    <Text style={styles.cardValue}>
                      {getCurrencySymbol(rental.currency)}{rental.proposedPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              {rental.agreedPrice && (
                <View style={styles.cardRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Agreed Price</Text>
                    <Text style={[styles.cardValue, styles.agreedPrice]}>
                      {getCurrencySymbol(rental.currency)}{rental.agreedPrice.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.cardRow}>
                <Ionicons name="cash" size={20} color="#6B7280" />
                <View style={styles.cardContent}>
                  <Text style={styles.cardLabel}>Currency</Text>
                  <Text style={styles.cardValue}>
                    {rental.currency} ({getCurrencySymbol(rental.currency)})
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Asset Owner Details */}
          {rental.driver?.user && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Asset Owner</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="person" size={20} color="#3B82F6" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Name</Text>
                    <Text style={styles.cardValue}>
                      {rental.driver.user.firstName} {rental.driver.user.lastName}
                    </Text>
                  </View>
                </View>
                {rental.driver.user.phoneNumber && (
                  <View style={styles.cardRow}>
                    <Ionicons name="call" size={20} color="#10B981" />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardLabel}>Phone</Text>
                      <Text style={styles.cardValue}>{rental.driver.user.phoneNumber}</Text>
                    </View>
                  </View>
                )}
                {rental.driver.riderApplication && (
                  <>
                    <View style={styles.cardRow}>
                      <Ionicons name="car-sport" size={20} color="#8B5CF6" />
                      <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>Vehicle Model</Text>
                        <Text style={styles.cardValue}>{rental.driver.riderApplication.vehicleModel}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRow}>
                      <Ionicons name="card" size={20} color="#F59E0B" />
                      <View style={styles.cardContent}>
                        <Text style={styles.cardLabel}>Vehicle Plate</Text>
                        <Text style={styles.cardValue}>{rental.driver.riderApplication.vehiclePlate}</Text>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* Asset Images */}
          {(rental.driver?.riderApplication?.documents?.length || images.length) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Asset Images</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="images" size={20} color="#8B5CF6" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Available Images</Text>
                    <Text style={styles.cardValue}>
                      {(rental.driver?.riderApplication?.documents?.length || images.length)} images
                    </Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.viewImagesButton} onPress={handleViewImages}>
                  <Ionicons name="eye" size={16} color="#3B82F6" />
                  <Text style={styles.viewImagesButtonText}>View Asset Images</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Customer Details */}
          {rental.customer && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Details</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="person" size={20} color="#8B5CF6" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardLabel}>Name</Text>
                    <Text style={styles.cardValue}>
                      {rental.customer.firstName} {rental.customer.lastName}
                    </Text>
                  </View>
                </View>
                {rental.customer.phoneNumber && (
                  <View style={styles.cardRow}>
                    <Ionicons name="call" size={20} color="#F59E0B" />
                    <View style={styles.cardContent}>
                      <Text style={styles.cardLabel}>Phone</Text>
                      <Text style={styles.cardValue}>{rental.customer.phoneNumber}</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          {rental.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  <Ionicons name="chatbubble" size={20} color="#6B7280" />
                  <View style={styles.cardContent}>
                    <Text style={styles.cardValue}>{rental.notes}</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionSection}>
            {/* Chat Button - Always visible */}
            <TouchableOpacity style={[styles.actionButton, styles.chatButton]} onPress={handleOpenChat}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#FFFFFF" />
              <Text style={styles.chatButtonText}>Open Chat</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {rental.status === 'QUOTED' && (
              <>
                <TouchableOpacity style={[styles.actionButton, styles.acceptButton]} onPress={handleAcceptQuote}>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept Quote</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={handleRejectQuote}>
                  <Ionicons name="close" size={20} color="#FFFFFF" />
                  <Text style={styles.rejectButtonText}>Reject Quote</Text>
                </TouchableOpacity>
              </>
            )}
            {rental.status === 'ACCEPTED' && (
              <>
                <TouchableOpacity style={[styles.actionButton, styles.contactButton]} onPress={handleContactAssetOwner}>
                  <Ionicons name="call" size={20} color="#FFFFFF" />
                  <Text style={styles.contactButtonText}>Contact Asset Owner</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>

        {/* Image Slideshow Modal */}
        <ImageSlideshowModal
          visible={showImageModal}
          onClose={() => setShowImageModal(false)}
          images={rental?.driver?.riderApplication?.documents?.length ? rental.driver.riderApplication.documents : images}
          title="Asset Images"
        />
        
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerIconBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  content: { flex: 1, paddingHorizontal: 16, paddingVertical: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 16 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 32 },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, textAlign: 'center' },
  errorText: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  retryButton: { backgroundColor: '#3B82F6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, marginTop: 20 },
  retryButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  statusCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  statusInfo: { flex: 1 },
  requestId: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  createdDate: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  cardContent: { flex: 1, marginLeft: 12 },
  cardLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase', fontWeight: '500' },
  cardValue: { fontSize: 16, color: '#1F2937', lineHeight: 22 },
  agreedPrice: { color: '#10B981', fontWeight: '600' },
  viewImagesButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#EFF6FF', borderRadius: 8, marginTop: 8 },
  viewImagesButtonText: { fontSize: 14, color: '#3B82F6', fontWeight: '600', marginLeft: 8 },
  actionSection: { marginTop: 24, marginBottom: 32 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, marginBottom: 12 },
  acceptButton: { backgroundColor: '#10B981' },
  acceptButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
  rejectButton: { backgroundColor: '#EF4444' },
  rejectButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
  contactButton: { backgroundColor: '#3B82F6' },
  contactButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
  chatButton: { backgroundColor: '#8B5CF6' },
  chatButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600', marginLeft: 8 },
  unreadBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerUnreadBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  headerUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
