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
import { loginWithPin, requestNewPin } from '../api/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDeviceInfo } from '../api/auth'
import type { AuthStackParamList } from '../navigation/AuthNavigator'
import PinInput from '../components/PinInput'

type LoginPinNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'LoginPin'>
type LoginPinRouteProp = RouteProp<AuthStackParamList, 'LoginPin'>

export function LoginPin() {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const navigation = useNavigation<LoginPinNavigationProp>()
  const route = useRoute<LoginPinRouteProp>()

  // Prevent going back to login screens after successful login
  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token')
      if (token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'App' }],
        })
      }
    }
    checkAuth()
  }, [])

  const handlePinComplete = async (pinString: string) => {
    // Validate PIN format
    if (!/^\d{4}$/.test(pinString)) {
      Alert.alert('Error', 'Please enter a valid 4-digit PIN')
      return
    }

    try {
      setLoading(true)
      const deviceInfo = await getDeviceInfo()
      const response = await loginWithPin(deviceInfo.deviceId, pinString)

      if (!response.token) {
        throw new Error('No authentication token received')
      }

      // Store the token
      await AsyncStorage.setItem('token', response.token)
      console.log('Login successful, token stored')

      // Check if PIN reset is required
      if (response.requiresPinReset) {
        // Navigate to PIN reset flow
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'NewPin',
            params: { 
              currentPin: pinString,
              isPinReset: true,
              pinResetOTPId: response.pinResetOTPId
            }
          }],
        })
      } else if (response.isFirstLogin) {
        // Navigate to PIN change flow
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'ChangePin',
            params: { isFirstTime: true }
          }],
        })
      } else {
        // Navigate to App navigator
        navigation.reset({
          index: 0,
          routes: [{ name: 'App' }],
        })
      }
    } catch (error: any) {
      console.error('Login error:', error)
      
      if (error.message === 'INVALID_PIN_CONFIRM') {
        // Show confirmation dialog for new PIN
        Alert.alert(
          'Invalid PIN',
          'Would you like to receive a new PIN?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setPin('')
              }
            },
            {
              text: 'Get New PIN',
              onPress: async () => {
                try {
                  setLoading(true)
                  const deviceInfo = await getDeviceInfo()
                  await requestNewPin(deviceInfo.deviceId)
                  Alert.alert(
                    'Success',
                    'A new PIN has been sent to your phone.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          setPin('')
                        }
                      }
                    ]
                  )
                } catch (error: any) {
                  Alert.alert(
                    'Error',
                    error.message || 'Failed to send new PIN. Please try again.'
                  )
                } finally {
                  setLoading(false)
                }
              }
            }
          ]
        )
      } else {
        Alert.alert(
          'Login Failed',
          error.message || 'Please try again'
        )
        // Clear PIN on error
        setPin('')
      }
    } finally {
      setLoading(false)
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
        <Text style={styles.title}>Enter Your PIN</Text>
        <Text style={styles.subtitle}>
          Please enter your 4-digit PIN to continue
        </Text>

        <View style={styles.pinContainer}>
          <PinInput
            value={pin}
            onChangeText={setPin}
            maxLength={4}
            onComplete={handlePinComplete}
            style={styles.pinInput}
          />
        </View>
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
  pinContainer: {
    width: '100%',
    maxWidth: 300,
  },
  pinInput: {
    marginBottom: 32,
  },
}); 