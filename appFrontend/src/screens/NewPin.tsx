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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import PinInput from '../components/PinInput';
import { colors, spacing, typography } from '../theme';

interface RouteParams {
  currentPin: string;
  isFirstTime?: boolean;
}

const NewPin = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { currentPin, isFirstTime } = (route.params || {}) as RouteParams;
  const [newPin, setNewPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinSubmit = async () => {
    if (newPin.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }

    if (newPin === currentPin) {
      Alert.alert('Error', 'New PIN must be different from current PIN');
      return;
    }

    setIsLoading(true);
    try {
      // Navigate to confirm PIN screen
      navigation.navigate('ConfirmPin', { 
        currentPin,
        newPin,
        isFirstTime 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to proceed. Please try again.');
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
          <Text style={styles.title}>New PIN</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.subtitle}>
            Enter a new 4-digit PIN
          </Text>

          <PinInput
            value={newPin}
            onChangeText={setNewPin}
            maxLength={4}
            style={styles.pinInput}
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePinSubmit}
            disabled={isLoading || newPin.length !== 4}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Processing...' : 'Continue'}
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
  subtitle: {
    ...typography.body1,
    textAlign: 'center',
    marginBottom: spacing.xl,
    color: colors.textSecondary,
  },
  pinInput: {
    marginBottom: spacing.xl,
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

export default NewPin; 