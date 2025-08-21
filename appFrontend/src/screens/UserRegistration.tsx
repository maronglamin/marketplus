import React, { useState } from 'react';
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
  ScrollView,
  Alert,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { register } from '../api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  PinVerification: { phoneNumber: string };
  UserRegistration: { phoneNumber: string };
  LoginPin: undefined;
  Home: undefined;
};

type UserRegistrationNavigationProp = NativeStackNavigationProp<RootStackParamList, 'UserRegistration'>;
type UserRegistrationRouteProp = RouteProp<RootStackParamList, 'UserRegistration'>;

export function UserRegistration() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    middleName?: string;
  }>({});
  const navigation = useNavigation<UserRegistrationNavigationProp>();
  const route = useRoute<UserRegistrationRouteProp>();
  const { phoneNumber } = route.params;

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
    }

    if (middleName.trim() && middleName.trim().length < 2) {
      newErrors.middleName = 'Middle name must be at least 2 characters if provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const response = await register(
        phoneNumber,
        firstName.trim(),
        lastName.trim(),
        middleName.trim() || undefined
      );

      console.log('Registration successful:', {
        hasToken: !!response.token,
        user: response.user
      });

      // Navigate to LoginPin screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginPin' }],
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert(
        'Registration Failed',
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#1F2937" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formContainer}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Please provide your information to complete registration
            </Text>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  style={[styles.input, errors.firstName && styles.inputError]}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    if (errors.firstName) {
                      setErrors(prev => ({ ...prev, firstName: undefined }));
                    }
                  }}
                  placeholder="Enter your first name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
                {errors.firstName && (
                  <Text style={styles.errorText}>{errors.firstName}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Middle Name</Text>
                <TextInput
                  style={[styles.input, errors.middleName && styles.inputError]}
                  value={middleName}
                  onChangeText={(text) => {
                    setMiddleName(text);
                    if (errors.middleName) {
                      setErrors(prev => ({ ...prev, middleName: undefined }));
                    }
                  }}
                  placeholder="Enter your middle name (optional)"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="next"
                />
                {errors.middleName && (
                  <Text style={styles.errorText}>{errors.middleName}</Text>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  style={[styles.input, errors.lastName && styles.inputError]}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    if (errors.lastName) {
                      setErrors(prev => ({ ...prev, lastName: undefined }));
                    }
                  }}
                  placeholder="Enter your last name"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!loading}
                  returnKeyType="done"
                />
                {errors.lastName && (
                  <Text style={styles.errorText}>{errors.lastName}</Text>
                )}
              </View>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={loading}
                style={[styles.button, loading && styles.buttonDisabled]}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Registering...' : 'Complete Registration'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    flex: 1,
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
  },
  contentContainer: {
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 40,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    gap: 24,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1F2937',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#2563EB',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
    shadowOpacity: 0.1,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 