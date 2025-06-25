import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import type { AppStackParamList } from '@navigation/AppNavigator';
import { kycService } from '../services/kycService';
import { getImageUrl } from '../utils/imageUtils';

type SellerKycConfirmationNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerKycConfirmation'>;
type SellerKycConfirmationRouteProp = RouteProp<AppStackParamList, 'SellerKycConfirmation'>;

export function SellerKycConfirmation() {
  const navigation = useNavigation<SellerKycConfirmationNavigationProp>();
  const route = useRoute<SellerKycConfirmationRouteProp>();
  const { businessData, addressData, verificationData } = route.params;
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (section: 'business' | 'address' | 'verification') => {
    switch (section) {
      case 'business':
        navigation.navigate('SellerKycBusiness', {
          existingData: undefined
        });
        break;
      case 'address':
        navigation.navigate('SellerKycAddress', {
          businessData: businessData
        });
        break;
      case 'verification':
        navigation.navigate('SellerKycVerification', {
          businessData: businessData,
          addressData: addressData
        });
        break;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Convert MM/DD/YYYY to YYYY-MM-DD format for proper date handling
      const [month, day, year] = verificationData.idExpiryDate.split('/');
      const formattedExpiryDate = `${year}-${month}-${day}`;

      // Prepare the KYC data
      const kycData = {
        businessName: businessData.businessName,
        businessType: businessData.businessType,
        registrationNumber: businessData.registrationNumber,
        taxId: businessData.taxId,
        address: addressData.address,
        city: addressData.city,
        state: addressData.state,
        countries: addressData.countries, // Send all countries
        postalCode: addressData.postalCode,
        documentType: verificationData.idType,
        documentNumber: verificationData.idNumber,
        documentUrl: verificationData.idImage, // Assuming the image URL is stored
        documentExpiryDate: formattedExpiryDate,
      };

      // Submit KYC data using the service
      await kycService.submitKyc(kycData);
      
      // Navigate to success page or back to seller profile
      Alert.alert(
        "Submission Successful",
        "Your KYC information has been submitted successfully and is pending review.",
        [
          { 
            text: "OK", 
            onPress: () => navigation.navigate('SellerDashboard') 
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting KYC data:', error);
      Alert.alert(
        "Submission Failed",
        "There was an error submitting your KYC information. Please try again.",
        [
          { text: "OK" }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Review Information</Text>
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
              <View style={[styles.progressStep, styles.completedStep]}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
              <View style={[styles.progressLine, styles.completedLine]} />
              <View style={[styles.progressStep, styles.activeStep]}>
                <Text style={styles.progressNumber}>4</Text>
              </View>
            </View>

            <Text style={styles.subtitle}>Review your information</Text>
            <Text style={styles.description}>Please review all the information below before final submission.</Text>

            {/* Business Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Business Information</Text>
                <TouchableOpacity onPress={() => handleEdit('business')}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Business Name</Text>
                  <Text style={styles.infoValue}>{businessData.businessName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Business Type</Text>
                  <Text style={styles.infoValue}>{businessData.businessType}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Registration Number</Text>
                  <Text style={styles.infoValue}>{businessData.registrationNumber || 'Not provided'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tax ID</Text>
                  <Text style={styles.infoValue}>{businessData.taxId || 'Not provided'}</Text>
                </View>
              </View>
            </View>

            {/* Address Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Address Information</Text>
                <TouchableOpacity onPress={() => handleEdit('address')}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{addressData.address}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>City</Text>
                  <Text style={styles.infoValue}>{addressData.city}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>State/Province</Text>
                  <Text style={styles.infoValue}>{addressData.state || 'Not provided'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Countries</Text>
                  <Text style={styles.infoValue}>
                    {addressData.countries.join(', ')}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Postal Code</Text>
                  <Text style={styles.infoValue}>{addressData.postalCode || 'Not provided'}</Text>
                </View>
              </View>
            </View>

            {/* Verification Information Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Verification Information</Text>
                <TouchableOpacity onPress={() => handleEdit('verification')}>
                  <Text style={styles.editButton}>Edit</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Type</Text>
                  <Text style={styles.infoValue}>{verificationData.idType}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Number</Text>
                  <Text style={styles.infoValue}>{verificationData.idNumber}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expiry Date</Text>
                  <Text style={styles.infoValue}>{verificationData.idExpiryDate}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ID Document</Text>
                  <Text style={styles.infoValue}>Document uploaded successfully</Text>
                </View>
              </View>
            </View>

            <View style={styles.disclaimerContainer}>
              <Text style={styles.disclaimerText}>
                By submitting this information, you confirm that all details provided are accurate and complete. 
                Your information will be verified as part of our KYC process.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button
            label={isSubmitting ? "Submitting..." : "Submit KYC Information"}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isSubmitting}
          />
          {isSubmitting && (
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
  disclaimerContainer: {
    marginVertical: 24,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  disclaimerText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    width: '100%',
  },
  spinner: {
    position: 'absolute',
  },
}); 