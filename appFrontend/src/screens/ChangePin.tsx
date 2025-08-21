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
import { colors, spacing, typography } from '../theme';

interface RouteParams {
  isFirstTime?: boolean;
}

type ChangePinNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ChangePin'>;

const ChangePin = () => {
  const navigation = useNavigation<ChangePinNavigationProp>();
  const route = useRoute();
  const { isFirstTime } = (route.params || {}) as RouteParams;
  const [currentPin, setCurrentPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinComplete = async (pin: string) => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit PIN');
      return;
    }

    setIsLoading(true);
    try {
      // Navigate to new PIN screen
      navigation.navigate('NewPin', { 
        currentPin: pin,
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
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isFirstTime ? 'Create PIN' : 'Change PIN'}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <View style={styles.iconBackground}>
                <Ionicons name="lock-closed" size={32} color="#2563EB" />
              </View>
            </View>

            <Text style={styles.title}>
              {isFirstTime ? 'Create Your PIN' : 'Enter Current PIN'}
            </Text>
            
            <Text style={styles.subtitle}>
              {isFirstTime
                ? 'Create a secure 4-digit PIN to protect your account'
                : 'Enter your current PIN to continue'}
            </Text>

            <View style={styles.pinContainer}>
              <PinInput
                value={currentPin}
                onChangeText={setCurrentPin}
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  logoFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
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

export default ChangePin; 