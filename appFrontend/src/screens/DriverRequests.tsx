import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
  Linking,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { RideHistoryService, type RideHistoryItem } from '../services/rideHistoryService';

type DriverRequestsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'DriverRequests'>;

const { width, height } = Dimensions.get('window');

export function DriverRequests() {
  const navigation = useNavigation<DriverRequestsNavigationProp>();
  const insets = useSafeAreaInsets();
  const [rides, setRides] = useState<RideHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRide, setSelectedRide] = useState<RideHistoryItem | null>(null);
  const [showRideDetail, setShowRideDetail] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [startingRide, setStartingRide] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const tokenInputRefs = useRef<Array<TextInput | null>>([]);

  const statusOptions = [
    { value: 'ALL', label: 'All Rides', color: '#3B82F6' },
    { value: 'ACCEPTED', label: 'Accepted', color: '#10B981' },
    { value: 'IN_PROGRESS', label: 'In Progress', color: '#F59E0B' },
    { value: 'COMPLETED', label: 'Completed', color: '#8B5CF6' },
    { value: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
  ];

  useEffect(() => {
    loadRideHistory();
  }, [selectedStatus, currentPage]);

  useEffect(() => {
    console.log('showTokenModal state changed to:', showTokenModal);
  }, [showTokenModal]);

  const loadRideHistory = async (page: number = 1) => {
    try {
      setLoading(true);
      const response = await RideHistoryService.getDriverRideHistory(
        page,
        20,
        selectedStatus === 'ALL' ? undefined : selectedStatus
      );
      
      if (page === 1) {
        setRides(response.rides);
      } else {
        setRides(prev => [...prev, ...response.rides]);
      }
      
      setCurrentPage(response.pagination.page);
      setTotalPages(response.pagination.totalPages);
      setTotalCount(response.pagination.totalCount);
    } catch (error) {
      console.error('Error loading ride history:', error);
      Alert.alert('Error', 'Failed to load ride history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setCurrentPage(1);
    loadRideHistory(1);
  };

  const handleStatusFilter = (status: string) => {
    setSelectedStatus(status);
    setCurrentPage(1);
  };

  const handleRidePress = (ride: RideHistoryItem) => {
    setSelectedRide(ride);
    setShowRideDetail(true);
  };



  const handleStartRide = async () => {
    if (!selectedRide || !tokenInput.trim()) {
      Alert.alert('Error', 'Please enter the token');
      return;
    }

    if (tokenInput.trim().length !== 6) {
      Alert.alert('Error', 'Please enter a complete 6-digit token');
      return;
    }

    // Check if ride is in correct state
    if (selectedRide.status !== 'ACCEPTED') {
      Alert.alert('Error', `Cannot start ride. Current status: ${selectedRide.status}`);
      return;
    }

    // Check if ride has token capability
    if (!selectedRide.hasToken) {
      Alert.alert('Error', 'This ride does not require a token to start.');
      return;
    }

    // Check if token is already used
    if (selectedRide.isTokenUsed) {
      Alert.alert('Error', 'Token has already been used for this ride.');
      return;
    }

    // Debug logging
    console.log('Starting ride with token:', {
      rideId: selectedRide.id,
      token: tokenInput.trim(),
      tokenLength: tokenInput.trim().length,
      tokenType: typeof tokenInput.trim(),
      rideStatus: selectedRide.status,
      hasToken: selectedRide.hasToken,
      isTokenUsed: selectedRide.isTokenUsed,
      retryCount
    });

    try {
      setStartingRide(true);
      await RideHistoryService.startRide(selectedRide.id, tokenInput.trim());
      
      // Success - reset retry count and proceed
      setRetryCount(0);
      
      // Close modals and clear input
      setShowTokenModal(false);
      setShowRideDetail(false);
      clearTokenInput();
      
      // Navigate to JourneyMapView
      navigation.navigate('JourneyMapView', {
        rideId: selectedRide.id,
        pickupLocation: selectedRide.pickupLocation,
        destinationLocation: selectedRide.destinationLocation,
        customerName: selectedRide.customerName,
        estimatedDuration: selectedRide.duration ? `${selectedRide.duration} min` : 'Unknown',
        estimatedDistance: selectedRide.distance ? `${selectedRide.distance.toFixed(1)} km` : 'Unknown',
        totalFare: selectedRide.totalFare,
        currencySymbol: selectedRide.currencySymbol,
      });
      
    } catch (error: any) {
      console.error('Error starting ride:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message
      });
      
      // Increment retry count
      const newRetryCount = retryCount + 1;
      setRetryCount(newRetryCount);
      
      // Set error state for visual feedback
      setTokenError(true);
      
      // Handle different error scenarios with retry logic
      let errorMessage = 'Failed to start ride. Please try again.';
      let showRegenerateOption = true;
      
      if (error?.response?.status === 400) {
        const responseData = error.response?.data;
        if (responseData?.message) {
          errorMessage = responseData.message;
        } else {
          errorMessage = 'Invalid or expired token. Please check with the customer.';
        }
        
        // After 2 failed attempts, suggest regenerating token
        if (newRetryCount >= 2) {
          errorMessage += '\n\nConsider asking the customer to refresh their app for a new token.';
        }
      } else if (error?.response?.status === 404) {
        errorMessage = 'Ride not found. It may have been cancelled or expired.';
        showRegenerateOption = false;
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to start this ride.';
        showRegenerateOption = false;
      } else if (error?.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
        showRegenerateOption = false;
      } else if (error?.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        showRegenerateOption = false;
      }
      
      const alertButtons = [
        { text: 'OK', style: 'default' as const },
        { 
          text: 'Try Again', 
          onPress: () => {
            // Clear the token input and focus on first input
            clearTokenInput();
            setTokenError(false);
            tokenInputRefs.current[0]?.focus();
          }
        }
      ];
      
      // Only show regenerate option if it makes sense
      if (showRegenerateOption) {
        alertButtons.push({
          text: 'Regenerate Token',
          onPress: () => {
            // Close token modal and try to regenerate
            setShowTokenModal(false);
            regenerateToken();
          }
        });
      }
      
      Alert.alert('Start Ride Failed', errorMessage, alertButtons);
    } finally {
      setStartingRide(false);
    }
  };

  const handleCallCustomer = (phoneNumber: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    }
  };

  const handleTokenInput = (text: string, index: number) => {
    // Clear error state when user starts typing
    if (tokenError) {
      setTokenError(false);
    }
    
    // Only allow single digit
    if (text.length > 1) return;
    
    // Update the token input string
    const newToken = tokenInput.split('');
    newToken[index] = text;
    const newTokenString = newToken.join('');
    setTokenInput(newTokenString);
    
    // Auto-focus next input if digit entered
    if (text && index < 5) {
      tokenInputRefs.current[index + 1]?.focus();
    }
  };

  const handleTokenKeyPress = (e: any, index: number) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === 'Backspace' && !tokenInput[index] && index > 0) {
      tokenInputRefs.current[index - 1]?.focus();
    }
  };

  const clearTokenInput = () => {
    setTokenInput('');
    setTokenError(false);
    tokenInputRefs.current[0]?.focus();
  };

  const regenerateToken = async () => {
    if (!selectedRide) return;
    
    try {
      console.log('Regenerating token for ride:', selectedRide.id);
      console.log('Ride details:', {
        id: selectedRide.id,
        status: selectedRide.status,
        hasToken: selectedRide.hasToken,
        isTokenUsed: selectedRide.isTokenUsed,
        tokenExpiresAt: selectedRide.tokenExpiresAt
      });
      
      const tokenResponse = await RideHistoryService.generateRideToken(selectedRide.id);
      console.log('Token regenerated successfully');
      
      Alert.alert(
        'Token Generated',
        'A new token has been generated and sent to the customer. Please ask the customer for the new token.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
      
      // Refresh the ride data to get updated token info
      try {
        const updatedRide = await RideHistoryService.getRideDetails(selectedRide.id);
        setSelectedRide(updatedRide);
      } catch (refreshError) {
        console.error('Error refreshing ride data:', refreshError);
      }
      
    } catch (error: any) {
      console.error('Error regenerating token:', error);
      console.error('Error details:', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
        url: error?.response?.config?.url
      });
      
      // Handle the error gracefully without relying on support
      if (error?.response?.status === 500) {
        Alert.alert(
          'Token Regeneration Unavailable',
          'The token regeneration service is temporarily unavailable. Please ask the customer for their current token or try starting the ride with the existing token.',
          [
            { 
              text: 'Try Current Token', 
              onPress: () => {
                setShowRideDetail(false);
                setShowTokenModal(true);
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        // For other errors, provide a simple fallback
        Alert.alert(
          'Unable to Generate Token',
          'Please ask the customer for their current token and try starting the ride.',
          [
            { 
              text: 'Enter Token', 
              onPress: () => {
                setShowRideDetail(false);
                setShowTokenModal(true);
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      }
    }
  };

  const handleCompleteRide = async () => {
    if (!selectedRide) return;

    try {
      const result = await RideHistoryService.completeRide(selectedRide.id);
      
      // Show completion details including fare updates
      let completionMessage = 'The ride has been completed and marked as finished.';
      if (result.fareUpdate) {
        completionMessage += `\n\nActual Distance: ${result.fareUpdate.actualDistance}\nActual Duration: ${result.fareUpdate.actualDuration}\n\nFare Updated: ${result.fareUpdate.originalTotal} → ${result.fareUpdate.newTotal}`;
      }
      
      Alert.alert(
        'Ride Completed Successfully! 🎉',
        completionMessage,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRideDetail(false);
              // Refresh the ride list to show updated status
              onRefresh();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error completing ride:', error);
      
      let errorMessage = 'Failed to complete ride. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = 'Cannot complete ride. Please ensure the ride is in progress.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Ride not found. It may have been cancelled or expired.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to complete this ride.';
      }
      
      Alert.alert('Complete Ride Failed', errorMessage);
    }
  };

  const handleCancelRide = async (reason?: string) => {
    if (!selectedRide) return;

    try {
      await RideHistoryService.cancelRide(selectedRide.id, reason);
      
      Alert.alert(
        'Ride Cancelled Successfully',
        'The ride has been cancelled and the customer has been notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowRideDetail(false);
              // Refresh the ride list to show updated status
              onRefresh();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Error cancelling ride:', error);
      
      let errorMessage = 'Failed to cancel ride. Please try again.';
      
      if (error?.response?.status === 400) {
        errorMessage = 'Cannot cancel ride. Please ensure the ride is not already completed.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Ride not found. It may have been cancelled or expired.';
      } else if (error?.response?.status === 403) {
        errorMessage = 'You are not authorized to cancel this ride.';
      }
      
      Alert.alert('Cancel Ride Failed', errorMessage);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return '#10B981';
      case 'IN_PROGRESS':
        return '#F59E0B';
      case 'COMPLETED':
        return '#8B5CF6';
      case 'CANCELLED':
        return '#EF4444';
      case 'EXPIRED':
        return '#6B7280';
      default:
        return '#3B82F6';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'checkmark-circle';
      case 'IN_PROGRESS':
        return 'car';
      case 'COMPLETED':
        return 'checkmark-done-circle';
      case 'CANCELLED':
        return 'close-circle';
      case 'EXPIRED':
        return 'time';
      default:
        return 'time-outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTokenExpiry = (expiryString: string) => {
    const expiry = new Date(expiryString);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins <= 0) return 'Expired';
    if (diffMins < 60) return `${diffMins}m remaining`;
    
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    return `${diffHours}h ${remainingMins}m remaining`;
  };

  const renderRideCard = (ride: RideHistoryItem) => (
    <TouchableOpacity
      key={ride.id}
      style={styles.rideCard}
      onPress={() => handleRidePress(ride)}
      activeOpacity={0.7}
    >
      <View style={styles.rideCardHeader}>
        <View style={styles.rideCardLeft}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person" size={20} color="#3B82F6" />
          </View>
          <View style={styles.rideCardInfo}>
            <Text style={styles.customerName}>{ride.customerName}</Text>
            <Text style={styles.rideId}>#{ride.rideId}</Text>
          </View>
        </View>
        <View style={styles.rideCardRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(ride.status) + '20' }]}>
            <Ionicons 
              name={getStatusIcon(ride.status) as any} 
              size={12} 
              color={getStatusColor(ride.status)} 
            />
            <Text style={[styles.statusText, { color: getStatusColor(ride.status) }]}>
              {ride.status.replace('_', ' ')}
            </Text>
          </View>
          <Text style={styles.earningsText}>
            {ride.currencySymbol}{ride.driverEarnings.toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.rideCardBody}>
        <View style={styles.locationItem}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={14} color="#3B82F6" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.pickupLocation.address}
          </Text>
        </View>
        
        <View style={styles.locationDivider} />
        
        <View style={styles.locationItem}>
          <View style={styles.locationIcon}>
            <Ionicons name="flag" size={14} color="#EF4444" />
          </View>
          <Text style={styles.locationText} numberOfLines={1}>
            {ride.destinationLocation.address}
          </Text>
        </View>
      </View>

      <View style={styles.rideCardFooter}>
        <View style={styles.rideCardMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#64748B" />
            <Text style={styles.metaText}>{formatDate(ride.createdAt)}</Text>
          </View>
          {ride.distance && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#64748B" />
              <Text style={styles.metaText}>{ride.distance.toFixed(1)} km</Text>
            </View>
          )}
        </View>
        
        {ride.hasToken && (
          <View style={styles.tokenIndicator}>
            <Ionicons name="key" size={12} color="#F59E0B" />
            <Text style={styles.tokenText}>
              {ride.isTokenUsed ? 'Used' : 'Active'}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.contentSafeArea} edges={['bottom']}>
        <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" translucent />
      
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: Platform.OS === 'ios' ? insets.top + 8 : ((StatusBar.currentHeight || 0) + 8) }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ride History</Text>
          <Text style={styles.headerSubtitle}>
            {totalCount} total rides • {rides.filter(r => r.status === 'COMPLETED').length} completed
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {statusOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.filterButton,
                selectedStatus === option.value && styles.filterButtonActive
              ]}
              onPress={() => handleStatusFilter(option.value)}
            >
              <Text style={[
                styles.filterButtonText,
                selectedStatus === option.value && styles.filterButtonTextActive
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Rides List */}
      <ScrollView
        style={styles.ridesList}
        contentContainerStyle={styles.ridesListContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {loading && rides.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading ride history...</Text>
          </View>
        ) : rides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="car-outline" size={64} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No rides found</Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatus === 'ALL' 
                ? 'You haven\'t completed any rides yet'
                : `No ${selectedStatus.toLowerCase().replace('_', ' ')} rides found`
              }
            </Text>
          </View>
        ) : (
          <>
            {rides.map(renderRideCard)}
            
            {currentPage < totalPages && (
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => loadRideHistory(currentPage + 1)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Ride Detail Modal */}
      <Modal
        visible={showRideDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRideDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedRide && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Ride Details</Text>
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setShowRideDetail(false)}
                  >
                    <Ionicons name="close" size={24} color="#1E3A8A" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Customer Info */}
                  <View style={styles.customerSection}>
                    <View style={styles.customerHeader}>
                      <View style={styles.customerAvatarLarge}>
                        <Ionicons name="person" size={24} color="#3B82F6" />
                      </View>
                      <View style={styles.customerInfo}>
                        <Text style={styles.customerNameLarge}>{selectedRide.customerName}</Text>
                        <Text style={styles.rideIdLarge}>#{selectedRide.rideId}</Text>
                        <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedRide.status) + '20' }]}>
                          <Ionicons 
                            name={getStatusIcon(selectedRide.status) as any} 
                            size={14} 
                            color={getStatusColor(selectedRide.status)} 
                          />
                          <Text style={[styles.statusTextLarge, { color: getStatusColor(selectedRide.status) }]}>
                            {selectedRide.status.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>

                                         {/* Action Buttons based on ride status */}
                     {selectedRide.status === 'ACCEPTED' && (
                       <View style={styles.actionButtonsContainer}>
                         <TouchableOpacity
                           style={styles.cancelRideButton}
                           onPress={() => {
                             Alert.alert(
                               'Cancel Ride',
                               'Are you sure you want to cancel this ride?',
                               [
                                 { text: 'No', style: 'cancel' },
                                 { 
                                   text: 'Yes, Cancel', 
                                   style: 'destructive',
                                   onPress: () => {
                                     handleCancelRide();
                                   }
                                 }
                               ]
                             );
                           }}
                         >
                           <Ionicons name="close" size={16} color="#EF4444" />
                           <Text style={styles.cancelRideButtonText}>Cancel Ride</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity
                           style={styles.startRideButton}
                           onPress={() => {
                             console.log('Start button pressed, setting showTokenModal to true');
                             try {
                               // Close the ride detail modal first
                               setShowRideDetail(false);
                               // Then open the token modal
                               setShowTokenModal(true);
                               console.log('showTokenModal set to true successfully');
                             } catch (error) {
                               console.error('Error setting showTokenModal:', error);
                             }
                           }}
                           activeOpacity={0.7}
                         >
                           <Ionicons name="play" size={16} color="#FFFFFF" />
                           <Text style={styles.startRideButtonText}>Start Ride</Text>
                         </TouchableOpacity>
                       </View>
                     )}
                     
                     {selectedRide.status === 'IN_PROGRESS' && (
                       <View style={styles.actionButtonsContainer}>
                         <TouchableOpacity
                           style={styles.continueJourneyButton}
                           onPress={() => {
                             // Close the detail modal first
                             setShowRideDetail(false);
                             // Navigate to JourneyMapView to monitor progress
                             navigation.navigate('JourneyMapView', {
                               rideId: selectedRide.id,
                               pickupLocation: selectedRide.pickupLocation,
                               destinationLocation: selectedRide.destinationLocation,
                               customerName: selectedRide.customerName,
                               estimatedDuration: selectedRide.duration ? `${selectedRide.duration} min` : 'Unknown',
                               estimatedDistance: selectedRide.distance ? `${selectedRide.distance.toFixed(1)} km` : 'Unknown',
                               totalFare: selectedRide.totalFare,
                               currencySymbol: selectedRide.currencySymbol,
                             });
                           }}
                         >
                           <Ionicons name="map" size={16} color="#FFFFFF" />
                           <Text style={styles.continueJourneyButtonText}>Continue Journey</Text>
                         </TouchableOpacity>
                       </View>
                     )}
                     
                     {(selectedRide.status === 'COMPLETED' || selectedRide.status === 'CANCELLED') && (
                       <TouchableOpacity
                         style={styles.callButton}
                         onPress={() => handleCallCustomer(selectedRide.customerPhone)}
                       >
                         <Ionicons name="call" size={16} color="#FFFFFF" />
                         <Text style={styles.callButtonText}>Call Customer</Text>
                       </TouchableOpacity>
                     )}
                  </View>

                  {/* Route Info */}
                  <View style={styles.routeSection}>
                    <Text style={styles.sectionTitle}>Route</Text>
                    
                    <View style={styles.routeItem}>
                      <View style={styles.routeIcon}>
                        <Ionicons name="location" size={16} color="#3B82F6" />
                      </View>
                      <View style={styles.routeText}>
                        <Text style={styles.routeLabel}>Pickup</Text>
                        <Text style={styles.routeAddress}>{selectedRide.pickupLocation.address}</Text>
                      </View>
                    </View>

                    <View style={styles.routeLine} />

                    <View style={styles.routeItem}>
                      <View style={styles.routeIcon}>
                        <Ionicons name="flag" size={16} color="#EF4444" />
                      </View>
                      <View style={styles.routeText}>
                        <Text style={styles.routeLabel}>Destination</Text>
                        <Text style={styles.routeAddress}>{selectedRide.destinationLocation.address}</Text>
                      </View>
                      {selectedRide.status === 'ACCEPTED' && (
                        <TouchableOpacity
                          style={styles.cancelRideButtonSmall}
                          onPress={() => {
                            Alert.alert(
                              'Cancel Ride',
                              'Are you sure you want to cancel this ride?',
                              [
                                { text: 'No', style: 'cancel' },
                                { 
                                  text: 'Yes, Cancel', 
                                  style: 'destructive',
                                  onPress: () => {
                                    handleCancelRide();
                                  }
                                }
                              ]
                            );
                          }}
                        >
                          <Ionicons name="close" size={14} color="#EF4444" />
                          <Text style={styles.cancelRideButtonTextSmall}>Cancel</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Trip Details */}
                  <View style={styles.tripSection}>
                    <Text style={styles.sectionTitle}>Trip Details</Text>
                    
                    <View style={styles.tripGrid}>
                      <View style={styles.tripItem}>
                        <Text style={styles.tripLabel}>Earnings</Text>
                        <Text style={styles.tripValue}>
                          {selectedRide.currencySymbol}{selectedRide.driverEarnings.toFixed(2)}
                        </Text>
                      </View>
                      
                      <View style={styles.tripItem}>
                        <Text style={styles.tripLabel}>Total Fare</Text>
                        <Text style={styles.tripValue}>
                          {selectedRide.currencySymbol}{selectedRide.totalFare.toFixed(2)}
                        </Text>
                      </View>
                      
                      {selectedRide.distance && (
                        <View style={styles.tripItem}>
                          <Text style={styles.tripLabel}>Distance</Text>
                          <Text style={styles.tripValue}>{selectedRide.distance.toFixed(1)} km</Text>
                        </View>
                      )}
                      
                      {selectedRide.duration && (
                        <View style={styles.tripItem}>
                          <Text style={styles.tripLabel}>Duration</Text>
                          <Text style={styles.tripValue}>{selectedRide.duration} min</Text>
                        </View>
                      )}
                    </View>
                  </View>

                                     {/* Token Section - Only show if token exists and is used */}
                   {selectedRide.hasToken && selectedRide.isTokenUsed && (
                     <View style={styles.tokenSection}>
                       <Text style={styles.sectionTitle}>Ride Token</Text>
                       <View style={styles.tokenUsed}>
                         <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                         <Text style={styles.tokenUsedText}>Token used successfully</Text>
                       </View>
                     </View>
                   )}
                   
                   {/* Token Status Section - Show if token exists but not used */}
                   {selectedRide.hasToken && !selectedRide.isTokenUsed && (
                     <View style={styles.tokenSection}>
                       <Text style={styles.sectionTitle}>Token Status</Text>
                       <View style={styles.tokenStatus}>
                         <Ionicons name="key" size={20} color="#F59E0B" />
                         <Text style={styles.tokenStatusText}>Token available</Text>
                         {selectedRide.tokenExpiresAt && (
                           <Text style={styles.tokenExpiryText}>
                             Expires: {formatTokenExpiry(selectedRide.tokenExpiresAt)}
                           </Text>
                         )}
                       </View>
                     </View>
                   )}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Token Modal */}
      <Modal
        visible={showTokenModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTokenModal(false)}
        onShow={() => console.log('Token modal is now visible')}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.tokenModalOverlay}>
            <View style={styles.tokenModalContainer}>
              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.tokenModalHeader}>
                  <Ionicons name="key" size={32} color="#3B82F6" />
                  <Text style={styles.tokenModalTitle}>Enter Ride Token</Text>
                  <Text style={styles.tokenModalSubtitle}>
                    Ask the customer for the 6-digit token to start the ride
                  </Text>
                </View>
              </TouchableWithoutFeedback>

              <View style={styles.tokenInputSection}>
                <Text style={styles.tokenInputLabel}>Enter the 6-digit token from customer:</Text>
                <Text style={styles.tokenInputHelpText}>
                  If the token doesn't work, the customer may need to refresh their app or check for a new token.
                </Text>
                <View style={styles.tokenInputContainer}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        tokenInputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.tokenDigitInput,
                        tokenInput[index] && styles.tokenDigitInputFilled,
                        tokenError && styles.tokenDigitInputError
                      ]}
                      value={tokenInput[index] || ''}
                      onChangeText={(text) => handleTokenInput(text, index)}
                      onKeyPress={(e) => handleTokenKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      selectTextOnFocus={true}
                      textAlign="center"
                    />
                  ))}
                </View>
                {tokenError && (
                  <Text style={styles.tokenErrorText}>
                    Invalid token. Please check with the customer and try again.
                  </Text>
                )}
                <TouchableOpacity 
                  style={styles.clearTokenButton}
                  onPress={clearTokenInput}
                >
                  <Ionicons name="refresh" size={16} color="#64748B" />
                  <Text style={styles.clearTokenText}>Clear</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.getTokenForModalButton}
                  onPress={regenerateToken}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.getTokenForModalText}>Generate Token</Text>
                </TouchableOpacity>
              </View>

              <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.tokenModalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowTokenModal(false);
                      clearTokenInput();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.startRideButton}
                    onPress={handleStartRide}
                    disabled={startingRide || tokenInput.length !== 6}
                  >
                    {startingRide ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                    )}
                    <Text style={styles.startRideButtonText}>
                      {startingRide ? 'Starting...' : 'Start Ride'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </TouchableWithoutFeedback>
              </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A8A',
  },
  contentSafeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    backgroundColor: '#1E3A8A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#CBD5E1',
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  ridesList: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  ridesListContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rideCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rideCardInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  rideId: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rideCardRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  earningsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  rideCardBody: {
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  locationDivider: {
    width: 2,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginLeft: 11,
    marginBottom: 8,
  },
  rideCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rideCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 4,
  },
  tokenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tokenText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  loadMoreButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  customerSection: {
    marginBottom: 24,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  customerAvatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
  },
  rideIdLarge: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  statusTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelRideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  cancelRideButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
  },
  completeRideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  completeRideButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  continueJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    width: '100%',
  },
  continueJourneyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  cancelRideButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginLeft: 12,
  },
  cancelRideButtonTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 4,
  },
  routeSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeText: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  routeAddress: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E2E8F0',
    marginLeft: 15,
    marginBottom: 16,
  },
  tripSection: {
    marginBottom: 24,
  },
  tripGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  tripItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
  },
  tripLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  tripValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  tokenSection: {
    marginBottom: 24,
  },
  tokenDisplay: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  tokenLabel: {
    fontSize: 12,
    color: '#92400E',
    marginBottom: 8,
  },
  tokenCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 4,
    marginBottom: 4,
  },
  tokenExpiry: {
    fontSize: 12,
    color: '#92400E',
  },
  tokenUsed: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
  },
  tokenUsedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
  },
  generateTokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
  },
  generateTokenText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  actionSection: {
    marginTop: 16,
  },
  tokenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  tokenModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  tokenModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tokenModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
    marginBottom: 4,
  },
  tokenModalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },

  tokenCodeLarge: {
    fontSize: 32,
    fontWeight: '700',
    color: '#92400E',
    letterSpacing: 6,
    marginBottom: 8,
  },
  tokenExpiryLarge: {
    fontSize: 14,
    color: '#92400E',
  },
  tokenInputSection: {
    marginBottom: 24,
  },
  tokenInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  tokenInputHelpText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 12,
  },
  tokenInputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  tokenDigitInput: {
    width: 40,
    height: 48,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tokenDigitInputFilled: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.25,
    transform: [{ scale: 1.05 }],
  },
  tokenDigitInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
    shadowOpacity: 0.25,
    transform: [{ scale: 1.05 }],
  },
  clearTokenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 8,
  },
  clearTokenText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 6,
  },
  tokenModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  startRideButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  startRideButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tokenErrorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
  },
  getTokenButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
  },
  getTokenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  getTokenForModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  getTokenForModalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 8,
  },
  tokenStatus: {
    alignItems: 'center',
    marginTop: 12,
  },
  tokenStatusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  tokenExpiryText: {
    fontSize: 12,
    color: '#64748B',
  },
}); 