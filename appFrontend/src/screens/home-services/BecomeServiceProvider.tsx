import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi } from '../../services/homeServicesApi';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { FormScreenLayout } from '../../components/FormScreenLayout';
import { LocationPickerField } from '../../components/LocationPickerField';
import type { MapLocationWithCity } from '../../services/mapLocationService';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'BecomeServiceProvider'>;
type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null;

const ACCENT = '#0EA5E9';
const STEPS = ['Personal Info', 'Location', 'About You'];
const TOTAL_STEPS = STEPS.length;

export function BecomeServiceProvider() {
  const navigation = useNavigation<Nav>();
  const { user, isLoading: authLoading, isAuthenticated, promptLogin } = useRequireAuth(
    'Login to register as a service provider.',
  );

  const [step, setStep] = useState(1);
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>(null);
  const [isApprovedProvider, setIsApprovedProvider] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || user?.phone || '');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      promptLogin('Login to register as a service provider.', {
        onCancel: () => navigation.goBack(),
      });
      setLoading(false);
      return;
    }

    homeServicesApi.getMyApplication()
      .then((appData) => {
        if (appData?.provider) {
          setIsApprovedProvider(true);
          setApplicationStatus('APPROVED');
        } else if (appData?.application) {
          setIsApprovedProvider(false);
          setApplicationStatus(appData.application.status);
          const app = appData.application;
          setFirstName(app.firstName || user?.firstName || '');
          setLastName(app.lastName || user?.lastName || '');
          setPhone(app.phoneNumber || user?.phoneNumber || '');
          setEmail(app.email || '');
          if (app.latitude != null && app.longitude != null) {
            setLocation({
              latitude: app.latitude,
              longitude: app.longitude,
              address: app.address || '',
              city: app.city || '',
            });
          }
          setBio(app.bio || '');
          setExperience(app.experience || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  const isApproved = isApprovedProvider || applicationStatus === 'APPROVED';

  useEffect(() => {
    if (isApproved) {
      navigation.replace('ServiceProviderDashboard');
    }
  }, [isApproved, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (isApproved) {
        navigation.replace('ServiceProviderDashboard');
      }
    }, [isApproved, navigation]),
  );

  useApprovalRedirect({
    enabled: !isApprovedProvider && (applicationStatus === 'PENDING' || applicationStatus === 'APPROVED'),
    checkApproval: async () => {
      const data = await homeServicesApi.getMyApplication();
      if (data?.provider || data?.application?.status === 'APPROVED') {
        setIsApprovedProvider(true);
        setApplicationStatus('APPROVED');
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => navigation.replace('ServiceProviderDashboard'),
    title: 'Application Approved',
    message: 'You are now an approved service provider. Opening your dashboard…',
  });

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
        Alert.alert('Required', 'Please enter your first name, last name, and phone number.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
        Alert.alert('Required', 'Please pin your business address on the map.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      return;
    }
    navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;
    if (!location) return;

    try {
      setSubmitting(true);
      await homeServicesApi.applyAsProvider({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phone.trim(),
        email: email.trim() || undefined,
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        bio: bio.trim() || undefined,
        experience: experience.trim() || undefined,
      });
      setApplicationStatus('PENDING');
      setIsApprovedProvider(false);
      Alert.alert(
        'Submitted',
        'Your application has been submitted. After approval, add your services and availability from your dashboard.',
      );
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStatusBanner = () => {
    if (applicationStatus === 'APPROVED' || isApprovedProvider) {
      return (
        <View style={[styles.statusBanner, styles.approvedBanner]}>
          <Ionicons name="checkmark-circle-outline" size={22} color="#059669" />
          <View style={styles.statusBannerText}>
            <Text style={styles.approvedTitle}>Application Approved</Text>
            <Text style={styles.approvedSubtitle}>Opening your provider dashboard…</Text>
          </View>
        </View>
      );
    }
    if (applicationStatus === 'PENDING') {
      return (
        <View style={[styles.statusBanner, styles.pendingBanner]}>
          <Ionicons name="time-outline" size={22} color="#F59E0B" />
          <View style={styles.statusBannerText}>
            <Text style={styles.pendingTitle}>Application Pending</Text>
            <Text style={styles.pendingSubtitle}>We are reviewing your application. After approval, add services and availability from your dashboard.</Text>
          </View>
        </View>
      );
    }
    if (applicationStatus === 'REJECTED') {
      return (
        <View style={[styles.statusBanner, styles.rejectedBanner]}>
          <Ionicons name="close-circle-outline" size={22} color="#EF4444" />
          <View style={styles.statusBannerText}>
            <Text style={styles.rejectedTitle}>Application Rejected</Text>
            <Text style={styles.rejectedSubtitle}>You may update and resubmit below</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <Text style={styles.stepSubtitle}>We'll use this to set up your provider profile.</Text>
            <View style={styles.row}>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />
              </View>
              <View style={[styles.field, styles.halfField]}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Phone number" />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="you@email.com" />
            </View>
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Where are you based?</Text>
            <Text style={styles.stepSubtitle}>Customers will see your service area on the map.</Text>
            <LocationPickerField
              value={location}
              onChange={setLocation}
              label="Business Address"
              accent={ACCENT}
            />
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>About you</Text>
            <Text style={styles.stepSubtitle}>After approval, you'll add your services and availability from your dashboard.</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell customers about yourself"
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Experience</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={experience}
                onChangeText={setExperience}
                placeholder="Years of experience, certifications, etc."
                multiline
                numberOfLines={4}
              />
            </View>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>Review</Text>
              <Text style={styles.reviewLine}>{firstName} {lastName}</Text>
              <Text style={styles.reviewLine}>{phone}</Text>
              <Text style={styles.reviewLine}>{location?.address}, {location?.city}</Text>
            </View>
          </>
        );
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Become Property Agent</Text>
          </View>
          <View style={styles.loginPrompt}>
            <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
            <Text style={styles.loginPromptTitle}>Login required</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => promptLogin()}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (isApproved) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Become a Provider</Text>
            </View>
          </View>
          <View style={styles.redirecting}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.redirectingText}>Opening your dashboard…</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const formDisabled = applicationStatus === 'PENDING' || isApprovedProvider;
  const showStepForm = !formDisabled;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FormScreenLayout
        header={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Become a Provider</Text>
              <Text style={styles.headerSubtitle}>Register your professional services</Text>
            </View>
          </View>
        }
        footer={
          showStepForm ? (
            <View style={styles.footer}>
              {step < TOTAL_STEPS ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.nextButtonText}>Submit Application</Text>
                      <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : undefined
        }
      >
        {renderStatusBanner()}

        {applicationStatus === 'PENDING' && (
          <Text style={styles.pendingNote}>
            Your application is under review. You'll be able to manage your profile and bookings once approved.
          </Text>
        )}

        {showStepForm && (
          <>
            <FormStepIndicator
              currentStep={step}
              totalSteps={TOTAL_STEPS}
              labels={STEPS}
              accentColor={ACCENT}
            />
            {renderStepContent()}
          </>
        )}
      </FormScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  stepTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusBannerText: { flex: 1 },
  approvedBanner: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
  approvedTitle: { fontSize: 14, fontWeight: '600', color: '#059669' },
  approvedSubtitle: { fontSize: 12, color: '#047857', marginTop: 2 },
  pendingBanner: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A' },
  pendingTitle: { fontSize: 14, fontWeight: '600', color: '#D97706' },
  pendingSubtitle: { fontSize: 12, color: '#B45309', marginTop: 2 },
  rejectedBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  rejectedTitle: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  rejectedSubtitle: { fontSize: 12, color: '#B91C1C', marginTop: 2 },
  dashboardLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 16,
    gap: 10,
  },
  dashboardLinkText: { flex: 1, fontSize: 14, fontWeight: '600', color: ACCENT },
  pendingNote: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  row: { flexDirection: 'row', gap: 12 },
  field: { marginBottom: 16 },
  halfField: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  categoryChipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  categoryChipText: { fontSize: 13, color: '#374151' },
  categoryChipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  reviewCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginTop: 8,
  },
  reviewTitle: { fontSize: 14, fontWeight: '600', color: '#0369A1', marginBottom: 8 },
  reviewLine: { fontSize: 13, color: '#374151', marginBottom: 4 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 16,
  },
  nextButtonDisabled: { opacity: 0.6 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loginPromptTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  loginPromptSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  loginButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  redirecting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  redirectingText: { fontSize: 15, color: '#6B7280' },
});
