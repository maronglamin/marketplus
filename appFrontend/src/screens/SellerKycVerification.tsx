import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Vibration,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import type { AppStackParamList } from '@navigation/AppNavigator';
import { uploadService } from '../services/uploadService';
import { getImageUrl } from '../utils/imageUtils';

type SellerKycVerificationNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerKycVerification'>;
type SellerKycVerificationRouteProp = RouteProp<AppStackParamList, 'SellerKycVerification'>;

export function SellerKycVerification() {
  const navigation = useNavigation<SellerKycVerificationNavigationProp>();
  const route = useRoute<SellerKycVerificationRouteProp>();
  const { businessData, addressData, existingData } = route.params;

  const [formData, setFormData] = useState({
    idType: '',
    idNumber: '',
    idExpiryDate: '',
    idImage: null as string | null,
  });

  const [errors, setErrors] = useState({
    idType: '',
    idNumber: '',
    idExpiryDate: '',
    idImage: '',
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [isUploading, setIsUploading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState<string | null>(null);
  const [requestingPerm, setRequestingPerm] = useState(false);

  // Pre-populate form data if existing data is available
  useEffect(() => {
    if (existingData) {
      console.log('Existing KYC data in verification:', existingData); // Debug log
      setFormData({
        idType: existingData.documentType || '',
        idNumber: existingData.documentNumber || '',
        idExpiryDate: existingData.documentExpiryDate || '',
        idImage: existingData.documentUrl || null,
      });
      // Store the old image URL for cleanup
      if (existingData.documentUrl) {
        setOldImageUrl(existingData.documentUrl);
      }
    }
  }, [existingData]);

  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (date) {
        setSelectedDate(date);
        const formattedDate = formatDate(date);
        setFormData({ ...formData, idExpiryDate: formattedDate });
        if (errors.idExpiryDate) {
          setErrors({ ...errors, idExpiryDate: '' });
        }
      }
    } else {
      if (date) {
        setTempDate(date);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {
      idType: '',
      idNumber: '',
      idExpiryDate: '',
      idImage: '',
    };
    let isValid = true;

    if (!formData.idType) {
      newErrors.idType = 'ID Type is required';
      isValid = false;
    }

    if (!formData.idNumber.trim()) {
      newErrors.idNumber = 'ID Number is required';
      isValid = false;
    }

    if (!formData.idExpiryDate.trim()) {
      newErrors.idExpiryDate = 'Expiry Date is required';
      isValid = false;
    }

    if (!formData.idImage) {
      newErrors.idImage = 'ID Document upload is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Small helper to show a confirmation-style info alert and wait for user choice
  const showInfoConfirm = (title: string, message: string, continueLabel = 'Continue'): Promise<boolean> => {
    return new Promise(resolve => {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: continueLabel, onPress: () => resolve(true) },
        ],
        { cancelable: true }
      );
    });
  };

  const ensureMediaLibraryPermission = async (): Promise<boolean> => {
    try {
      const existing = await ImagePicker.getMediaLibraryPermissionsAsync();
      if ((existing as any)?.granted) return true;
      // Provide rationale before OS prompt
      const proceed = await showInfoConfirm(
        'Photo Library Access',
        'We need access to your photo library so you can select an ID image for verification. Access is used only when you choose to upload.',
        'Continue'
      );
      if (!proceed) return false;
      setRequestingPerm(true);
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return !!(res as any)?.granted;
    } catch {
      return false;
    } finally {
      setRequestingPerm(false);
    }
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    try {
      const existing = await ImagePicker.getCameraPermissionsAsync();
      if ((existing as any)?.granted) return true;
      const proceed = await showInfoConfirm(
        'Camera Access',
        'Camera access is required to capture your identification document for KYC verification. The camera is used only when you choose to upload.',
        'Continue'
      );
      if (!proceed) return false;
      setRequestingPerm(true);
      const res = await ImagePicker.requestCameraPermissionsAsync();
      return !!(res as any)?.granted;
    } catch {
      return false;
    } finally {
      setRequestingPerm(false);
    }
  };

  const pickFromLibrary = async () => {
    try {
      const ok = await ensureMediaLibraryPermission();
      if (!ok) {
        Alert.alert('Permission Needed', 'Photo library access is required to select your ID image.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: false,
        exif: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setFormData(prev => ({ ...prev, idImage: selectedAsset.uri }));
        if (errors.idImage) setErrors(prev => ({ ...prev, idImage: '' }));
        console.log('Selected image:', {
          uri: selectedAsset.uri,
          width: selectedAsset.width,
          height: selectedAsset.height,
          type: selectedAsset.type
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.', [{ text: 'OK' }]);
    }
  };

  const takePhoto = async () => {
    try {
      const ok = await ensureCameraPermission();
      if (!ok) {
        Alert.alert('Permission Needed', 'Camera access is required to capture your ID image.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.6,
        base64: false,
        exif: false,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        setFormData(prev => ({ ...prev, idImage: selectedAsset.uri }));
        if (errors.idImage) setErrors(prev => ({ ...prev, idImage: '' }));
        console.log('Captured image:', {
          uri: selectedAsset.uri,
          width: selectedAsset.width,
          height: selectedAsset.height,
          type: selectedAsset.type
        });
      }
    } catch (error) {
      console.error('Error capturing image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.', [{ text: 'OK' }]);
    }
  };

  const chooseImageSource = async () => {
    Alert.alert(
      'Upload ID Document',
      'Choose how you want to provide your ID image.',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteImage = async () => {
    if (formData.idImage) {
      try {
        // If the current image is a server URL, delete it
        if (!formData.idImage.startsWith('file://')) {
          await uploadService.deleteImage(formData.idImage);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        // Show a warning but continue with the deletion
        Alert.alert(
          'Warning',
          'The image could not be deleted from the server, but it has been removed from your form.',
          [{ text: 'OK' }]
        );
      } finally {
        // Always update the UI state
        setFormData(prev => ({ ...prev, idImage: null }));
        if (errors.idImage) {
          setErrors(prev => ({ ...prev, idImage: '' }));
        }
      }
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Vibration.vibrate(400);
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload new image if it's a local file
      let uploadedImageUrl = formData.idImage;
      if (formData.idImage && formData.idImage.startsWith('file://')) {
        // Delete old image before uploading new one if it exists
        if (oldImageUrl) {
          try {
            await uploadService.deleteImage(oldImageUrl);
          } catch (error) {
            console.error('Error deleting old image:', error);
            // Show a warning but continue with the process
            Alert.alert(
              'Warning',
              'The old image could not be deleted from the server, but we will continue with uploading your new image.',
              [{ text: 'OK' }]
            );
          }
        }

        // Upload the new image
        uploadedImageUrl = await uploadService.uploadImage(formData.idImage);
      } else if (formData.idImage && oldImageUrl && formData.idImage !== oldImageUrl) {
        // If we're using an existing image but it's different from the old one,
        // delete the old image
        try {
          await uploadService.deleteImage(oldImageUrl);
        } catch (error) {
          console.error('Error deleting old image:', error);
          Alert.alert(
            'Warning',
            'The old image could not be deleted from the server, but your changes have been saved.',
            [{ text: 'OK' }]
          );
        }
      }

      // Navigate to confirmation screen with all the data
      navigation.navigate('SellerKycConfirmation', {
        businessData: businessData,
        addressData: addressData,
        verificationData: {
          idType: formData.idType,
          idNumber: formData.idNumber,
          idExpiryDate: formData.idExpiryDate,
          idImage: uploadedImageUrl,
        }
      });
    } catch (error) {
      console.error('Error saving verification data:', error);
      Alert.alert(
        'Error',
        'Failed to save verification data. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Verification Documents</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressStep, styles.completedStep]}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={[styles.progressLine, styles.completedLine]} />
              <View style={[styles.progressStep, styles.completedStep]}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={[styles.progressLine, styles.completedLine]} />
              <View style={[styles.progressStep, styles.activeStep]}>
                <Text style={styles.progressNumber}>3</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>Verify your identity</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Identity Verification</Text>
              <Select
                label="ID Type"
                value={formData.idType}
                onValueChange={(value: string | string[]) => {
                  if (typeof value === 'string') {
                    console.log('ID Type changed to:', value); // Debug log
                    setFormData({ ...formData, idType: value });
                    if (errors.idType) {
                      setErrors({ ...errors, idType: '' });
                    }
                  }
                }}
                items={[
                  { label: 'National ID', value: 'NATIONAL_ID' },
                  { label: 'Passport', value: 'PASSPORT' },
                  { label: 'Driver\'s License', value: 'DRIVERS_LICENSE' },
                  { label: 'Business Registration', value: 'BUSINESS_REGISTRATION' },
                  { label: 'Tax Certificate', value: 'TAX_CERTIFICATE' },
                ]}
                error={errors.idType}
              />
              <Input
                label="ID Number"
                value={formData.idNumber}
                onChangeText={(text: string) => {
                  setFormData({ ...formData, idNumber: text });
                  if (errors.idNumber) {
                    setErrors({ ...errors, idNumber: '' });
                  }
                }}
                placeholder="Enter your ID number"
                error={errors.idNumber}
              />
              
              <View style={styles.dateInputContainer}>
                <Text style={styles.inputLabel}>ID Expiry Date</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(true);
                    } else {
                      setTempDate(selectedDate);
                      setShowDatePicker(true);
                    }
                  }}
                  style={styles.dateInput}
                >
                  <Text style={[
                    styles.dateInputText,
                    formData.idExpiryDate ? styles.dateInputTextFilled : styles.dateInputTextEmpty
                  ]}>
                    {formData.idExpiryDate || 'Expiry Date (MM/DD/YYYY)'}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </TouchableOpacity>
                {errors.idExpiryDate ? (
                  <Text style={styles.errorText}>{errors.idExpiryDate}</Text>
                ) : null}
              </View>

              {Platform.OS === 'android' && showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>Upload ID Document</Text>
                <TouchableOpacity 
                  style={[
                    styles.uploadButton,
                    formData.idImage ? styles.uploadButtonWithImage : null
                  ]} 
                  onPress={chooseImageSource}
                  activeOpacity={0.7}
                >
                  {formData.idImage ? (
                    <View style={styles.imageContainer}>
                      <Image 
                        source={{ uri: formData.idImage }} 
                        style={styles.uploadedImage}
                        resizeMode="cover"
                        onLoadStart={() => setIsImageLoading(true)}
                        onLoadEnd={() => setIsImageLoading(false)}
                        onError={(error) => {
                          console.error('Image loading error:', error.nativeEvent.error);
                          setIsImageLoading(false);
                          // Show error alert if image fails to load
                          Alert.alert(
                            'Error',
                            'Failed to load image preview. Please try selecting the image again.',
                            [{ text: 'OK' }]
                          );
                        }}
                        fadeDuration={0}
                        defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' }}
                      />
                      {isImageLoading && (
                        <View style={styles.loadingOverlay}>
                          <ActivityIndicator size="large" color="#2563EB" />
                        </View>
                      )}
                      <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={handleDeleteImage}
                      >
                        <Ionicons name="close-circle" size={32} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <Ionicons name="cloud-upload-outline" size={32} color="#6B7280" />
                      <Text style={styles.uploadText}>Tap to upload ID document</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {errors.idImage ? (
                  <Text style={styles.errorText}>{errors.idImage}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </ScrollView>

        {Platform.OS === 'ios' && (
          <Modal
            visible={showDatePicker}
            transparent={true}
            animationType="slide"
          >
            <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
              <View style={styles.modalOverlay} />
            </TouchableWithoutFeedback>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Select Expiry Date</Text>
                
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  style={styles.datePicker}
                  textColor="#111827"
                />
                
                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]} 
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmButton]} 
                    onPress={() => {
                      setSelectedDate(tempDate);
                      const formattedDate = formatDate(tempDate);
                      setFormData({ ...formData, idExpiryDate: formattedDate });
                      if (errors.idExpiryDate) {
                        setErrors({ ...errors, idExpiryDate: '' });
                      }
                      setShowDatePicker(false);
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        <View style={styles.buttonContainer}>
          <Button
            label={isUploading ? "Uploading..." : "Save & Continue"}
            onPress={handleSave}
            style={styles.saveButton}
            disabled={isUploading}
          />
          {isUploading && (
            <ActivityIndicator 
              size="small" 
              color="#FFFFFF" 
              style={styles.spinner} 
            />
          )}
        </View>
      </View>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStep: {
    backgroundColor: '#2563EB',
  },
  completedStep: {
    backgroundColor: '#10B981',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  completedLine: {
    backgroundColor: '#10B981',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  uploadSection: {
    marginTop: 16,
  },
  uploadLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  uploadButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
  },
  uploadButtonWithImage: {
    borderStyle: 'solid',
    borderColor: '#D1D5DB',
  },
  uploadPlaceholder: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    backgroundColor: '#F3F4F6',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  dateInputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: 16,
    color: '#111827',
  },
  dateInputTextFilled: {
    color: '#111827',
  },
  dateInputTextEmpty: {
    color: '#9CA3AF',
  },
  datePicker: {
    width: '100%',
    height: 200,
    backgroundColor: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#2563EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  spinner: {
    position: 'absolute',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 