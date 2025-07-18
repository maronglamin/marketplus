import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Alert,
  Image,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native'
import { ArrowLeft, Globe, X, Search } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { initiateLogin, initializeDeviceInfo, clearAllData } from '../api/auth'
import getApi from '../api/config'
import type { AuthStackParamList } from '../navigation/AuthNavigator'
import countryData from '../utils/countryData'; // You will need to create this file with country code/name/flag
import * as Localization from 'expo-localization';

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>

type Country = { name: string; code: string; dial_code: string; flag: string };

export function Login() {
  const navigation = useNavigation<LoginNavigationProp>()
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null); // {name, code, dial_code, flag}
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const countrySheetRef = useRef<BottomSheetModal>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Initialize API and device info on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Clear all data first
        await clearAllData();
        
        // Initialize API and device info in parallel
        await Promise.all([
          getApi(),
          initializeDeviceInfo()
        ])
      } catch (error) {
        console.error('Initialization error:', error)
      }
    }
    initialize()
  }, [])

  function getDeviceCountryCode() {
    try {
      // Try to get the country code from expo-localization
      const locale = (Localization as any).locale;
      console.log('Raw locale from expo-localization:', locale);
      
      if (locale) {
        // e.g. 'en-GM' or 'en_US'
        const match = locale.match(/[-_](\w{2})$/);
        if (match) {
          const countryCode = match[1].toUpperCase();
          console.log('Extracted country code from locale:', countryCode);
          return countryCode;
        }
      }
      
      // Try alternative methods
      const region = (Localization as any).region;
      if (region) {
        console.log('Found region:', region);
        return region.toUpperCase();
      }
      
      // If we can't detect the country, return null to let the component handle it
      console.log('Could not detect country code from device locale');
      return null;
    } catch (error) {
      console.log('Error getting device country code:', error);
      return null;
    }
  }

  // On mount, set default country based on device locale
  useEffect(() => {
    const deviceCountry = getDeviceCountryCode();
    console.log('Detected device country code:', deviceCountry);
    let found = null;
    
    if (deviceCountry) {
      // Try to find the user's actual country
      found = countryData.find((c: Country) => c.code === deviceCountry);
      console.log('Found country for device code:', found?.name);
      
      if (!found) {
        console.log('Country code not found in our data, will default to US');
      }
    }
    
    // If we can't find the user's country in our list, default to US
    if (!found) {
      found = countryData.find((c: Country) => c.code === 'US');
      console.log('Defaulting to US');
    }
    
    if (found) {
      setSelectedCountry(found);
      // Don't set phone input - let user type their number
      console.log('Set default country:', found.name, found.dial_code);
    } else {
      console.log('ERROR: Could not set any default country!');
    }
  }, []);

  // Remove the auto-detection useEffect completely - it's causing the duplication issue

  const formatPhoneNumber = (number: string) => {
    // Remove any non-digit characters
    return number.replace(/\D/g, '');
  };

  const validatePhoneNumber = (number: string) => {
    // Check if the number has at least 7 digits and at most 15 digits
    return number.length >= 7 && number.length <= 15;
  };

  const onSelectCountry = (country: Country) => {
    setSelectedCountry(country);
    // Don't set phone input to country code - let user type their number separately
  }

  const handleLogin = async () => {
    if (!phoneInput) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // The phone input should only contain digits now
    const formattedNumber = phoneInput.replace(/\D/g, '');
    
    if (!validatePhoneNumber(formattedNumber)) {
      Alert.alert(
        'Error',
        'Please enter a valid phone number (7-15 digits)'
      );
      return;
    }

    const fullNumber = `${selectedCountry?.dial_code}${formattedNumber}`;
    console.log('Phone input:', phoneInput);
    console.log('Selected country:', selectedCountry?.dial_code);
    console.log('Formatted number:', formattedNumber);
    console.log('Full number:', fullNumber);

    try {
      setLoading(true);
      const response = await initiateLogin(fullNumber);
      console.log('Login response:', response);

      // Handle different scenarios based on user and device status
      if (!response.isRegistered) {
        // New user - Send OTP and go to verification
        navigation.navigate('PinVerification', { 
          phoneNumber: fullNumber,
          isNewUser: true,
          flow: 'registration' // Indicates this is for new user registration
        });
      } else if (!response.isDeviceVerified) {
        // Existing user with new device - Send OTP for device verification
        navigation.navigate('PinVerification', { 
          phoneNumber: fullNumber,
          isNewUser: false,
          flow: 'device_verification' // Indicates this is for device verification
        });
      } else {
        // Existing user with verified device - Go directly to PIN login
        navigation.navigate('LoginPin');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error.message || 'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            {imageError ? (
              <View style={styles.logoFallback}>
                <Text style={styles.logoText}>SNAP</Text>
              </View>
            ) : (
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
                onError={(error) => {
                  console.error('Failed to load logo:', error.nativeEvent.error);
                  setImageError(true);
                }}
              />
            )}
          </View>
          
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue
          </Text>

                      <View style={styles.inputContainer}>
              <TouchableOpacity onPress={() => countrySheetRef.current?.present()} style={styles.inputIconLeft}>
                {selectedCountry ? (
                  <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                ) : (
                  <Globe size={22} color="#2563EB" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={phoneInput}
                onChangeText={(text) => {
                  // Only allow digits and prevent country code input
                  const cleanText = text.replace(/\D/g, '');
                  setPhoneInput(cleanText);
                }}
                keyboardType="phone-pad"
                placeholder={selectedCountry ? `Phone number` : 'Phone number'}
                maxLength={15}
                editable={!loading}
              />
              {!!phoneInput && (
                <TouchableOpacity onPress={() => {
                  // Clear the input field completely for user to type
                  setPhoneInput('');
                  setSelectedCountry(null);
                }} style={styles.inputIconRight}>
                  <X size={20} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>
          <Text style={styles.helperText}>
            Enter your phone number (7-15 digits)
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !phoneInput && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!phoneInput || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Country Picker Bottom Sheet */}
        <BottomSheetModal
          ref={countrySheetRef}
          index={0}
          snapPoints={["80%"]}
          onDismiss={() => setCountrySheetOpen(false)}
          enablePanDownToClose={true}
          enableOverDrag={false}
          enableHandlePanningGesture={true}
          enableContentPanningGesture={false}
          backgroundStyle={styles.bottomSheetBackground}
          handleIndicatorStyle={styles.bottomSheetIndicator}
        >
          <BottomSheetView style={styles.bottomSheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity 
                onPress={() => countrySheetRef.current?.dismiss()}
                style={styles.closeButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#6B7280" style={{marginRight: 8}} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country"
                value={search}
                onChangeText={setSearch}
                autoFocus={false}
              />
            </View>
            <View style={styles.countryListContainer}>
              <ScrollView 
                style={styles.countryList}
                contentContainerStyle={styles.countryListContent}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={false}
                bounces={false}
                alwaysBounceVertical={false}
                scrollEventThrottle={16}
              >
                {countryData.filter(c =>
                  c.name.toLowerCase().includes(search.toLowerCase()) ||
                  c.dial_code.includes(search)
                ).map(c => (
                  <TouchableOpacity
                    key={c.code}
                    style={styles.countryItem}
                                      onPress={() => {
                    setSelectedCountry(c);
                    countrySheetRef.current?.dismiss();
                    Keyboard.dismiss();
                  }}
                  >
                    <Text style={styles.countryFlag}>{c.flag}</Text>
                    <Text style={styles.countryName}>{c.name}</Text>
                    <Text style={styles.countryCode}>{c.dial_code}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </TouchableWithoutFeedback>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
  },
  logoFallback: {
    width: 80,
    height: 80,
    backgroundColor: '#2563EB',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIconLeft: {
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  inputIconRight: {
    paddingLeft: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  footer: {
    padding: 24,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetIndicator: {
    backgroundColor: '#E5E7EB',
    width: 40,
    height: 4,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 0,
    height: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 8,
  },
  countryList: {
    flex: 1,
  },
  countryListContainer: {
    flex: 1,
    marginTop: 8,
    maxHeight: '100%',
  },
  countryListContent: {
    paddingBottom: 20,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  countryCode: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: 'bold',
  },
}) 