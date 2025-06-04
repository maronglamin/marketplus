import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal'
import { initiateLogin, initializeDeviceInfo, clearAllData } from '../api/auth'
import getApi from '../api/config'
import type { AuthStackParamList } from '../navigation/AuthNavigator'

type LoginNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>

export function Login() {
  const navigation = useNavigation<LoginNavigationProp>()
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState<CountryCode>('GM')
  const [callingCode, setCallingCode] = useState('220')
  const [loading, setLoading] = useState(false)
  const [showCountryPicker, setShowCountryPicker] = useState(false)

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

  const formatPhoneNumber = (number: string) => {
    // Remove any non-digit characters
    return number.replace(/\D/g, '');
  };

  const validatePhoneNumber = (number: string) => {
    // Check if the number has at least 7 digits and at most 15 digits
    return number.length >= 7 && number.length <= 15;
  };

  const onSelectCountry = (country: Country) => {
    setCallingCode(country.callingCode[0])
    setCountryCode(country.cca2)
  }

  const handleLogin = async () => {
    if (!phoneNumber) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    const formattedNumber = formatPhoneNumber(phoneNumber);
    if (!validatePhoneNumber(formattedNumber)) {
      Alert.alert(
        'Error',
        'Please enter a valid phone number (7-15 digits)'
      );
      return;
    }

    const fullNumber = `+${callingCode}${formattedNumber}`;
    console.log('Attempting login with number:', fullNumber);

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
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Enter your phone number to continue
          </Text>

          <View style={styles.inputContainer}>
            <TouchableOpacity
              onPress={() => setShowCountryPicker(true)}
              style={styles.countryCodeButton}
            >
              <Text style={styles.countryCode}>+{callingCode}</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={15}
              editable={!loading}
            />
          </View>
          <Text style={styles.helperText}>
            Enter your phone number without the country code (7-15 digits)
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !phoneNumber && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!phoneNumber || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        <CountryPicker
          withFilter
          withFlag
          withCallingCode
          withEmoji
          countryCode={countryCode}
          onSelect={onSelectCountry}
          visible={showCountryPicker}
          onClose={() => setShowCountryPicker(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  countryCodeButton: {
    paddingRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  countryCode: {
    fontSize: 16,
    color: '#111827',
    marginRight: 8,
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
}) 