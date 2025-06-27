import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
  Vibration,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import { Input } from '@components/Input';
import { Select } from '@components/Select';
import type { AppStackParamList } from '@navigation/AppNavigator';
import type { SellerKycResponse } from '../services/kycService';

type SellerKycBusinessNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerKycBusiness'>;
type SellerKycBusinessRouteProp = RouteProp<AppStackParamList, 'SellerKycBusiness'>;

export function SellerKycBusiness() {
  const navigation = useNavigation<SellerKycBusinessNavigationProp>();
  const route = useRoute<SellerKycBusinessRouteProp>();
  const { existingData } = route.params;

  const [formData, setFormData] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
    taxId: '',
  });

  const [errors, setErrors] = useState({
    businessName: '',
    businessType: '',
    registrationNumber: '',
  });

  // Pre-populate form data if existing data is available
  useEffect(() => {
    if (existingData) {
      setFormData({
        businessName: existingData.businessName || '',
        businessType: existingData.businessType || '',
        registrationNumber: existingData.registrationNumber || '',
        taxId: existingData.taxId || '',
      });
    }
  }, [existingData]);

  const validateForm = () => {
    const newErrors = {
      businessName: '',
      businessType: '',
      registrationNumber: '',
    };
    let isValid = true;

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
      isValid = false;
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
      isValid = false;
    }

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleNext = () => {
    if (!validateForm()) {
      Vibration.vibrate(400);
      return;
    }

    navigation.navigate('SellerKycAddress', {
      businessData: formData,
      existingData: existingData,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Business Information</Text>
          <View style={styles.placeholder} />
        </View>

        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              <View style={styles.progressContainer}>
                <View style={[styles.progressStep, styles.activeStep]}>
                  <Text style={styles.progressNumber}>1</Text>
                </View>
                <View style={styles.progressLine} />
                <View style={styles.progressStep}>
                  <Text style={styles.progressNumber}>2</Text>
                </View>
                <View style={styles.progressLine} />
                <View style={styles.progressStep}>
                  <Text style={styles.progressNumber}>3</Text>
                </View>
              </View>

              <Text style={styles.subtitle}>Tell us about your business</Text>

              {existingData?.rejectionReason && (
                <View style={styles.rejectionContainer}>
                  <View style={styles.rejectionHeader}>
                    <Ionicons name="alert-circle" size={24} color="#DC2626" />
                    <Text style={styles.rejectionTitle}>Previous Submission Rejected</Text>
                  </View>
                  <Text style={styles.rejectionReason}>{existingData.rejectionReason}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Details</Text>
                <Input
                  label="Business Name"
                  value={formData.businessName}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, businessName: text });
                    if (errors.businessName) {
                      setErrors({ ...errors, businessName: '' });
                    }
                  }}
                  placeholder="Enter your business name"
                  error={errors.businessName}
                />
                <Select
                  label="Business Type"
                  value={formData.businessType}
                  onValueChange={(value: string | string[]) => {
                    if (typeof value === 'string') {
                      setFormData({ ...formData, businessType: value });
                      if (errors.businessType) {
                        setErrors({ ...errors, businessType: '' });
                      }
                    }
                  }}
                  items={[
                    { label: 'Sole Proprietorship', value: 'SOLE_PROPRIETORSHIP' },
                    { label: 'Partnership', value: 'PARTNERSHIP' },
                    { label: 'Corporation', value: 'CORPORATION' },
                    { label: 'Limited Liability Company', value: 'LLC' },
                  ]}
                  error={errors.businessType}
                />
                <Input
                  label="Registration Number"
                  value={formData.registrationNumber}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, registrationNumber: text });
                    if (errors.registrationNumber) {
                      setErrors({ ...errors, registrationNumber: '' });
                    }
                  }}
                  placeholder="Enter your business registration number"
                  error={errors.registrationNumber}
                />
                <Input
                  label="Tax ID (Optional)"
                  value={formData.taxId}
                  onChangeText={(text: string) => setFormData({ ...formData, taxId: text })}
                  placeholder="Enter your tax ID number"
                />
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <View style={styles.buttonContainer}>
          <Button
            label="Next"
            onPress={handleNext}
            style={styles.nextButton}
          />
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
  scrollContent: {
    flexGrow: 1,
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
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    width: '100%',
  },
  rejectionContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  rejectionReason: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
}); 