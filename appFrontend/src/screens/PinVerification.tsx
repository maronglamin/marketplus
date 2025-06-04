import React, { useState, useRef, useEffect } from 'react'
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { verifyOTP, initiateLogin } from '../api/auth'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'

type RootStackParamList = {
  Onboarding: undefined
  Login: undefined
  PinVerification: { phoneNumber: string }
  UserRegistration: { phoneNumber: string }
  LoginPin: undefined
  Home: undefined
  DeviceVerification: undefined
}

type PinVerificationNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PinVerification'>
type PinVerificationRouteProp = RouteProp<RootStackParamList, 'PinVerification'>

export function PinVerification() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const navigation = useNavigation<PinVerificationNavigationProp>()
  const route = useRoute<PinVerificationRouteProp>()
  const { phoneNumber } = route.params

  const inputRefs = useRef<Array<TextInput | null>>([])

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (resendDisabled && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)
    } else if (countdown === 0) {
      setResendDisabled(false)
      setCountdown(60)
    }
    return () => clearInterval(timer)
  }, [resendDisabled, countdown])

  const handleCodeChange = (text: string, index: number) => {
    const newCode = code.split('')
    newCode[index] = text
    setCode(newCode.join(''))

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      console.log('Starting verification process...');
      
      const { response, isRegistered, isDeviceVerified } = await verifyOTP(phoneNumber, code);

      console.log('Verification complete:', {
        isRegistered,
        isDeviceVerified,
        hasToken: !!response.token,
        user: response.user
      });

      // Validate we have a token
      if (!response.token) {
        throw new Error('No authentication token received');
      }

      // Store the token
      await AsyncStorage.setItem('token', response.token);
      console.log('Token stored successfully');

      // Determine navigation based on verification status
      let targetScreen: keyof RootStackParamList;
      let params = {};

      if (isRegistered) {
        if (isDeviceVerified) {
          console.log('User is registered and device is verified, going to LoginPin');
          targetScreen = 'LoginPin';
        } else {
          console.log('User is registered but device is not verified, going to DeviceVerification');
          targetScreen = 'DeviceVerification';
        }
      } else {
        console.log('User is not registered, going to UserRegistration');
        targetScreen = 'UserRegistration';
        params = { phoneNumber };
      }

      // Perform navigation
      console.log('Navigating to:', targetScreen, 'with params:', params);
      navigation.reset({
        index: 0,
        routes: [{ name: targetScreen, params }],
      });
    } catch (error: any) {
      console.error('Verification failed:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendDisabled(true)
      await initiateLogin(phoneNumber)
      Alert.alert('Success', 'A new verification code has been sent')
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to resend code. Please try again.'
      )
    }
  }

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
            <ArrowLeft size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {phoneNumber}
          </Text>

          <View style={styles.codeContainer}>
            {[...Array(6)].map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={styles.codeInput}
                maxLength={1}
                keyboardType="number-pad"
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                value={code[index] || ''}
              />
            ))}
          </View>

          <TouchableOpacity
            onPress={handleVerify}
            disabled={loading || code.length !== 6}
            style={[
              styles.verifyButton,
              (loading || code.length !== 6) && styles.verifyButtonDisabled,
            ]}
          >
            <Text style={styles.verifyButtonText}>
              {loading ? 'Verifying...' : 'Verify'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResendCode}
            disabled={resendDisabled}
            style={styles.resendButton}
          >
            <Text style={[
              styles.resendButtonText,
              resendDisabled && styles.resendButtonTextDisabled
            ]}>
              {resendDisabled
                ? `Resend code in ${countdown}s`
                : 'Resend verification code'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
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
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 56,
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  codeInput: {
    width: 40,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginHorizontal: 4,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: '#F9FAFB',
  },
  verifyButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  verifyButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#2563EB',
    fontSize: 16,
  },
  resendButtonTextDisabled: {
    color: '#93C5FD',
  },
}) 