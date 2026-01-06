import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Platform,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { AppStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../contexts/AuthContext';
import { RiderApplicationService } from '../../services/riderApplicationService';

type BecomeRiderNavigationProp = NativeStackNavigationProp<AppStackParamList, 'BecomeRider'>;
type BecomeRiderRouteProp = RouteProp<AppStackParamList, 'BecomeRider'>;

export function BecomeRider() {
  const navigation = useNavigation<BecomeRiderNavigationProp>();
  const route = useRoute<BecomeRiderRouteProp>();
  const { type, existingData } = route.params;
  const { user, refreshUser } = useAuth();

  // Refresh user data on component mount to get the most up-to-date information
  useEffect(() => {
    const loadUserData = async () => {
      try {
        console.log('🔄 Refreshing user data for form...');
        await refreshUser();
        console.log('✅ User data refreshed successfully');
      } catch (error) {
        console.error('❌ Error refreshing user data:', error);
      }
    };
    
    loadUserData();
  }, [refreshUser]);

  const [formData, setFormData] = useState(() => {
    // If we have existing data (rejected application), pre-fill the form
    if (existingData) {
      console.log('🔍 Existing data for form pre-fill:', {
        existingDataPhone: existingData.phone,
        existingDataPhoneNumber: existingData.phoneNumber,
        userPhoneNumber: user?.phoneNumber,
        finalPhone: existingData.phone || existingData.phoneNumber || user?.phoneNumber || ''
      });
      
      return {
        firstName: existingData.firstName || user?.firstName || '',
        lastName: existingData.lastName || user?.lastName || '',
        email: existingData.email || '',
        phone: existingData.phone || existingData.phoneNumber || user?.phoneNumber || user?.phone || '',
        dateOfBirth: existingData.dateOfBirth || '',
        address: existingData.address || '',
        city: existingData.city || '',
        licenseNumber: existingData.licenseNumber || '',
        licenseExpiry: existingData.licenseExpiry || '',
        vehicleType: existingData.vehicleType || type,
        vehicleModel: existingData.vehicleModel || '',
        vehicleYear: '',
        vehiclePlate: existingData.vehiclePlate || '',
        insuranceNumber: existingData.insuranceNumber || '',
        insuranceExpiry: existingData.insuranceExpiry || '',
        emergencyContact: existingData.emergencyContact || '',
        emergencyPhone: existingData.emergencyPhone || '',
        experience: existingData.experience || '',
        availability: existingData.availability || '',
        documents: existingData.documents?.map((doc: any) => doc.fileUrl) || [],
        carInteriorImages: existingData.carInteriorImages || [],
        carExteriorImages: existingData.carExteriorImages || [],
      };
    }
    
    console.log('🔍 Default form initialization:', {
      userPhoneNumber: user?.phoneNumber,
      userPhone: user?.phone,
      finalPhone: user?.phoneNumber || user?.phone || '',
      completeUser: user
    });
    
    return {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: '', // Email is optional and not stored in User model
      phone: user?.phoneNumber || user?.phone || '',
      dateOfBirth: '',
      address: '',
      city: '',
      licenseNumber: '',
      licenseExpiry: '',
      vehicleType: type,
      vehicleModel: '',
      vehicleYear: '',
      vehiclePlate: '',
      insuranceNumber: '',
      insuranceExpiry: '',
      emergencyContact: '',
      emergencyPhone: '',
      experience: '',
      availability: '',
      documents: [] as string[],
      carInteriorImages: [] as string[],
      carExteriorImages: [] as string[],
    };
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLicenseExpiryPicker, setShowLicenseExpiryPicker] = useState(false);
  const [showInsuranceExpiryPicker, setShowInsuranceExpiryPicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLicenseExpiry, setSelectedLicenseExpiry] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [tempSelectedDate, setTempSelectedDate] = useState(new Date());
  const [tempSelectedLicenseExpiry, setTempSelectedLicenseExpiry] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [selectedInsuranceExpiry, setSelectedInsuranceExpiry] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [tempSelectedInsuranceExpiry, setTempSelectedInsuranceExpiry] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });

  const getVehicleIcon = () => {
    switch (type) {
      case 'driver':
        return 'car-outline';
      case 'motorcycle':
        return 'bicycle-outline';
      case 'bicycle':
        return 'bicycle';
      default:
        return 'car-outline';
    }
  };

  const getVehicleTitle = () => {
    switch (type) {
      case 'driver':
        return 'Car Driver';
      case 'motorcycle':
        return 'Motorcycle Rider';
      case 'bicycle':
        return 'Bicycle Rider';
      default:
        return 'Driver';
    }
  };

  const getVehicleDescription = () => {
    switch (type) {
      case 'driver':
        return 'Drive passengers in your car and earn money on your schedule';
      case 'motorcycle':
        return 'Deliver packages and food quickly with your motorcycle';
      case 'bicycle':
        return 'Make eco-friendly deliveries with your bicycle';
      default:
        return 'Join our community of drivers';
    }
  };

  const getEarningsRange = () => {
    switch (type) {
      case 'driver':
        return 'Earn per ride request';
      case 'motorcycle':
        return 'Earn per ride request';
      case 'bicycle':
        return 'Earn per ride request';
      default:
        return 'Earn per ride request';
    }
  };

  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return 'First name is required';
        if (value.trim().length < 2) return 'First name must be at least 2 characters';
        return '';
      case 'lastName':
        if (!value.trim()) return 'Last name is required';
        if (value.trim().length < 2) return 'Last name must be at least 2 characters';
        return '';
      case 'email':
        if (value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address';
        }
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (value.trim().length < 10) return 'Phone number must be at least 10 digits';
        return '';
      case 'address':
        if (!value.trim()) return 'Address is required';
        if (value.trim().length < 10) return 'Please enter a complete address';
        return '';
      case 'city':
        if (!value.trim()) return 'City is required';
        return '';
      case 'licenseNumber':
        if (!value.trim()) return 'Driver\'s license number is required';
        return '';
      case 'licenseExpiry':
        if (!value.trim()) return 'License expiry date is required';
        return '';
      case 'vehicleModel':
        if (!value.trim()) return 'Vehicle model is required';
        return '';

      case 'vehiclePlate':
        if (!value.trim()) return 'License plate is required';
        return '';
      default:
        return '';
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields(prev => ({
      ...prev,
      [field]: true
    }));

    const error = validateField(field, formData[field as keyof typeof formData]);
    if (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error
      }));
      // Trigger haptic feedback for error
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, when user presses OK, the date is confirmed
      if (date && event.type === 'set') {
        setSelectedDate(date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        handleInputChange('dateOfBirth', formattedDate);
        setShowDatePicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (event.type === 'dismissed') {
        // User cancelled the picker
        setShowDatePicker(false);
      }
    } else {
      // On iOS, just update the temp date
      if (date) {
        setTempSelectedDate(date);
      }
    }
  };

  const confirmDateSelection = () => {
    console.log('🔘 Confirm date selection pressed');
    setSelectedDate(tempSelectedDate);
    const formattedDate = tempSelectedDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    console.log('📅 Formatted date:', formattedDate);
    handleInputChange('dateOfBirth', formattedDate);
    setShowDatePicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelDateSelection = () => {
    setTempSelectedDate(selectedDate);
    setShowDatePicker(false);
  };

  const showDatePickerModal = () => {
    setTempSelectedDate(selectedDate);
    setShowDatePicker(true);
  };

  const handleLicenseExpiryChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, when user presses OK, the date is confirmed
      if (date && event.type === 'set') {
        setSelectedLicenseExpiry(date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        handleInputChange('licenseExpiry', formattedDate);
        setShowLicenseExpiryPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (event.type === 'dismissed') {
        // User cancelled the picker
        setShowLicenseExpiryPicker(false);
      }
    } else {
      // On iOS, just update the temp date
      if (date) {
        setTempSelectedLicenseExpiry(date);
      }
    }
  };

  const confirmLicenseExpirySelection = () => {
    console.log('🔘 Confirm license expiry selection pressed');
    setSelectedLicenseExpiry(tempSelectedLicenseExpiry);
    const formattedDate = tempSelectedLicenseExpiry.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    console.log('📅 License expiry formatted date:', formattedDate);
    handleInputChange('licenseExpiry', formattedDate);
    setShowLicenseExpiryPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelLicenseExpirySelection = () => {
    setTempSelectedLicenseExpiry(selectedLicenseExpiry);
    setShowLicenseExpiryPicker(false);
  };

  const getMinimumLicenseExpiryDate = () => {
    // Only allow future dates for license and insurance expiry
    const today = new Date();
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return tomorrow;
  };

  const showLicenseExpiryPickerModal = () => {
    setTempSelectedLicenseExpiry(selectedLicenseExpiry);
    setShowLicenseExpiryPicker(true);
  };

  const handleInsuranceExpiryChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      // On Android, when user presses OK, the date is confirmed
      if (date && event.type === 'set') {
        setSelectedInsuranceExpiry(date);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        });
        handleInputChange('insuranceExpiry', formattedDate);
        setShowInsuranceExpiryPicker(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else if (event.type === 'dismissed') {
        // User cancelled the picker
        setShowInsuranceExpiryPicker(false);
      }
    } else {
      // On iOS, just update the temp date
      if (date) {
        setTempSelectedInsuranceExpiry(date);
      }
    }
  };

  const confirmInsuranceExpirySelection = () => {
    console.log('🔘 Confirm insurance expiry selection pressed');
    setSelectedInsuranceExpiry(tempSelectedInsuranceExpiry);
    const formattedDate = tempSelectedInsuranceExpiry.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    console.log('📅 Insurance expiry formatted date:', formattedDate);
    handleInputChange('insuranceExpiry', formattedDate);
    setShowInsuranceExpiryPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const cancelInsuranceExpirySelection = () => {
    setTempSelectedInsuranceExpiry(selectedInsuranceExpiry);
    setShowInsuranceExpiryPicker(false);
  };

  const showInsuranceExpiryPickerModal = () => {
    setTempSelectedInsuranceExpiry(selectedInsuranceExpiry);
    setShowInsuranceExpiryPicker(true);
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We use your photo library so you can select driver license, registration, insurance and vehicle photos for your rider application. Access is requested only when you choose to upload and is not used in the background.'
      );
      return false;
    }
    return true;
  };

  const handleDocumentUpload = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Upload Document',
      'Choose how you want to upload your document',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openImagePicker(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        // Create a file object for upload
        const file = {
          uri: asset.uri,
          name: `document_${Date.now()}.jpg`,
          type: 'image/jpeg',
        };

        // Upload the file
        const uploadResult = await RiderApplicationService.uploadFile(file, 'DRIVERS_LICENSE');
        
        if (uploadResult.success && uploadResult.data) {
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, uploadResult.data!.fileUrl]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', 'Document uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload document');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const openImagePicker = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        // Upload multiple files
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          name: `document_${Date.now()}_${Math.random()}.jpg`,
          type: 'image/jpeg',
        }));

        const uploadResult = await RiderApplicationService.uploadMultipleFiles(files, 'DRIVERS_LICENSE');
        
        if (uploadResult.success && uploadResult.data) {
          const uploadedUrls = uploadResult.data.map(file => file.fileUrl);
          setFormData(prev => ({
            ...prev,
            documents: [...prev.documents, ...uploadedUrls]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', `${uploadedUrls.length} documents uploaded successfully!`);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload documents');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select images. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = (index: number) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Car Interior Images Upload Functions
  const handleCarInteriorUpload = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Upload Car Interior Photos',
      'Choose how you want to upload car interior photos',
      [
        {
          text: 'Camera',
          onPress: () => openCarInteriorCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openCarInteriorImagePicker(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCarInteriorCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const file = {
          uri: asset.uri,
          name: `car_interior_${Date.now()}.jpg`,
          type: 'image/jpeg',
        };

        const uploadResult = await RiderApplicationService.uploadFile(file, 'CAR_INTERIOR_PHOTO');
        
        if (uploadResult.success && uploadResult.data) {
          setFormData(prev => ({
            ...prev,
            carInteriorImages: [...prev.carInteriorImages, uploadResult.data!.fileUrl]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', 'Car interior photo uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload car interior photo');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const openCarInteriorImagePicker = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          name: `car_interior_${Date.now()}_${Math.random()}.jpg`,
          type: 'image/jpeg',
        }));

        const uploadResult = await RiderApplicationService.uploadMultipleFiles(files, 'CAR_INTERIOR_PHOTO');
        
        if (uploadResult.success && uploadResult.data) {
          const uploadedUrls = uploadResult.data.map(file => file.fileUrl);
          setFormData(prev => ({
            ...prev,
            carInteriorImages: [...prev.carInteriorImages, ...uploadedUrls]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', `${uploadedUrls.length} car interior photos uploaded successfully!`);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload car interior photos');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeCarInteriorImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      carInteriorImages: prev.carInteriorImages.filter((_, i) => i !== index)
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Car Exterior Images Upload Functions
  const handleCarExteriorUpload = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Alert.alert(
      'Upload Car Exterior Photos',
      'Choose how you want to upload car exterior photos',
      [
        {
          text: 'Camera',
          onPress: () => openCarExteriorCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openCarExteriorImagePicker(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCarExteriorCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        
        const file = {
          uri: asset.uri,
          name: `car_exterior_${Date.now()}.jpg`,
          type: 'image/jpeg',
        };

        const uploadResult = await RiderApplicationService.uploadFile(file, 'CAR_EXTERIOR_PHOTO');
        
        if (uploadResult.success && uploadResult.data) {
          setFormData(prev => ({
            ...prev,
            carExteriorImages: [...prev.carExteriorImages, uploadResult.data!.fileUrl]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', 'Car exterior photo uploaded successfully!');
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload car exterior photo');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const openCarExteriorImagePicker = async () => {
    try {
      setIsUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        const files = result.assets.map(asset => ({
          uri: asset.uri,
          name: `car_exterior_${Date.now()}_${Math.random()}.jpg`,
          type: 'image/jpeg',
        }));

        const uploadResult = await RiderApplicationService.uploadMultipleFiles(files, 'CAR_EXTERIOR_PHOTO');
        
        if (uploadResult.success && uploadResult.data) {
          const uploadedUrls = uploadResult.data.map(file => file.fileUrl);
          setFormData(prev => ({
            ...prev,
            carExteriorImages: [...prev.carExteriorImages, ...uploadedUrls]
          }));
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert('Success', `${uploadedUrls.length} car exterior photos uploaded successfully!`);
        } else {
          Alert.alert('Error', uploadResult.error || 'Failed to upload car exterior photos');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeCarExteriorImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      carExteriorImages: prev.carExteriorImages.filter((_, i) => i !== index)
    }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const validateCurrentStep = (): boolean => {
    const stepFields: Record<number, string[]> = {
      1: ['firstName', 'lastName', 'phone'],
      2: ['address', 'city', 'licenseNumber', 'licenseExpiry'],
      3: ['vehicleModel', 'vehiclePlate'],
      4: []
    };

    // Special validation for step 4 - require at least 2 documents and car images for drivers
    if (currentStep === 4) {
      if (formData.documents.length < 2) {
        setErrors(prev => ({ 
          ...prev, 
          documents: 'Please upload at least 2 documents (e.g., driver license, vehicle registration, insurance)' 
        }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return false;
      }
      
      // For driver applications, require car interior and exterior photos
      if (formData.vehicleType === 'driver') {
        if (formData.carInteriorImages.length < 1) {
          setErrors(prev => ({ 
            ...prev, 
            carInteriorImages: 'Please upload at least 1 car interior photo' 
          }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return false;
        }
        
        if (formData.carExteriorImages.length < 1) {
          setErrors(prev => ({ 
            ...prev, 
            carExteriorImages: 'Please upload at least 1 car exterior photo' 
          }));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return false;
        }
      }
    }

    const currentFields = stepFields[currentStep] || [];
    const newErrors: Record<string, string> = {};
    let hasErrors = false;

    currentFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (typeof value === 'string') {
        const error = validateField(field, value);
        if (error) {
          newErrors[field] = error;
          hasErrors = true;
        }
      }
    });

    setErrors(prev => ({ ...prev, ...newErrors }));

    if (hasErrors) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    // Validate all required fields across all steps
    const allRequiredFields = [
      'firstName', 'lastName', 'phone', // Step 1
      'address', 'city', 'licenseNumber', 'licenseExpiry', // Step 2
      'vehicleModel', 'vehiclePlate' // Step 3
    ];
    
    const missingFields: string[] = [];
    
    allRequiredFields.forEach(field => {
      const value = formData[field as keyof typeof formData];
      if (!value || (typeof value === 'string' && !value.trim())) {
        missingFields.push(field);
      }
    });
    
    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(field => {
        switch (field) {
          case 'firstName': return 'First Name';
          case 'lastName': return 'Last Name';
          case 'phone': return 'Phone Number';
          case 'address': return 'Address';
          case 'city': return 'City';
          case 'licenseNumber': return 'Driver\'s License Number';
          case 'licenseExpiry': return 'License Expiry Date';
          case 'vehicleModel': return 'Vehicle Model';
          case 'vehiclePlate': return 'License Plate';
          default: return field;
        }
      }).join(', ');
      
      Alert.alert('Missing Information', `Please fill in the following required fields: ${fieldNames}`);
      setIsSubmitting(false);
      return;
    }

    try {
      // Prepare the application data
      const applicationData = {
        vehicleType: (formData.vehicleType === 'driver' ? 'DRIVER' : 
                     formData.vehicleType === 'motorcycle' ? 'MOTORCYCLE' : 
                     formData.vehicleType === 'bicycle' ? 'BICYCLE' : 'DRIVER') as 'DRIVER' | 'MOTORCYCLE' | 'BICYCLE',
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phoneNumber: formData.phone,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address,
        city: formData.city,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry,
        vehicleModel: formData.vehicleModel,
        vehiclePlate: formData.vehiclePlate,
        insuranceNumber: formData.insuranceNumber || undefined,
        insuranceExpiry: formData.insuranceExpiry || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        experience: formData.experience || undefined,
        availability: formData.availability || undefined,
        documents: [
          // Regular documents
          ...formData.documents.map((docUrl, index) => ({
            documentType: 'DRIVERS_LICENSE',
            fileName: `document_${index + 1}.jpg`,
            fileUrl: docUrl,
            fileSize: 0,
            mimeType: 'image/jpeg'
          })),
          // Car interior images
          ...formData.carInteriorImages.map((imageUrl, index) => ({
            documentType: 'CAR_INTERIOR_PHOTO',
            fileName: `car_interior_${index + 1}.jpg`,
            fileUrl: imageUrl,
            fileSize: 0,
            mimeType: 'image/jpeg'
          })),
          // Car exterior images
          ...formData.carExteriorImages.map((imageUrl, index) => ({
            documentType: 'CAR_EXTERIOR_PHOTO',
            fileName: `car_exterior_${index + 1}.jpg`,
            fileUrl: imageUrl,
            fileSize: 0,
            mimeType: 'image/jpeg'
          }))
        ]
      };

      // Submit the application
      const result = await RiderApplicationService.createApplication(applicationData);
      
      if (result.success) {
        Alert.alert(
          'Application Submitted!',
          'Thank you for your interest in becoming a rider. We will review your application and contact you within 24-48 hours.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home')
            }
          ]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to submit application. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4].map(step => (
        <View key={step} style={styles.stepContainer}>
          <View style={[
            styles.stepCircle,
            step <= currentStep ? styles.activeStep : styles.inactiveStep
          ]}>
            <Text style={[
              styles.stepNumber,
              step <= currentStep ? styles.activeStepText : styles.inactiveStepText
            ]}>
              {step}
            </Text>
          </View>
          {step < 4 && (
            <View style={[
              styles.stepLine,
              step < currentStep ? styles.activeStepLine : styles.inactiveStepLine
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
            
            <View style={styles.infoNote}>
              <Ionicons name="information-circle-outline" size={16} color="#1E40AF" />
              <Text style={styles.infoNoteText}>
                Your profile information has been pre-filled. Name and phone number cannot be edited. Email is optional.
              </Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>First Name *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.disabledInput,
                  touchedFields.firstName && errors.firstName && styles.textInputError
                ]}
                value={formData.firstName}
                onChangeText={(value) => handleInputChange('firstName', value)}
                onBlur={() => handleFieldBlur('firstName')}
                placeholder="Enter your first name"
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
              {touchedFields.firstName && errors.firstName && (
                <Text style={styles.errorText}>{errors.firstName}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Last Name *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.disabledInput,
                  touchedFields.lastName && errors.lastName && styles.textInputError
                ]}
                value={formData.lastName}
                onChangeText={(value) => handleInputChange('lastName', value)}
                onBlur={() => handleFieldBlur('lastName')}
                placeholder="Enter your last name"
                placeholderTextColor="#9CA3AF"
                editable={false}
              />
              {touchedFields.lastName && errors.lastName && (
                <Text style={styles.errorText}>{errors.lastName}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address (Optional)</Text>
              <TextInput
                style={[
                  styles.textInput,
                  touchedFields.email && errors.email && styles.textInputError
                ]}
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                onBlur={() => handleFieldBlur('email')}
                placeholder="Enter your email (optional)"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              {touchedFields.email && errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.disabledInput,
                  touchedFields.phone && errors.phone && styles.textInputError
                ]}
                value={formData.phone}
                onChangeText={(value) => handleInputChange('phone', value)}
                onBlur={() => handleFieldBlur('phone')}
                placeholder="Enter your phone number"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                editable={false}
              />
              {touchedFields.phone && errors.phone && (
                <Text style={styles.errorText}>{errors.phone}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={[
                  styles.textInput,
                  styles.dateInput,
                  touchedFields.dateOfBirth && errors.dateOfBirth && styles.textInputError
                ]}
                onPress={showDatePickerModal}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dateInputText,
                  !formData.dateOfBirth && styles.placeholderText
                ]}>
                  {formData.dateOfBirth || "MM/DD/YYYY"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {touchedFields.dateOfBirth && errors.dateOfBirth && (
                <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Address & License</Text>
            <Text style={styles.stepSubtitle}>Your location and driving credentials</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address *</Text>
              <TextInput
                style={[
                  styles.textInput, 
                  styles.textArea,
                  touchedFields.address && errors.address && styles.textInputError
                ]}
                value={formData.address}
                onChangeText={(value) => handleInputChange('address', value)}
                onBlur={() => handleFieldBlur('address')}
                placeholder="Enter your full address"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
              {touchedFields.address && errors.address && (
                <Text style={styles.errorText}>{errors.address}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>City *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  touchedFields.city && errors.city && styles.textInputError
                ]}
                value={formData.city}
                onChangeText={(value) => handleInputChange('city', value)}
                onBlur={() => handleFieldBlur('city')}
                placeholder="Enter your city"
                placeholderTextColor="#9CA3AF"
              />
              {touchedFields.city && errors.city && (
                <Text style={styles.errorText}>{errors.city}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driver's License Number *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  touchedFields.licenseNumber && errors.licenseNumber && styles.textInputError
                ]}
                value={formData.licenseNumber}
                onChangeText={(value) => handleInputChange('licenseNumber', value)}
                onBlur={() => handleFieldBlur('licenseNumber')}
                placeholder="Enter license number"
                placeholderTextColor="#9CA3AF"
              />
              {touchedFields.licenseNumber && errors.licenseNumber && (
                <Text style={styles.errorText}>{errors.licenseNumber}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>License Expiry Date *</Text>
              <TouchableOpacity
                style={[
                  styles.textInput,
                  styles.dateInput,
                  touchedFields.licenseExpiry && errors.licenseExpiry && styles.textInputError
                ]}
                onPress={showLicenseExpiryPickerModal}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dateInputText,
                  !formData.licenseExpiry && styles.placeholderText
                ]}>
                  {formData.licenseExpiry || "MM/DD/YYYY"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {touchedFields.licenseExpiry && errors.licenseExpiry && (
                <Text style={styles.errorText}>{errors.licenseExpiry}</Text>
              )}
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Vehicle Information</Text>
            <Text style={styles.stepSubtitle}>Details about your {type}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Vehicle Model *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  touchedFields.vehicleModel && errors.vehicleModel && styles.textInputError
                ]}
                value={formData.vehicleModel}
                onChangeText={(value) => handleInputChange('vehicleModel', value)}
                onBlur={() => handleFieldBlur('vehicleModel')}
                placeholder={`Enter your ${type} model`}
                placeholderTextColor="#9CA3AF"
              />
              {touchedFields.vehicleModel && errors.vehicleModel && (
                <Text style={styles.errorText}>{errors.vehicleModel}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>License Plate *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  touchedFields.vehiclePlate && errors.vehiclePlate && styles.textInputError
                ]}
                value={formData.vehiclePlate}
                onChangeText={(value) => handleInputChange('vehiclePlate', value)}
                onBlur={() => handleFieldBlur('vehiclePlate')}
                placeholder="Enter license plate"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="characters"
              />
              {touchedFields.vehiclePlate && errors.vehiclePlate && (
                <Text style={styles.errorText}>{errors.vehiclePlate}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Insurance Number</Text>
              <TextInput
                style={styles.textInput}
                value={formData.insuranceNumber}
                onChangeText={(value) => handleInputChange('insuranceNumber', value)}
                placeholder="Enter insurance number"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Insurance Expiry</Text>
              <TouchableOpacity
                style={[
                  styles.textInput,
                  styles.dateInput
                ]}
                onPress={showInsuranceExpiryPickerModal}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dateInputText,
                  !formData.insuranceExpiry && styles.placeholderText
                ]}>
                  {formData.insuranceExpiry || "MM/DD/YYYY"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Additional Information</Text>
            <Text style={styles.stepSubtitle}>Help us understand your availability</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Emergency Contact</Text>
              <TextInput
                style={styles.textInput}
                value={formData.emergencyContact}
                onChangeText={(value) => handleInputChange('emergencyContact', value)}
                placeholder="Emergency contact name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Emergency Phone</Text>
              <TextInput
                style={styles.textInput}
                value={formData.emergencyPhone}
                onChangeText={(value) => handleInputChange('emergencyPhone', value)}
                placeholder="Emergency contact phone"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Driving Experience</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.experience}
                onChangeText={(value) => handleInputChange('experience', value)}
                placeholder="Tell us about your driving experience"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Availability</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={formData.availability}
                onChangeText={(value) => handleInputChange('availability', value)}
                placeholder="When are you available to work?"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.inputLabel}>Required Documents *</Text>
              <Text style={styles.uploadDescription}>
                Please upload at least 2 documents (e.g., driver license, vehicle registration, insurance)
              </Text>
              {errors.documents && (
                <Text style={styles.errorText}>{errors.documents}</Text>
              )}
              <Text style={[styles.uploadDescription, { marginTop: 8, color: formData.documents.length >= 2 ? '#059669' : '#DC2626' }]}>
                {formData.documents.length}/2 documents uploaded
              </Text>
              <View style={styles.documentList}>
                <View style={styles.documentItem}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <Text style={styles.documentText}>Driver's License</Text>
                </View>
                <View style={styles.documentItem}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <Text style={styles.documentText}>Vehicle Registration</Text>
                </View>
                <View style={styles.documentItem}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <Text style={styles.documentText}>Insurance Certificate</Text>
                </View>
                <View style={styles.documentItem}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <Text style={styles.documentText}>Background Check</Text>
                </View>
              </View>
              
              {/* Uploaded Documents */}
              {formData.documents.length > 0 && (
                <View style={styles.uploadedDocuments}>
                  <Text style={styles.uploadedTitle}>Uploaded Documents ({formData.documents.length})</Text>
                  {formData.documents.map((document, index) => (
                    <View key={index} style={styles.uploadedDocumentItem}>
                      <View style={styles.documentPreview}>
                        <Image source={{ uri: document }} style={styles.documentImage} />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>Document {index + 1}</Text>
                        <Text style={styles.documentSize}>Image</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeDocument(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
                          <TouchableOpacity 
              style={[styles.uploadButton, isUploading && styles.disabledButton]} 
              onPress={handleDocumentUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Ionicons name="cloud-upload" size={24} color="#6B7280" />
                  <Text style={[styles.uploadButtonText, { color: '#6B7280' }]}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color="#1E40AF" />
                  <Text style={styles.uploadButtonText}>Upload Documents</Text>
                </>
              )}
            </TouchableOpacity>
            </View>

            {/* Car Interior Images Section */}
            <View style={styles.uploadSection}>
              <Text style={styles.inputLabel}>Car Interior Photos *</Text>
              <Text style={styles.uploadDescription}>
                Please upload clear photos of your car interior (dashboard, seats, cleanliness)
              </Text>
              {errors.carInteriorImages && (
                <Text style={styles.errorText}>{errors.carInteriorImages}</Text>
              )}
              <Text style={[styles.uploadDescription, { marginTop: 8, color: formData.carInteriorImages.length >= 1 ? '#059669' : '#DC2626' }]}>
                {formData.carInteriorImages.length}/1+ interior photos uploaded
              </Text>
              
              {/* Uploaded Car Interior Images */}
              {formData.carInteriorImages.length > 0 && (
                <View style={styles.uploadedDocuments}>
                  <Text style={styles.uploadedTitle}>Uploaded Interior Photos ({formData.carInteriorImages.length})</Text>
                  {formData.carInteriorImages.map((image, index) => (
                    <View key={index} style={styles.uploadedDocumentItem}>
                      <View style={styles.documentPreview}>
                        <Image source={{ uri: image }} style={styles.documentImage} />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>Interior Photo {index + 1}</Text>
                        <Text style={styles.documentSize}>Image</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeCarInteriorImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.uploadButton, isUploading && styles.disabledButton]} 
                onPress={handleCarInteriorUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Ionicons name="cloud-upload" size={24} color="#6B7280" />
                    <Text style={[styles.uploadButtonText, { color: '#6B7280' }]}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="car-outline" size={24} color="#1E40AF" />
                    <Text style={styles.uploadButtonText}>Upload Interior Photos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Car Exterior Images Section */}
            <View style={styles.uploadSection}>
              <Text style={styles.inputLabel}>Car Exterior Photos *</Text>
              <Text style={styles.uploadDescription}>
                Please upload clear photos of your car exterior (front, back, sides, overall condition)
              </Text>
              {errors.carExteriorImages && (
                <Text style={styles.errorText}>{errors.carExteriorImages}</Text>
              )}
              <Text style={[styles.uploadDescription, { marginTop: 8, color: formData.carExteriorImages.length >= 1 ? '#059669' : '#DC2626' }]}>
                {formData.carExteriorImages.length}/1+ exterior photos uploaded
              </Text>
              
              {/* Uploaded Car Exterior Images */}
              {formData.carExteriorImages.length > 0 && (
                <View style={styles.uploadedDocuments}>
                  <Text style={styles.uploadedTitle}>Uploaded Exterior Photos ({formData.carExteriorImages.length})</Text>
                  {formData.carExteriorImages.map((image, index) => (
                    <View key={index} style={styles.uploadedDocumentItem}>
                      <View style={styles.documentPreview}>
                        <Image source={{ uri: image }} style={styles.documentImage} />
                      </View>
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>Exterior Photo {index + 1}</Text>
                        <Text style={styles.documentSize}>Image</Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeCarExteriorImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.uploadButton, isUploading && styles.disabledButton]} 
                onPress={handleCarExteriorUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Ionicons name="cloud-upload" size={24} color="#6B7280" />
                    <Text style={[styles.uploadButtonText, { color: '#6B7280' }]}>Uploading...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="car-sport-outline" size={24} color="#1E40AF" />
                    <Text style={styles.uploadButtonText}>Upload Exterior Photos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {existingData ? 'Update Application' : 'Become a Rider'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Vehicle Type Header */}
          <View style={styles.vehicleHeader}>
            {existingData && (
              <View style={styles.reapplicationBadge}>
                <Ionicons name="refresh" size={16} color="#EF4444" />
                <Text style={styles.reapplicationText}>Reapplication</Text>
              </View>
            )}
            <View style={styles.vehicleIconContainer}>
              <Ionicons name={getVehicleIcon()} size={48} color="#1E40AF" />
            </View>
            <Text style={styles.vehicleTitle}>{getVehicleTitle()}</Text>
            <Text style={styles.vehicleDescription}>{getVehicleDescription()}</Text>
            <View style={styles.earningsBadge}>
              <Ionicons name="cash-outline" size={16} color="#1E40AF" />
              <Text style={styles.earningsText}>{getEarningsRange()}</Text>
            </View>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          {renderStepContent()}

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={styles.previousButton}
                onPress={handlePreviousStep}
              >
                <Ionicons name="arrow-back" size={20} color="#6B7280" />
                <Text style={styles.previousButtonText}>Previous</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 4 ? (
              <TouchableOpacity 
                style={styles.nextButton}
                onPress={handleNextStep}
              >
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.nextButton, isSubmitting && styles.disabledButton]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Text style={styles.nextButtonText}>Submitting...</Text>
                ) : (
                  <>
                    <Text style={styles.nextButtonText}>Submit Application</Text>
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelDateSelection}
        >
          {Platform.OS === 'android' ? (
            // Android: Just show the picker without modal card
            <View style={styles.datePickerOverlay}>
              <DateTimePicker
                value={tempSelectedDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            </View>
          ) : (
            // iOS: Show full modal card with spinner
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                  <TouchableOpacity onPress={cancelDateSelection} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={tempSelectedDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  minimumDate={new Date(1900, 0, 1)}
                  themeVariant="light"
                  style={styles.datePicker}
                />
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={cancelDateSelection}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={confirmDateSelection}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
      )}

      {/* License Expiry Date Picker Modal */}
      {showLicenseExpiryPicker && (
        <Modal
          visible={showLicenseExpiryPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelLicenseExpirySelection}
        >
          {Platform.OS === 'android' ? (
            // Android: Just show the picker without modal card
            <View style={styles.datePickerOverlay}>
              <DateTimePicker
                value={tempSelectedLicenseExpiry}
                mode="date"
                display="default"
                onChange={handleLicenseExpiryChange}
                minimumDate={getMinimumLicenseExpiryDate()}
              />
            </View>
          ) : (
            // iOS: Show full modal card with spinner
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select License Expiry Date</Text>
                  <TouchableOpacity onPress={cancelLicenseExpirySelection} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={tempSelectedLicenseExpiry}
                  mode="date"
                  display="spinner"
                  onChange={handleLicenseExpiryChange}
                  minimumDate={getMinimumLicenseExpiryDate()}
                  themeVariant="light"
                  style={styles.datePicker}
                />
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={cancelLicenseExpirySelection}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={confirmLicenseExpirySelection}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
      )}

      {/* Insurance Expiry Date Picker Modal */}
      {showInsuranceExpiryPicker && (
        <Modal
          visible={showInsuranceExpiryPicker}
          transparent={true}
          animationType="slide"
          onRequestClose={cancelInsuranceExpirySelection}
        >
          {Platform.OS === 'android' ? (
            // Android: Just show the picker without modal card
            <View style={styles.datePickerOverlay}>
              <DateTimePicker
                value={tempSelectedInsuranceExpiry}
                mode="date"
                display="default"
                onChange={handleInsuranceExpiryChange}
                minimumDate={getMinimumLicenseExpiryDate()}
              />
            </View>
          ) : (
            // iOS: Show full modal card with spinner
            <View style={styles.datePickerOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>Select Insurance Expiry Date</Text>
                  <TouchableOpacity onPress={cancelInsuranceExpirySelection} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                
                <DateTimePicker
                  value={tempSelectedInsuranceExpiry}
                  mode="date"
                  display="spinner"
                  onChange={handleInsuranceExpiryChange}
                  minimumDate={getMinimumLicenseExpiryDate()}
                  themeVariant="light"
                  style={styles.datePicker}
                />
                
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={cancelInsuranceExpirySelection}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmButton}
                    onPress={confirmInsuranceExpirySelection}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  vehicleHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  vehicleIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  vehicleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  vehicleDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  earningsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  earningsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#1E40AF',
  },
  inactiveStep: {
    backgroundColor: '#E5E7EB',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeStepText: {
    color: '#FFFFFF',
  },
  inactiveStepText: {
    color: '#6B7280',
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 8,
  },
  activeStepLine: {
    backgroundColor: '#1E40AF',
  },
  inactiveStepLine: {
    backgroundColor: '#E5E7EB',
  },
  stepContent: {
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
    borderColor: '#E5E7EB',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  infoNoteText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 8,
    flex: 1,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  uploadSection: {
    marginTop: 24,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  documentList: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  documentText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#1E40AF',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 16,
    backgroundColor: '#EFF6FF',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E40AF',
    marginLeft: 8,
  },
  uploadedDocuments: {
    marginTop: 16,
    marginBottom: 16,
  },
  uploadedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  uploadedDocumentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  documentPreview: {
    width: 50,
    height: 50,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 12,
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  documentSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeButton: {
    padding: 4,
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  previousButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 8,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  textInputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  // Date Picker Modal Styles
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePicker: {
    height: 200,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1E40AF',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reapplicationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  reapplicationText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 4,
  },
}); 