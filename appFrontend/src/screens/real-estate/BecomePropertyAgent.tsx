import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyListingType } from '../../services/realEstateApi';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { FormScreenLayout } from '../../components/FormScreenLayout';
import { LocationPickerField } from '../../components/LocationPickerField';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { ID_TYPES, isAddressProofRecent, pickAndUploadDocument } from '../../utils/propertyFormHelpers';

const ACCENT = '#7C3AED';
const STEPS = ['Personal Info', 'Specializations', 'Location', 'Legal & ID', 'Proof of Address', 'Banking', 'About You', 'Review'];
const TOTAL_STEPS = STEPS.length;

const SPECIALIZATION_OPTIONS: { value: PropertyListingType; label: string }[] = [
  { value: 'HOTEL', label: 'Hotels' },
  { value: 'APARTMENT_RENTAL', label: 'Apartments' },
  { value: 'GUEST_HOUSE', label: 'Guest House & Lodge' },
  { value: 'BOAT_TRIP', label: 'Leisure & Trips (Boat Trip)' },
  { value: 'HOME_SALE', label: 'Home Sales' },
  { value: 'LAND_SALE', label: 'Land Sales' },
];

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'BecomePropertyAgent'>;
type BecomeRoute = RouteProp<RealEstateStackParamList, 'BecomePropertyAgent'>;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#FEF3C7', text: '#D97706' },
  APPROVED: { bg: '#D1FAE5', text: '#059669' },
  REJECTED: { bg: '#FEE2E2', text: '#DC2626' },
};

