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
  Image,
} from 'react-native'
import { ArrowLeft } from 'lucide-react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { loginWithPin, requestNewPin } from '../api/auth'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDeviceInfo } from '../api/auth'
import type { AuthStackParamList } from '../navigation/AuthNavigator'

type LoginPinNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'LoginPin'>
type LoginPinRouteProp = RouteProp<AuthStackParamList, 'LoginPin'>

export function LoginPin() {
  const [pin, setPin] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [imageError, setImageError] = useState(false)
  const inputRefs = useRef<Array<TextInput | null>>([])
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

  const handlePinChange = (text: string, index: number) => {
    if (text.length > 1) {
      text = text.slice(0, 1)
    }

    const newPin = [...pin]
    newPin[index] = text
    setPin(newPin)

    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleLogin = async () => {
    // Validate PIN format
    if (!pin.every(digit => /^\d$/.test(digit))) {
      Alert.alert('Error', 'Please enter a valid 4-digit PIN')
      return
    }

    const pinString = pin.join('')
    if (pinString.length !== 4) {
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
                setPin(['', '', '', ''])
                inputRefs.current[0]?.focus()
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
                          setPin(['', '', '', ''])
                          inputRefs.current[0]?.focus()
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
        setPin(['', '', '', ''])
        inputRefs.current[0]?.focus()
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
          
          <Text style={styles.title}>Enter Your PIN</Text>
          <Text style={styles.subtitle}>
            Please enter your 4-digit PIN to continue
          </Text>

          <View style={styles.pinContainer}>
            {pin.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={styles.pinInput}
                value={digit}
                onChangeText={text => handlePinChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                secureTextEntry
                editable={!loading}
              />
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading || pin.some(digit => !digit)}
            style={[styles.button, (loading || pin.some(digit => !digit)) && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Continue'}
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
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 30,
  },
  pinInput: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 20,
    backgroundColor: '#F9FAFB',
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
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