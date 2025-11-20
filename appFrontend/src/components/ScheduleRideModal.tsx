import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Modal,
  InteractionManager,
} from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { rideService, type SuggestionItem } from '../services/rideService';
import { rentalService, RentalRideService, RentalDriver } from '../services/rentalService';
import * as Location from 'expo-location';
import RideServicesModal from './RideServicesModal';
import DriversModal from './DriversModal';
import { rentalApi } from '../services/rentalApi';
import { useAuth } from '../contexts/AuthContext';
import { getAuthToken } from '../api/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';

interface ScheduleRideModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSave: (scheduleData: ScheduleRideData) => void;
}

interface ScheduleRideData {
  pickupLocation: string;
  pickupType: 'current' | 'specific';
  startDate: Date;
  endDate: Date;
  pickupAddress: string;
}

interface ScheduleRideData {
  pickupLocation: string;
  pickupType: 'current' | 'specific';
  startDate: Date;
  endDate: Date;
  pickupAddress: string;
  selectedService?: RentalRideService;
  selectedDriver?: RentalDriver;
  user?: any; // Include authenticated user
}

// Helper function to get user ID from JWT token
const getUserIdFromToken = async (): Promise<string | null> => {
  try {
    const token = await getAuthToken();
    if (!token) return null;
    
    // Decode JWT token to get userId
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || null;
  } catch (error) {
    console.log('Error decoding JWT token:', error);
    return null;
  }
};