export function BecomePropertyAgent() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<BecomeRoute>();
  const section = route.params?.section ?? 'all';
  const headerTitle =
    section === 'stay' ? 'Become a Hospitality Partner' : 'Become a Property Agent';
  const { user, isLoading: authLoading, isAuthenticated, promptLogin } = useRequireAuth(
    'Login to register as a property agent.',
  );

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [application, setApplication] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [specializationTypes, setSpecializationTypes] = useState<PropertyListingType[]>([]);
  const [bio, setBio] = useState('');

  const [idType, setIdType] = useState<'PASSPORT' | 'DRIVERS_LICENSE'>('PASSPORT');
  const [idNumber, setIdNumber] = useState('');
  const [idDocumentUrl, setIdDocumentUrl] = useState('');
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('');
  const [businessRegistrationDocUrl, setBusinessRegistrationDocUrl] = useState('');
  const [taxIdentificationNumber, setTaxIdentificationNumber] = useState('');

  const [addressProofUrl, setAddressProofUrl] = useState('');
  const [addressProofDate, setAddressProofDate] = useState('');
  const [showAddressProofDatePicker, setShowAddressProofDatePicker] = useState(false);

  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankBranch, setBankBranch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      promptLogin('Login to register as a property agent.', { onCancel: () => navigation.goBack() });
      setLoading(false);
      return;
    }

    realEstateApi.getMyApplication()
      .then((data) => {
        setApplication(data?.application ?? null);
        setAgent(data?.agent ?? null);
        const app = data?.application;
        if (app) {
          setFirstName(app.firstName || user?.firstName || '');
          setLastName(app.lastName || user?.lastName || '');
          setPhoneNumber(app.phoneNumber || user?.phoneNumber || '');
          setEmail(app.email || '');
          setCompanyName(app.companyName || '');
          setLicenseNumber(app.licenseNumber || '');
          if (app.latitude != null && app.longitude != null) {
            setLocation({
              latitude: app.latitude,
              longitude: app.longitude,
              address: app.address || '',
              city: app.city || '',
            });
          }
          setSpecializationTypes(app.specializationTypes || []);
          setBio(app.bio || '');
          setIdType(app.idType || 'PASSPORT');
          setIdNumber(app.idNumber || '');
          setIdDocumentUrl(app.idDocumentUrl || '');
          setBusinessRegistrationNumber(app.businessRegistrationNumber || '');
          setBusinessRegistrationDocUrl(app.businessRegistrationDocUrl || '');
          setTaxIdentificationNumber(app.taxIdentificationNumber || '');
          setAddressProofUrl(app.addressProofUrl || '');
          setAddressProofDate(app.addressProofDate ? app.addressProofDate.slice(0, 10) : '');
          const banking = app.bankingInfo || {};
          setBankName(banking.bankName || '');
          setAccountName(banking.accountName || '');
          setAccountNumber(banking.accountNumber || '');
          setBankBranch(banking.bankBranch || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated]);

  const isApprovedAgent = !!agent || application?.status === 'APPROVED';

  useEffect(() => {
    if (isApprovedAgent) {
      navigation.replace('ManageListings');
    }
  }, [isApprovedAgent, navigation]);

  useFocusEffect(
    useCallback(() => {
      if (isApprovedAgent) {
        navigation.replace('ManageListings');
      }
    }, [isApprovedAgent, navigation]),
  );

  useApprovalRedirect({
    enabled: !agent && (application?.status === 'PENDING' || application?.status === 'APPROVED'),
    checkApproval: async () => {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        if (data.agent) setAgent(data.agent);
        setApplication(data.application ?? null);
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => navigation.replace('ManageListings'),
    title: 'Application Approved',
    message: 'You are now an approved property agent. Opening your dashboard…',
  });

  const canApply = !application || application.status === 'REJECTED';
  const showStatusCard = application && application.status !== 'APPROVED';

  const uploadDoc = async (setter: (url: string) => void, label: string) => {
    setUploading(true);
    const url = await pickAndUploadDocument(label);
    setUploading(false);
    if (url) setter(url);
  };

  const sixMonthsAgo = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const addressProofDateValue = addressProofDate ? new Date(`${addressProofDate}T12:00:00`) : new Date();

  const toggleSpecialization = (type: PropertyListingType) => {
    setSpecializationTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const validateStep = (currentStep: number): boolean => {
    switch (currentStep) {
      case 1:
        if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim()) {
          Alert.alert('Required', 'Enter your first name, last name, and phone number.');
          return false;
        }
        break;
      case 2:
        if (specializationTypes.length === 0) {
          Alert.alert('Required', 'Select at least one property specialization.');
          return false;
        }
        break;
      case 3:
        if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
          Alert.alert('Required', 'Pin your business address on the map and enter the city.');
          return false;
        }
        break;
      case 4:
        if (!idNumber.trim() || !idDocumentUrl) {
          Alert.alert('Required', 'Upload a valid government-issued ID and enter the ID number.');
          return false;
        }
        if (!businessRegistrationNumber.trim() || !businessRegistrationDocUrl) {
          Alert.alert('Required', 'Provide business registration number and upload the document.');
          return false;
        }
        break;
      case 5:
        if (!addressProofUrl) {
          Alert.alert('Required', 'Upload a recent utility bill or bank statement.');
          return false;
        }
        if (!addressProofDate) {
          Alert.alert('Required', 'Enter the date on your proof of address document.');
          return false;
        }
        if (!isAddressProofRecent(addressProofDate)) {
          Alert.alert('Document too old', 'Proof of address must be less than 6 months old and match your business address.');
          return false;
        }
        break;
      case 6:
        if (!bankName.trim() || !accountName.trim() || !accountNumber.trim()) {
          Alert.alert('Required', 'Enter complete bank account details to receive payouts.');
          return false;
        }
        break;
      default:
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4) || !validateStep(5) || !validateStep(6)) return;
    if (!location) return;

    try {
      setSubmitting(true);
      await realEstateApi.applyAsAgent({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim() || undefined,
        companyName: companyName.trim() || undefined,
        licenseNumber: licenseNumber.trim() || undefined,
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        specializationTypes,
        bio: bio.trim() || undefined,
        idType,
        idNumber: idNumber.trim(),
        idDocumentUrl,
        businessRegistrationNumber: businessRegistrationNumber.trim(),
        businessRegistrationDocUrl,
        taxIdentificationNumber: taxIdentificationNumber.trim() || undefined,
        addressProofUrl,
        addressProofDate,
        bankingInfo: {
          bankName: bankName.trim(),
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          bankBranch: bankBranch.trim() || undefined,
        },
      });
      Alert.alert('Application Submitted', 'Your application is under review.');
      const data = await realEstateApi.getMyApplication();
      setApplication(data?.application ?? null);
      setAgent(data?.agent ?? null);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  const DocUploadButton = ({ label, uploaded, onPress }: { label: string; uploaded: boolean; onPress: () => void }) => (
    <TouchableOpacity style={[styles.uploadButton, uploaded && styles.uploadButtonDone]} onPress={onPress} disabled={uploading}>
      <Ionicons name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'} size={20} color={uploaded ? '#059669' : ACCENT} />
      <Text style={[styles.uploadButtonText, uploaded && styles.uploadButtonTextDone]}>{uploaded ? `${label} uploaded` : `Upload ${label}`}</Text>
    </TouchableOpacity>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Personal contact</Text>
            <Text style={styles.stepSubtitle}>Your contact details as the property agent.</Text>
            <Text style={styles.label}>First Name *</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
            <Text style={styles.label}>Last Name *</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
            <Text style={styles.label}>Phone Number *</Text>
            <TextInput style={styles.input} value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" />
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Property specializations</Text>
            <Text style={styles.stepSubtitle}>What types of properties do you represent? Select all that apply.</Text>
            <View style={styles.chipRow}>
              {SPECIALIZATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.chip, specializationTypes.includes(opt.value) && styles.chipSelected]}
                  onPress={() => toggleSpecialization(opt.value)}
                >
                  <Text style={[styles.chipText, specializationTypes.includes(opt.value) && styles.chipTextSelected]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.stepTitle}>Business location</Text>
            <Text style={styles.stepSubtitle}>Pin your office or primary business address on the map.</Text>
            <LocationPickerField
              value={location}
              onChange={setLocation}
              label="Business Address"
              accent={ACCENT}
            />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Legal & identity verification (KYP)</Text>
            <Text style={styles.stepSubtitle}>Government ID, business registration, and tax ID if applicable.</Text>
            <Text style={styles.label}>ID Type *</Text>
            <View style={styles.chipRow}>
              {ID_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, idType === t.value && styles.chipSelected]}
                  onPress={() => setIdType(t.value)}
                >
                  <Text style={[styles.chipText, idType === t.value && styles.chipTextSelected]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>ID Number *</Text>
            <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} />
            <DocUploadButton label="ID Document" uploaded={!!idDocumentUrl} onPress={() => uploadDoc(setIdDocumentUrl, 'ID document')} />
            <Text style={styles.label}>Business Registration Number *</Text>
            <TextInput style={styles.input} value={businessRegistrationNumber} onChangeText={setBusinessRegistrationNumber} />
            <DocUploadButton label="Business Registration" uploaded={!!businessRegistrationDocUrl} onPress={() => uploadDoc(setBusinessRegistrationDocUrl, 'business registration')} />
            <Text style={styles.label}>Tax Identification Number (if applicable)</Text>
            <TextInput style={styles.input} value={taxIdentificationNumber} onChangeText={setTaxIdentificationNumber} />
          </>
        );
      case 5:
        return (
          <>
            <Text style={styles.stepTitle}>Proof of address</Text>
            <Text style={styles.stepSubtitle}>A utility bill or bank statement (less than 6 months old) matching your business address.</Text>
            <DocUploadButton label="Utility Bill / Bank Statement" uploaded={!!addressProofUrl} onPress={() => uploadDoc(setAddressProofUrl, 'proof of address')} />
            <Text style={styles.label}>Document Date *</Text>
            <TouchableOpacity
              style={styles.dateField}
              onPress={() => setShowAddressProofDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={ACCENT} />
              <Text style={[styles.dateText, !addressProofDate && styles.datePlaceholder]}>
                {addressProofDate
                  ? format(new Date(`${addressProofDate}T12:00:00`), 'MMM d, yyyy')
                  : 'Select document date'}
              </Text>
            </TouchableOpacity>
            {showAddressProofDatePicker && (
              <DateTimePicker
                value={addressProofDateValue}
                mode="date"
                maximumDate={new Date()}
                minimumDate={sixMonthsAgo}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, date) => {
                  setShowAddressProofDatePicker(Platform.OS === 'ios');
                  if (date) {
                    setAddressProofDate(format(date, 'yyyy-MM-dd'));
                  }
                }}
              />
            )}
            <Text style={styles.hint}>Must be dated within the last 6 months.</Text>
          </>
        );
      case 6:
        return (
          <>
            <Text style={styles.stepTitle}>Banking information</Text>
            <Text style={styles.stepSubtitle}>Bank account details to receive payouts from bookings.</Text>
            <Text style={styles.label}>Bank Name *</Text>
            <TextInput style={styles.input} value={bankName} onChangeText={setBankName} />
            <Text style={styles.label}>Account Holder Name *</Text>
            <TextInput style={styles.input} value={accountName} onChangeText={setAccountName} />
            <Text style={styles.label}>Account Number *</Text>
            <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} keyboardType="number-pad" />
            <Text style={styles.label}>Branch (optional)</Text>
            <TextInput style={styles.input} value={bankBranch} onChangeText={setBankBranch} />
          </>
        );
      case 7:
        return (
          <>
            <Text style={styles.stepTitle}>About your business</Text>
            <Text style={styles.label}>Company / Hotel Name</Text>
            <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} />
            <Text style={styles.label}>License Number</Text>
            <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} />
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, styles.textArea]} value={bio} onChangeText={setBio} multiline numberOfLines={4} textAlignVertical="top" placeholder="Tell us about your hotel experience..." />
          </>
        );
      case 8:
        return (
          <>
            <Text style={styles.stepTitle}>Review & submit</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLine}>{firstName} {lastName} · {phoneNumber}</Text>
              <Text style={styles.reviewLine}>
                Specializations: {specializationTypes.map((t) => SPECIALIZATION_OPTIONS.find((o) => o.value === t)?.label).join(', ')}
              </Text>
              {location && <Text style={styles.reviewLine}>{location.address}, {location.city}</Text>}
              <Text style={styles.reviewLine}>ID: {ID_TYPES.find((t) => t.value === idType)?.label} · {idNumber}</Text>
              <Text style={styles.reviewLine}>Business Reg: {businessRegistrationNumber}</Text>
              {taxIdentificationNumber ? <Text style={styles.reviewLine}>TIN: {taxIdentificationNumber}</Text> : null}
              <Text style={styles.reviewLine}>Address proof: {addressProofDate ? format(new Date(`${addressProofDate}T12:00:00`), 'MMM d, yyyy') : '—'}</Text>
              <Text style={styles.reviewLine}>Bank: {bankName} · {accountNumber}</Text>
            </View>
            {location && (
              <View style={{ marginTop: 12 }}>
                <LocationMapPreview location={location} city={location.city} accent={ACCENT} showDirections={false} />
              </View>
            )}
          </>
        );
      default:
        return null;
    }
  };

  if (authLoading || loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={ACCENT} /></View>;
  }

  if (isApprovedAgent) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.redirectText}>Opening your dashboard…</Text>
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
            <Text style={styles.headerTitle}>{headerTitle}</Text>
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

  const statusStyle = application ? STATUS_COLORS[application.status] || STATUS_COLORS.PENDING : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FormScreenLayout
        header={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </View>
        }
        footer={
          canApply ? (
            <View style={styles.footer}>
              {step < TOTAL_STEPS ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.nextButton, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting || uploading}>
                  {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.nextButtonText}>Submit Application</Text>}
                </TouchableOpacity>
              )}
            </View>
          ) : undefined
        }
      >
        {showStatusCard && statusStyle && (
          <View style={[styles.statusCard, { backgroundColor: statusStyle.bg }]}>
            <Ionicons name={application.status === 'REJECTED' ? 'close-circle' : 'time'} size={24} color={statusStyle.text} />
            <View style={styles.statusText}>
              <Text style={[styles.statusTitle, { color: statusStyle.text }]}>
                {application.status === 'PENDING' ? 'Application pending' : `Application ${application.status}`}
              </Text>
              {application.status === 'PENDING' && <Text style={styles.statusSubtitle}>We'll notify you once reviewed.</Text>}
            </View>
          </View>
        )}

        {canApply && (
          <>
            <FormStepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={STEPS} accentColor={ACCENT} />
            {uploading && <ActivityIndicator color={ACCENT} style={{ marginBottom: 12 }} />}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  redirectText: { fontSize: 15, color: '#6B7280', marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  stepTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 16, lineHeight: 20 },
  statusCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, marginBottom: 16 },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '600' },
  statusSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  manageButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: '#F5F3FF', borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE', marginBottom: 20 },
  manageButtonText: { flex: 1, fontSize: 14, fontWeight: '600', color: ACCENT },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 10 },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  input: { padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 15, color: '#1F2937' },
  dateField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: { fontSize: 15, color: '#1F2937' },
  datePlaceholder: { color: '#9CA3AF' },
  textArea: { minHeight: 100 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  chipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, color: '#374151' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#F5F3FF', marginTop: 8 },
  uploadButtonDone: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
  uploadButtonText: { fontSize: 14, fontWeight: '500', color: ACCENT },
  uploadButtonTextDone: { color: '#059669' },
  reviewCard: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#DDD6FE' },
  reviewLine: { fontSize: 14, color: '#374151', marginBottom: 6 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14 },
  submitDisabled: { opacity: 0.7 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  loginPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loginPromptTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  loginButton: { marginTop: 24, backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
