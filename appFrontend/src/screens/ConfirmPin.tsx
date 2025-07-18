import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthNavigator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import PinInput from '../components/PinInput';
import { colors, spacing, typography } from '../theme';
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
  const { changePin } = useAuth();
  const route = useRoute();
  const { currentPin, newPin, isFirstTime, isPinReset, pinResetOTPId } = (route.params || {}) as RouteParams;
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handlePinSubmit = async () => {
    if (confirmPin.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }

    if (confirmPin !== newPin) {
      Alert.alert('Error', 'PINs do not match');
      return;
    }

    setIsLoading(true);
    try {
      if (isPinReset && pinResetOTPId) {
        // For PIN reset flow, call the complete PIN reset API
        await completePinReset(newPin, pinResetOTPId);
        
        Alert.alert(
          'Success',
          'PIN reset completed successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to app screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'App' }],
                });
              },
            },
          ]
        );
      } else {
        // Regular PIN change flow
      await changePin(currentPin, newPin);

      Alert.alert(
        'Success',
        'PIN changed successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              if (isFirstTime) {
                  // Navigate to app screen for first-time users
                navigation.reset({
                  index: 0,
                    routes: [{ name: 'App' }],
                });
              } else {
                // Go back to previous screen for existing users
                navigation.goBack();
              }
            },
          },
        ]
      );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to change PIN. Please try again.');
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
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Confirm PIN</Text>
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

          <Text style={styles.subtitle}>
            Confirm your new 4-digit PIN
          </Text>

          <PinInput
            value={confirmPin}
            onChangeText={setConfirmPin}
            maxLength={4}
            style={styles.pinInput}
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePinSubmit}
            disabled={isLoading || confirmPin.length !== 4}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : 'Confirm'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.sm,
  },
  title: {
    ...typography.h1,
    marginLeft: spacing.md,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: colors.primary,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitle: {
    ...typography.body1,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.textSecondary,
  },
  pinInput: {
    marginBottom: spacing.xl,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.button,
    color: colors.white,
  },
});

export default ConfirmPin; 