export default function ScheduleRideModal({ isVisible, onClose, onSave }: ScheduleRideModalProps) {

  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  // Form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [pickupType, setPickupType] = useState<'current' | 'specific'>('current');
  const [pickupAddress, setPickupAddress] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-complete suggestions
  const [locationSuggestions, setLocationSuggestions] = useState<SuggestionItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Rental data
  const [selectedService, setSelectedService] = useState<RentalRideService | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<RentalDriver | null>(null);
  const [showServicesModal, setShowServicesModal] = useState(false);
  const [showDriversModal, setShowDriversModal] = useState(false);
  const { user } = useAuth();



  // Auto-fill current location when current location is selected
  useEffect(() => {
    if (pickupType === 'current' && !pickupLocation) {
      handleGetCurrentLocation();
    }
  }, [pickupType]);

  // Clear location when switching to specific location
  useEffect(() => {
    if (pickupType === 'specific') {
      setPickupLocation('');
      setPickupAddress('');
    }
  }, [pickupType]);

  // Handle service selection
  const handleServiceSelect = (service: RentalRideService) => {
    setSelectedService(service);
    setSelectedDriver(null); // Reset driver when service changes
  };

  // Handle driver selection
  const handleDriverSelect = (driver: RentalDriver) => {
    setSelectedDriver(driver);
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek };
  };

  const generateCalendarDays = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);
    const days = [];
    
    // Add empty days for padding
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
    }
    
    return days;
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return date >= startDate && date <= endDate;
  };

  const isStartDate = (date: Date) => {
    return startDate && date.toDateString() === startDate.toDateString();
  };

  const isEndDate = (date: Date) => {
    return endDate && date.toDateString() === endDate.toDateString();
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isLocationValid = () => {
    return pickupLocation.trim() && 
           !pickupLocation.includes('Location unavailable') && 
           !pickupLocation.includes('Getting your exact location');
  };

  const isDateRangeValid = () => {
    return startDate && endDate && startDate < endDate;
  };

  const isServiceSelected = () => {
    return selectedService !== null;
  };

  const isDriverSelected = () => {
    return selectedDriver !== null;
  };

  const handleDatePress = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return; // Don't allow selection of past dates
    }

    if (!startDate || (startDate && endDate)) {
      // Start new selection
      setStartDate(date);
      setEndDate(null);
    } else {
      // Complete selection
      if (date >= startDate) {
        setEndDate(date);
      } else {
        setStartDate(date);
        setEndDate(null);
      }
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  const handleGetCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const address = await rideService.reverseGeocode(
        location.coords.latitude,
        location.coords.longitude
      );

      const locationInfo = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: address,
        fullAddress: address,
        cityName: address.split(',')[0] || 'Current Location',
        countryName: address.split(',').pop()?.trim() || 'Unknown',
        locationCode: generateLocationCode(location.coords.latitude, location.coords.longitude)
      };
      
      if (locationInfo) {
        const pickupAddress = locationInfo.fullAddress || `${locationInfo.cityName}, ${locationInfo.countryName}`;
        const locationDisplay = locationInfo.locationCode 
          ? `📍 ${pickupAddress} (${locationInfo.locationCode})`
          : `📍 ${pickupAddress}`;
        
        setPickupAddress(pickupAddress);
        setPickupLocation(locationDisplay);
      } else {
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const timezoneParts = timezone.split('/');
          if (timezoneParts.length > 1) {
            const city = timezoneParts[timezoneParts.length - 1].replace('_', ' ');
            const fallbackLocation = `📍 ${city} (estimated from timezone)`;
            setPickupAddress(fallbackLocation);
            setPickupLocation(fallbackLocation);
          } else {
            setPickupAddress('Location unavailable');
            setPickupLocation('📍 Location unavailable - please enter manually');
          }
        } catch (timezoneError) {
          setPickupAddress('Location unavailable');
          setPickupLocation('📍 Location unavailable - please enter manually');
        }
      }
    } catch (error) {
      setPickupAddress('Location unavailable');
      setPickupLocation('📍 Location unavailable - please enter manually');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSearch = async (text: string) => {
    setPickupLocation(text);
    
    if (!text.trim() || text.length < 3) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setShowSuggestions(true);
      
      const results = await rideService.searchPlaces(text);
      setLocationSuggestions(results);
      setShowSuggestions(results.length > 0);
      
    } catch (error) {
      setLocationSuggestions([]);
    }
  };

  const handleSelectSuggestion = async (suggestion: SuggestionItem) => {
    setPickupLocation(suggestion.description);
    setShowSuggestions(false);
    
    try {
      const placeDetails = await rideService.getPlaceDetails(suggestion.place_id);
      
      if (placeDetails) {
        setPickupAddress(placeDetails.address);
      } else {
        setPickupAddress(suggestion.description);
      }
    } catch (error) {
      setPickupAddress(suggestion.description);
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Validate pickup location
    if (!pickupLocation.trim()) {
      errors.push('Please enter a vehicle pickup location');
    } else if (pickupLocation.includes('Location unavailable') || pickupLocation.includes('Getting your exact location')) {
      errors.push('Please provide a valid pickup location');
    }

    // Validate start date
    if (!startDate) {
      errors.push('Please select a rental start date');
    }

    // Validate end date
    if (!endDate) {
      errors.push('Please select a rental end date');
    }

    // Validate date range
    if (startDate && endDate && startDate >= endDate) {
      errors.push('Rental end date must be after start date');
    }

    // Validate minimum rental period (at least 1 day)
    if (startDate && endDate) {
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < 1) {
        errors.push('Rental period must be at least 1 day');
      }
    }

    // Validate service selection
    if (!selectedService) {
      errors.push('Please select a rental service');
    }

    // Validate driver selection
    if (!selectedDriver) {
      errors.push('Please select a driver for your rental');
    }

    return errors;
  };

  const resetForm = () => {
    setPickupLocation('');
    setPickupType('current');
    setPickupAddress('');
    setStartDate(null);
    setEndDate(null);
    setCurrentMonth(new Date());
    setLocationSuggestions([]);
    setShowSuggestions(false);
    setSelectedService(null);
    setSelectedDriver(null);
  };

  const handleSave = async () => {
    const validationErrors = validateForm();
    
    if (validationErrors.length > 0) {
      Alert.alert(
        'Validation Error', 
        validationErrors.join('\n\n'),
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsLoading(true);
    try {
      const scheduleData: ScheduleRideData = {
        pickupLocation,
        pickupType,
        startDate: startDate!,
        endDate: endDate!,
        pickupAddress,
        selectedService: selectedService!,
        selectedDriver: selectedDriver!,
        user: user, // Include authenticated user in scheduleData
      };

      // Create rental on backend
      // Get user ID from JWT token to ensure consistency
      const tokenUserId = await getUserIdFromToken();
      if (!tokenUserId) {
        Alert.alert('Error', 'Unable to get user ID from token. Please log in again.');
        return;
      }
      
      // Use the user ID from the JWT token instead of user context
      const customerId = tokenUserId;
      
      // Validate that we have a valid UUID format
      if (!customerId || customerId === 'undefined' || customerId === 'null') {
        Alert.alert('Error', 'Invalid user ID. Please log in again.');
        return;
      }
      
      // Log the comparison for debugging
      console.log('JWT Token User ID:', tokenUserId);
      console.log('User Context ID:', user?.id);
      console.log('Using JWT Token ID for rental booking');
      
      const payload = {
        customerId: customerId,
        rideServiceId: selectedService!.id,
        driverId: selectedDriver!.id,
        riderApplicationId: selectedDriver?.riderApplication?.id,
        pickupAddress: pickupAddress || pickupLocation,
        pickupLatitude: undefined,
        pickupLongitude: undefined,
        startDate: startDate!.toISOString(),
        endDate: endDate!.toISOString(),
        notes: undefined,
      } as any;

      if (!payload.customerId) {
        throw new Error('Missing customerId');
      }

      console.log('=== RENTAL BOOKING DEBUG ===');
      console.log('Rental booking payload:', payload);
      console.log('Authenticated user:', user);
      console.log('CustomerId type:', typeof customerId, 'Value:', customerId);
      console.log('Expected JWT userId: ce077982-11e0-4f94-8d7a-b9cf9c8d600a');
      console.log('CustomerId matches JWT:', customerId === 'ce077982-11e0-4f94-8d7a-b9cf9c8d600a');
      console.log('============================');
      await rentalApi.createRental(payload);

      await onSave(scheduleData);
      Alert.alert('Success', 'Rental asset booked successfully, we will notify the asset owner.', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onClose();
            // Navigate to RentalRequest screen after successful booking
            console.log('Attempting to navigate to RentalRequest screen...');
            // Defer navigation until after all animations/interactions are complete
            requestAnimationFrame(() => {
              InteractionManager.runAfterInteractions(() => {
                setTimeout(() => {
                  navigation.reset({
                    index: 1,
                    routes: [{ name: 'Home' }, { name: 'RentalRequest' }],
                  });
                }, 50);
              });
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error booking rental:', error);
      Alert.alert('Error', 'Failed to book vehicle rental. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const generateLocationCode = (latitude: number, longitude: number): string => {
    try {
      const latStr = Math.abs(latitude).toString(36).substring(0, 4).toUpperCase();
      const lngStr = Math.abs(longitude).toString(36).substring(0, 4).toUpperCase();
      const locationCode = `${latStr}+${lngStr}`;
      return locationCode;
    } catch (error) {
      return 'LOC' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
  };



  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Rent a Vehicle</Text>
            <Text style={styles.headerSubtitle}>Book your vehicle rental</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Pickup Location Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Vehicle Pickup Location</Text>
              </View>
              
              {/* Location Type Selection */}
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[styles.radioButton, pickupType === 'current' && styles.radioButtonActive]}
                  onPress={() => setPickupType('current')}
                >
                  <View style={[styles.radioCircle, pickupType === 'current' && styles.radioCircleActive]}>
                    {pickupType === 'current' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioLabel, pickupType === 'current' && styles.radioLabelActive]}>
                      Current Location
                    </Text>
                    <Text style={styles.radioDescription}>Use your current GPS location</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.radioButton, pickupType === 'specific' && styles.radioButtonActive]}
                  onPress={() => setPickupType('specific')}
                >
                  <View style={[styles.radioCircle, pickupType === 'specific' && styles.radioCircleActive]}>
                    {pickupType === 'specific' && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.radioContent}>
                    <Text style={[styles.radioLabel, pickupType === 'specific' && styles.radioLabelActive]}>
                      Specific Location
                    </Text>
                    <Text style={styles.radioDescription}>Search for a specific address</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Location Input */}
              <View style={styles.locationInputContainer}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="search" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.locationInput}
                    placeholder={pickupType === 'current' ? 'Getting your exact location...' : 'Enter pickup location'}
                    value={pickupLocation}
                    onChangeText={handleLocationSearch}
                    editable={pickupType === 'specific'}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>
                {pickupType === 'current' && (
                  <TouchableOpacity
                    style={styles.getLocationButton}
                    onPress={handleGetCurrentLocation}
                    disabled={isLoadingLocation}
                  >
                    {isLoadingLocation ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Location Suggestions */}
              {showSuggestions && pickupType === 'specific' && (
                <View style={styles.suggestionsContainer}>
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled={true}
                    style={{ maxHeight: 200 }}
                  >
                    {locationSuggestions.map((suggestion, index) => (
                      <TouchableOpacity
                        key={suggestion.place_id || index}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestion(suggestion)}
                      >
                        <Ionicons name="location-outline" size={18} color="#3B82F6" />
                        <View style={styles.suggestionTextContainer}>
                          <Text style={styles.suggestionMainText}>
                            {suggestion.structured_formatting?.main_text || suggestion.description}
                          </Text>
                          {suggestion.structured_formatting?.secondary_text && (
                            <Text style={styles.suggestionSecondaryText}>
                              {suggestion.structured_formatting.secondary_text}
                            </Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Calendar Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Rental Period</Text>
              </View>
              
              {/* Calendar Header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-back" size={20} color="#6B7280" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthText}>
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.calendarNavButton}>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Calendar Grid */}
              <View style={styles.calendarGrid}>
                {/* Day headers */}
                <View style={styles.calendarDaysHeader}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.calendarDayHeader}>{day}</Text>
                  ))}
                </View>

                {/* Calendar days */}
                <View style={styles.calendarDays}>
                  {generateCalendarDays().map((date, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.calendarDay,
                        date && isDateInRange(date) && styles.calendarDayInRange,
                        date && isStartDate(date) && styles.calendarDayStart,
                        date && isEndDate(date) && styles.calendarDayEnd,
                        date && isPastDate(date) && styles.calendarDayPast,
                      ]}
                      onPress={() => date && handleDatePress(date)}
                      disabled={!date || (date && isPastDate(date))}
                    >
                      {date && (
                        <Text style={[
                          styles.calendarDayText,
                          isDateInRange(date) && styles.calendarDayTextInRange,
                          isStartDate(date) && styles.calendarDayTextSelected,
                          isEndDate(date) && styles.calendarDayTextSelected,
                          isPastDate(date) && styles.calendarDayTextPast,
                        ]}>
                          {date.getDate()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Selected Date Range Display */}
              <View style={styles.dateRangeDisplay}>
                <View style={styles.dateRangeItem}>
                  <View style={styles.dateRangeIcon}>
                    <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.dateRangeContent}>
                    <Text style={styles.dateRangeLabel}>Start Date</Text>
                    <Text style={styles.dateRangeValue}>
                      {startDate ? formatDate(startDate) : 'Not selected'}
                    </Text>
                  </View>
                </View>
                <View style={styles.dateRangeItem}>
                  <View style={styles.dateRangeIcon}>
                    <Ionicons name="calendar-outline" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.dateRangeContent}>
                    <Text style={styles.dateRangeLabel}>End Date</Text>
                    <Text style={styles.dateRangeValue}>
                      {endDate ? formatDate(endDate) : 'Not selected'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Summary Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Rental Summary</Text>
              </View>
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="location" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Pickup Location</Text>
                    <Text style={styles.summaryValue}>
                      {pickupLocation || 'Not specified'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="calendar" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>Start Date</Text>
                    <Text style={styles.summaryValue}>
                      {startDate ? formatDate(startDate) : 'Not selected'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryItem}>
                  <View style={styles.summaryIcon}>
                    <Ionicons name="time" size={16} color="#3B82F6" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={styles.summaryLabel}>End Date</Text>
                    <Text style={styles.summaryValue}>
                      {endDate ? formatDate(endDate) : 'Not selected'}
                    </Text>
                  </View>
                            </View>
          </View>
        </View>

        {/* Service and Driver Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="car" size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Select Service & Driver</Text>
          </View>
          
          {/* Service Selection */}
          <TouchableOpacity
            style={styles.selectionCard}
            onPress={() => setShowServicesModal(true)}
          >
            <View style={styles.selectionHeader}>
              <Ionicons name="business" size={20} color="#3B82F6" />
              <Text style={styles.selectionTitle}>Rental Service</Text>
            </View>
            {selectedService ? (
              <View style={styles.selectedItem}>
                <Text style={styles.selectedItemTitle}>{selectedService.name}</Text>
                <Text style={styles.selectedItemSubtitle}>{selectedService.description}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select a rental service</Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Driver Selection */}
          <TouchableOpacity
            style={[
              styles.selectionCard,
              !selectedService && styles.selectionCardDisabled
            ]}
            onPress={() => selectedService && setShowDriversModal(true)}
            disabled={!selectedService}
          >
            <View style={styles.selectionHeader}>
              <Ionicons name="person" size={20} color="#3B82F6" />
              <Text style={styles.selectionTitle}>Driver</Text>
            </View>
            {selectedDriver ? (
              <View style={styles.selectedItem}>
                <Text style={styles.selectedItemTitle}>
                  {selectedDriver.user.firstName} {selectedDriver.user.lastName}
                </Text>
                <Text style={styles.selectedItemSubtitle}>
                  {selectedDriver.riderApplication.vehicleYear} {selectedDriver.riderApplication.vehicleModel}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                {selectedService ? 'Select a driver' : 'Select a service first'}
              </Text>
            )}
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Bottom spacing for scroll */}
        <View style={styles.bottomSpacing} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.saveButton, 
              (!isLocationValid() || !isDateRangeValid() || !isServiceSelected() || !isDriverSelected() || isLoading) && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!isLocationValid() || !isDateRangeValid() || !isServiceSelected() || !isDriverSelected() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Book Rental</Text>
              </>
            )}
          </TouchableOpacity>
          
          {/* Validation Status */}
          {(!isLocationValid() || !isDateRangeValid() || !isServiceSelected() || !isDriverSelected()) && (
            <View style={styles.validationStatus}>
              <Ionicons name="information-circle" size={16} color="#6B7280" />
              <Text style={styles.validationText}>
                Please complete all required fields to book your rental
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Ride Services Modal */}
      <RideServicesModal
        isVisible={showServicesModal}
        onClose={() => setShowServicesModal(false)}
        onServiceSelect={handleServiceSelect}
      />

      {/* Drivers Modal */}
      <DriversModal
        isVisible={showDriversModal}
        onClose={() => setShowDriversModal(false)}
        selectedService={selectedService}
        onDriverSelect={handleDriverSelect}
        scheduleData={{
          pickupLocation,
          pickupType,
          startDate,
          endDate,
          pickupAddress,
          user
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  indicator: {
    backgroundColor: '#D1D5DB',
    width: 40,
    height: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 120,
  },
  bottomSpacing: {
    height: 150,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  radioGroup: {
    marginBottom: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radioButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioCircleActive: {
    borderColor: '#3B82F6',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
  radioContent: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  radioLabelActive: {
    color: '#1F2937',
  },
  radioDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  locationInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    textAlignVertical: 'top',
    minHeight: 20,
  },
  getLocationButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#6B7280',
  },
  // Calendar styles
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  calendarGrid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarDaysHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 8,
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 8,
  },
  calendarDayInRange: {
    backgroundColor: '#E0E7FF',
  },
  calendarDayStart: {
    backgroundColor: '#1E40AF',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  calendarDayEnd: {
    backgroundColor: '#1E40AF',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  calendarDayPast: {
    backgroundColor: '#F3F4F6',
  },
  calendarDayText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  calendarDayTextInRange: {
    color: '#1E40AF',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calendarDayTextPast: {
    color: '#9CA3AF',
  },
  dateRangeDisplay: {
    marginTop: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
  },
  dateRangeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dateRangeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateRangeContent: {
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  validationStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
  },
  validationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    textAlign: 'center',
  },
  // Vehicle section styles
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  vehiclesContainer: {
    gap: 16,
  },
  vehicleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#F8FAFC',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  vehicleSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginLeft: 4,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  driverService: {
    fontSize: 14,
    color: '#6B7280',
  },
  capacityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  vehiclePhotos: {
    marginBottom: 12,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  photoItem: {
    alignItems: 'center',
  },
  photoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectionIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginLeft: 4,
  },
  noVehiclesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noVehiclesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noVehiclesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Selection styles
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectionCardDisabled: {
    opacity: 0.5,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  selectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  selectedItem: {
    flex: 1,
  },
  selectedItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  selectedItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    flex: 1,
  },
});
