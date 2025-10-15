import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@components/Button';
import type { AppStackParamList } from '@navigation/AppNavigator';
import { kycService } from '../services/kycService';

type SellerKycFormNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerKycForm'>;
type SellerKycFormRouteProp = RouteProp<AppStackParamList, 'SellerKycForm'>;

export function SellerKycForm() {
  const navigation = useNavigation<SellerKycFormNavigationProp>();
  const route = useRoute<SellerKycFormRouteProp>();
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [existingKycData, setExistingKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKycData = async () => {
      try {
        setLoading(true);
        const response = await kycService.getKycStatus();
        console.log('KYC Response:', response); // Debug log
        
        if (response.status === 'REJECTED') {
          console.log('KYC Rejected, Reason:', response.rejectionReason); // Debug log
          setRejectionReason(response.rejectionReason || 'Your verification was rejected. Please review and update your information.');
          setExistingKycData(response);
        } else {
          console.log('KYC Status:', response.status); // Debug log
          setRejectionReason(null);
          setExistingKycData(null);
        }
      } catch (error) {
        console.error('Error fetching KYC data:', error);
        setRejectionReason(null);
        setExistingKycData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchKycData();
  }, []);

  // Debug log for render
  console.log('Current State:', { rejectionReason, existingKycData, loading });

  const handleStartKyc = () => {
    navigation.navigate('SellerKycBusiness', {
      existingData: existingKycData
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Seller Verification</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
          {rejectionReason && (
            <View style={styles.rejectionContainer}>
              <View style={styles.rejectionHeader}>
                <Ionicons name="alert-circle" size={24} color="#DC2626" />
                <Text style={styles.rejectionTitle}>Verification Rejected</Text>
              </View>
              <View style={styles.rejectionContent}>
                <Text style={styles.rejectionSubtitle}>Reason for Rejection:</Text>
                <Text style={styles.rejectionReason}>{rejectionReason}</Text>
                <View style={styles.rejectionTip}>
                  <Ionicons name="information-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.rejectionTipText}>
                    Please review and update your information based on the feedback above. Make sure all details are accurate and documents are clear.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {!rejectionReason && (
            <View style={styles.infoContainer}>
              <Text style={styles.subtitle}>
                {existingKycData ? 'Update Your KYC' : 'Complete Your KYC'}
              </Text>
              <Text style={styles.description}>
                {existingKycData 
                  ? 'Please review and update your verification information based on the feedback provided.'
                  : 'To start selling on our platform, you need to complete the verification process. This helps us ensure a safe and trustworthy marketplace for all users.'}
              </Text>
              
              <View style={styles.stepsContainer}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Business Information</Text>
                    <Text style={styles.stepDescription}>Provide your business details and registration information</Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Address Verification</Text>
                    <Text style={styles.stepDescription}>Confirm your business location and contact details</Text>
                  </View>
                </View>

                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepTitle}>Document Verification</Text>
                    <Text style={styles.stepDescription}>Upload required documents and banking information</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Button
            label={existingKycData ? "Update Verification" : "Start Verification"}
            onPress={handleStartKyc}
            style={styles.startButton}
          />
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
    padding: 16,
  },
  infoContainer: {
    flex: 1,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 32,
    lineHeight: 24,
  },
  stepsContainer: {
    gap: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startButton: {
    width: '100%',
  },
  rejectionContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  rejectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  rejectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
  },
  rejectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
  },
  rejectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 8,
  },
  rejectionReason: {
    fontSize: 15,
    color: '#991B1B',
    lineHeight: 22,
    marginBottom: 16,
  },
  rejectionTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  rejectionTipText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
}); 