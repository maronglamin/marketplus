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

type SellerKycAddressNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerKycAddress'>;
type SellerKycAddressRouteProp = RouteProp<AppStackParamList, 'SellerKycAddress'>;

type AddressData = {
  address: string;
  city: string;
  state: string;
  countries: string[];
  postalCode: string;
};

export function SellerKycAddress() {
  const navigation = useNavigation<SellerKycAddressNavigationProp>();
  const route = useRoute<SellerKycAddressRouteProp>();
  const { businessData, existingData } = route.params;

  const [formData, setFormData] = useState<AddressData>({
    address: '',
    city: '',
    state: '',
    countries: [],
    postalCode: '',
  });

  const [errors, setErrors] = useState({
    address: '',
    city: '',
    countries: '',
  });

  // Pre-populate form data if existing data is available
  useEffect(() => {
    if (existingData) {
      console.log('Existing KYC data:', existingData); // Debug log
      setFormData({
        address: existingData.address || '',
        city: existingData.city || '',
        state: existingData.state || '',
        countries: Array.isArray(existingData.country) ? existingData.country : [], // Handle both array and single value
        postalCode: existingData.postalCode || '',
      });
    }
  }, [existingData]);

  const validateForm = () => {
    const newErrors = {
      address: '',
      city: '',
      countries: '',
    };
    let isValid = true;

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
      isValid = false;
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
      isValid = false;
    }

    if (formData.countries.length === 0) {
      newErrors.countries = 'At least one country is required';
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

    console.log('Navigating to verification with data:', {
      businessData,
      addressData: formData,
      existingData,
    }); // Debug log

    navigation.navigate('SellerKycVerification', {
      businessData,
      addressData: formData,
      existingData,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
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
          <Text style={styles.title}>Address Information</Text>
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
                <View style={styles.progressStep}>
                  <Text style={styles.progressNumber}>1</Text>
                </View>
                <View style={[styles.progressLine, styles.activeLine]} />
                <View style={[styles.progressStep, styles.activeStep]}>
                  <Text style={styles.progressNumber}>2</Text>
                </View>
                <View style={styles.progressLine} />
                <View style={styles.progressStep}>
                  <Text style={styles.progressNumber}>3</Text>
                </View>
              </View>

              <Text style={styles.subtitle}>Where is your business located?</Text>

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
                <Text style={styles.sectionTitle}>Business Address</Text>
                <Input
                  label="Street Address"
                  value={formData.address}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, address: text });
                    if (errors.address) {
                      setErrors({ ...errors, address: '' });
                    }
                  }}
                  placeholder="Enter your street address"
                  error={errors.address}
                />
                <Input
                  label="City"
                  value={formData.city}
                  onChangeText={(text: string) => {
                    setFormData({ ...formData, city: text });
                    if (errors.city) {
                      setErrors({ ...errors, city: '' });
                    }
                  }}
                  placeholder="Enter your city"
                  error={errors.city}
                />
                <Input
                  label="State/Province (Optional)"
                  value={formData.state}
                  onChangeText={(text: string) => setFormData({ ...formData, state: text })}
                  placeholder="Enter your state or province"
                />
                <Select
                  label="Countries"
                  value={formData.countries}
                  onValueChange={(value) => {
                    if (Array.isArray(value)) {
                      setFormData({ ...formData, countries: value });
                      if (errors.countries) {
                        setErrors({ ...errors, countries: '' });
                      }
                    }
                  }}
                  items={[
                    { label: 'Afghanistan', value: 'AF' }, { label: 'Albania', value: 'AL' }, { label: 'Algeria', value: 'DZ' },
                    { label: 'Andorra', value: 'AD' }, { label: 'Angola', value: 'AO' }, { label: 'Antigua and Barbuda', value: 'AG' },
                    { label: 'Argentina', value: 'AR' }, { label: 'Armenia', value: 'AM' }, { label: 'Australia', value: 'AU' },
                    { label: 'Austria', value: 'AT' }, { label: 'Azerbaijan', value: 'AZ' }, { label: 'Bahamas', value: 'BS' },
                    { label: 'Bahrain', value: 'BH' }, { label: 'Bangladesh', value: 'BD' }, { label: 'Barbados', value: 'BB' },
                    { label: 'Belarus', value: 'BY' }, { label: 'Belgium', value: 'BE' }, { label: 'Belize', value: 'BZ' },
                    { label: 'Benin', value: 'BJ' }, { label: 'Bhutan', value: 'BT' }, { label: 'Bolivia', value: 'BO' },
                    { label: 'Bosnia and Herzegovina', value: 'BA' }, { label: 'Botswana', value: 'BW' }, { label: 'Brazil', value: 'BR' },
                    { label: 'Brunei', value: 'BN' }, { label: 'Bulgaria', value: 'BG' }, { label: 'Burkina Faso', value: 'BF' },
                    { label: 'Burundi', value: 'BI' }, { label: 'Cabo Verde', value: 'CV' }, { label: 'Cambodia', value: 'KH' },
                    { label: 'Cameroon', value: 'CM' }, { label: 'Canada', value: 'CA' }, { label: 'Central African Republic', value: 'CF' },
                    { label: 'Chad', value: 'TD' }, { label: 'Chile', value: 'CL' }, { label: 'China', value: 'CN' },
                    { label: 'Colombia', value: 'CO' }, { label: 'Comoros', value: 'KM' }, { label: 'Congo', value: 'CG' },
                    { label: 'Costa Rica', value: 'CR' }, { label: 'Croatia', value: 'HR' }, { label: 'Cuba', value: 'CU' },
                    { label: 'Cyprus', value: 'CY' }, { label: 'Czech Republic', value: 'CZ' }, { label: 'Denmark', value: 'DK' },
                    { label: 'Djibouti', value: 'DJ' }, { label: 'Dominica', value: 'DM' }, { label: 'Dominican Republic', value: 'DO' },
                    { label: 'Ecuador', value: 'EC' }, { label: 'Egypt', value: 'EG' }, { label: 'El Salvador', value: 'SV' },
                    { label: 'Equatorial Guinea', value: 'GQ' }, { label: 'Eritrea', value: 'ER' }, { label: 'Estonia', value: 'EE' },
                    { label: 'Eswatini', value: 'SZ' }, { label: 'Ethiopia', value: 'ET' }, { label: 'Fiji', value: 'FJ' },
                    { label: 'Finland', value: 'FI' }, { label: 'France', value: 'FR' }, { label: 'Gabon', value: 'GA' },
                    { label: 'Gambia', value: 'GM' }, { label: 'Georgia', value: 'GE' }, { label: 'Germany', value: 'DE' },
                    { label: 'Ghana', value: 'GH' }, { label: 'Greece', value: 'GR' }, { label: 'Grenada', value: 'GD' },
                    { label: 'Guatemala', value: 'GT' }, { label: 'Guinea', value: 'GN' }, { label: 'Guinea-Bissau', value: 'GW' },
                    { label: 'Guyana', value: 'GY' }, { label: 'Haiti', value: 'HT' }, { label: 'Honduras', value: 'HN' },
                    { label: 'Hungary', value: 'HU' }, { label: 'Iceland', value: 'IS' }, { label: 'India', value: 'IN' },
                    { label: 'Indonesia', value: 'ID' }, { label: 'Iran', value: 'IR' }, { label: 'Iraq', value: 'IQ' },
                    { label: 'Ireland', value: 'IE' }, { label: 'Israel', value: 'IL' }, { label: 'Italy', value: 'IT' },
                    { label: 'Jamaica', value: 'JM' }, { label: 'Japan', value: 'JP' }, { label: 'Jordan', value: 'JO' },
                    { label: 'Kazakhstan', value: 'KZ' }, { label: 'Kenya', value: 'KE' }, { label: 'Kiribati', value: 'KI' },
                    { label: 'Kuwait', value: 'KW' }, { label: 'Kyrgyzstan', value: 'KG' }, { label: 'Laos', value: 'LA' },
                    { label: 'Latvia', value: 'LV' }, { label: 'Lebanon', value: 'LB' }, { label: 'Lesotho', value: 'LS' },
                    { label: 'Liberia', value: 'LR' }, { label: 'Libya', value: 'LY' }, { label: 'Liechtenstein', value: 'LI' },
                    { label: 'Lithuania', value: 'LT' }, { label: 'Luxembourg', value: 'LU' }, { label: 'Madagascar', value: 'MG' },
                    { label: 'Malawi', value: 'MW' }, { label: 'Malaysia', value: 'MY' }, { label: 'Maldives', value: 'MV' },
                    { label: 'Mali', value: 'ML' }, { label: 'Malta', value: 'MT' }, { label: 'Marshall Islands', value: 'MH' },
                    { label: 'Mauritania', value: 'MR' }, { label: 'Mauritius', value: 'MU' }, { label: 'Mexico', value: 'MX' },
                    { label: 'Micronesia', value: 'FM' }, { label: 'Moldova', value: 'MD' }, { label: 'Monaco', value: 'MC' },
                    { label: 'Mongolia', value: 'MN' }, { label: 'Montenegro', value: 'ME' }, { label: 'Morocco', value: 'MA' },
                    { label: 'Mozambique', value: 'MZ' }, { label: 'Myanmar', value: 'MM' }, { label: 'Namibia', value: 'NA' },
                    { label: 'Nauru', value: 'NR' }, { label: 'Nepal', value: 'NP' }, { label: 'Netherlands', value: 'NL' },
                    { label: 'New Zealand', value: 'NZ' }, { label: 'Nicaragua', value: 'NI' }, { label: 'Niger', value: 'NE' },
                    { label: 'Nigeria', value: 'NG' }, { label: 'North Korea', value: 'KP' }, { label: 'North Macedonia', value: 'MK' },
                    { label: 'Norway', value: 'NO' }, { label: 'Oman', value: 'OM' }, { label: 'Pakistan', value: 'PK' },
                    { label: 'Palau', value: 'PW' }, { label: 'Palestine', value: 'PS' }, { label: 'Panama', value: 'PA' },
                    { label: 'Papua New Guinea', value: 'PG' }, { label: 'Paraguay', value: 'PY' }, { label: 'Peru', value: 'PE' },
                    { label: 'Philippines', value: 'PH' }, { label: 'Poland', value: 'PL' }, { label: 'Portugal', value: 'PT' },
                    { label: 'Qatar', value: 'QA' }, { label: 'Romania', value: 'RO' }, { label: 'Russia', value: 'RU' },
                    { label: 'Rwanda', value: 'RW' }, { label: 'Saint Kitts and Nevis', value: 'KN' }, { label: 'Saint Lucia', value: 'LC' },
                    { label: 'Saint Vincent and the Grenadines', value: 'VC' }, { label: 'Samoa', value: 'WS' }, { label: 'San Marino', value: 'SM' },
                    { label: 'Sao Tome and Principe', value: 'ST' }, { label: 'Saudi Arabia', value: 'SA' }, { label: 'Senegal', value: 'SN' },
                    { label: 'Serbia', value: 'RS' }, { label: 'Seychelles', value: 'SC' }, { label: 'Sierra Leone', value: 'SL' },
                    { label: 'Singapore', value: 'SG' }, { label: 'Slovakia', value: 'SK' }, { label: 'Slovenia', value: 'SI' },
                    { label: 'Solomon Islands', value: 'SB' }, { label: 'Somalia', value: 'SO' }, { label: 'South Africa', value: 'ZA' },
                    { label: 'South Korea', value: 'KR' }, { label: 'South Sudan', value: 'SS' }, { label: 'Spain', value: 'ES' },
                    { label: 'Sri Lanka', value: 'LK' }, { label: 'Sudan', value: 'SD' }, { label: 'Suriname', value: 'SR' },
                    { label: 'Sweden', value: 'SE' }, { label: 'Switzerland', value: 'CH' }, { label: 'Syria', value: 'SY' },
                    { label: 'Taiwan', value: 'TW' }, { label: 'Tajikistan', value: 'TJ' }, { label: 'Tanzania', value: 'TZ' },
                    { label: 'Thailand', value: 'TH' }, { label: 'Timor-Leste', value: 'TL' }, { label: 'Togo', value: 'TG' },
                    { label: 'Tonga', value: 'TO' }, { label: 'Trinidad and Tobago', value: 'TT' }, { label: 'Tunisia', value: 'TN' },
                    { label: 'Turkey', value: 'TR' }, { label: 'Turkmenistan', value: 'TM' }, { label: 'Tuvalu', value: 'TV' },
                    { label: 'Uganda', value: 'UG' }, { label: 'Ukraine', value: 'UA' }, { label: 'United Arab Emirates', value: 'AE' },
                    { label: 'United Kingdom', value: 'GB' }, { label: 'United States', value: 'US' }, { label: 'Uruguay', value: 'UY' },
                    { label: 'Uzbekistan', value: 'UZ' }, { label: 'Vanuatu', value: 'VU' }, { label: 'Vatican City', value: 'VA' },
                    { label: 'Venezuela', value: 'VE' }, { label: 'Vietnam', value: 'VN' }, { label: 'Yemen', value: 'YE' },
                    { label: 'Zambia', value: 'ZM' }, { label: 'Zimbabwe', value: 'ZW' }
                  ]}
                  error={errors.countries}
                  multiple
                />
                <Input
                  label="Postal Code (Optional)"
                  value={formData.postalCode}
                  onChangeText={(text: string) => setFormData({ ...formData, postalCode: text })}
                  placeholder="Enter your postal code"
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
  activeLine: {
    backgroundColor: '#2563EB',
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