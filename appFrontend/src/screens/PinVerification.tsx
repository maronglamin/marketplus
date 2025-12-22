import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
} from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { verifyOTP, initiateLogin } from '../api/auth'
import * as Device from 'expo-device'
import AsyncStorage from '@react-native-async-storage/async-storage'
import PinInput from '../components/PinInput'
import { AuthStackParamList } from '../navigation/AuthNavigator'
import { useAuth } from '../contexts/AuthContext'

type PinVerificationNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'PinVerification'>
type PinVerificationRouteProp = RouteProp<AuthStackParamList, 'PinVerification'>

export function PinVerification() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendDisabled, setResendDisabled] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const navigation = useNavigation<PinVerificationNavigationProp>()
  const route = useRoute<PinVerificationRouteProp>()
  const { phoneNumber } = route.params
  const { refreshUser } = useAuth()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>
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

  const handleCodeComplete = async (verificationCode: string) => {
    console.log('handleCodeComplete called with code:', verificationCode);
    
    if (verificationCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit code');
      return;
    }

    // Update the code state to match what was entered
    setCode(verificationCode);

    try {
      setLoading(true);
      console.log('Starting verification process with code:', verificationCode);
      
      const { response, isRegistered, isDeviceVerified } = await verifyOTP(phoneNumber, verificationCode);

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

      // Store the token and immediately refresh AuthContext from backend
      await AsyncStorage.setItem('token', response.token);
      console.log('Token stored successfully');
      // Persist user if provided to speed up UI
      if ((response as any)?.user) {
        await AsyncStorage.setItem('user', JSON.stringify((response as any).user));
      }
      try {
        await refreshUser();
      } catch (e) {
        console.log('Auth refresh failed (will proceed):', e);
      }

      // Decide next step based on server flags.
      // Goal:
      // - If user is registered and just needs to enter PIN -> LoginPin
      // - If server requires PIN reset -> NewPin (reset)
      // - If first login -> ChangePin (set new PIN)
      // - If new user -> registration
      let targetScreen: keyof AuthStackParamList;
      let params: any = {};

      if (isRegistered) {
        if ((response as any)?.requiresPinReset) {
          console.log('Registered user requires PIN reset, navigating to NewPin');
          targetScreen = 'NewPin';
          params = {
            currentPin: '0000',
            isPinReset: true,
            pinResetOTPId: (response as any)?.pinResetOTPId,
          };
        } else if ((response as any)?.isFirstLogin) {
          console.log('Registered user first login, navigating to NewPin');
          targetScreen = 'NewPin';
          params = { currentPin: '0000', isFirstTime: true };
        } else if (isDeviceVerified) {
          console.log('Registered user verified, navigating to LoginPin');
          targetScreen = 'LoginPin';
        } else {
          console.log('Registered user defaulting to LoginPin');
          targetScreen = 'LoginPin';
        }
      } else {
        console.log('User is not registered, going to UserRegistration');
        targetScreen = 'UserRegistration';
        params = { phoneNumber };
      }

      // Perform navigation with a small delay to ensure UI updates
      console.log('Navigating to:', targetScreen, 'with params:', params);
      setTimeout(() => {
        navigation.reset({
          index: 0,
          routes: [{ name: targetScreen, params }],
        });
      }, 100);
    } catch (error: any) {
      console.error('Verification failed:', error);
      Alert.alert(
        'Verification Failed',
        error.message || 'Please try again'
      );
      setCode('');
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
          <PinInput
            value={code}
            onChangeText={setCode}
            maxLength={6}
            onComplete={handleCodeComplete}
            style={styles.codeInput}
            editable={!loading}
          />
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Verifying...</Text>
          </View>
        )}

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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 80,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  codeContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 32,
  },
  codeInput: {
    marginBottom: 32,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
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
}); 