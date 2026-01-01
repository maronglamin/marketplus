import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import PinInput from '../components/PinInput';
import { completePinReset } from '../api/auth';

interface RouteParams {
  currentPin: string;
  newPin: string;
  isFirstTime?: boolean;
  isPinReset?: boolean;
  pinResetOTPId?: string;
}

type ConfirmPinNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ConfirmPin'>;

const ConfirmPin = () => {
  const navigation = useNavigation<ConfirmPinNavigationProp>();
  const { changePin, logout } = useAuth();
  const route = useRoute();
  const { currentPin, newPin, isFirstTime, isPinReset, pinResetOTPId } = (route.params || {}) as RouteParams;
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownSuccess, setHasShownSuccess] = useState(false);

  const handlePinComplete = async (pin: string) => {
    // Prevent multiple executions
    if (isLoading || hasShownSuccess) {
      return;
    }

    if (pin.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }

    if (pin !== newPin) {
      Alert.alert('Error', 'PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }

    setIsLoading(true);
    
    try {
      if (isPinReset && pinResetOTPId) {
        // PIN reset flow
        await completePinReset(newPin, pinResetOTPId);
        
        setHasShownSuccess(true);
        Alert.alert(
          'Success',
          'PIN reset completed successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'App' }],
                });
              },
            },
          ]
        );
      } else {
        // PIN change flow
        await changePin(currentPin, newPin);
        
        // PIN change successful - show success and logout
        setHasShownSuccess(true);
        Alert.alert(
          'Success',
          'PIN changed successfully. You will be logged out for security.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
                // Reset to root Onboarding
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
                root?.reset?.({ index: 0, routes: [{ name: 'Onboarding' }] });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      // Handle 401 as success (PIN changed, session invalidated)
      if (error.response?.status === 401) {
        setHasShownSuccess(true);
        Alert.alert(
          'Success',
          'PIN changed successfully. You will be logged out for security.',
          [
            {
              text: 'OK',
              onPress: async () => {
                await logout();
                // Reset to root Onboarding
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
                root?.reset?.({ index: 0, routes: [{ name: 'Onboarding' }] });
              },
            },
          ]
        );
      } else {
        // Show error for actual failures
        Alert.alert('Error', error.message || 'Failed to change PIN. Please try again.');
        setConfirmPin('');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Confirm PIN</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="checkmark-circle" size={32} color="#10B981" />
              </View>
            </View>

            <Text style={styles.title}>Confirm Your PIN</Text>
            
            <Text style={styles.subtitle}>
              Confirm your new 4-digit PIN
            </Text>

            <View style={styles.pinContainer}>
              <PinInput
                value={confirmPin}
                onChangeText={setConfirmPin}
                maxLength={4}
                onComplete={handlePinComplete}
                style={styles.pinInput}
              />
            </View>

            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Processing...</Text>
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#10B981',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  formContainer: {
    width: '100%',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBackground: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#D1FAE5',
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
  loadingContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});

export default ConfirmPin; 