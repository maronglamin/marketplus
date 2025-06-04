import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { verifyOTP } from '../api/auth';
import { Button } from '../components/Button';
import { OTPInput } from '../components/OTPInput';
import { useAuth } from '../contexts/AuthContext';

type VerificationScreenParams = {
  phoneNumber: string;
  deviceInfo: {
    deviceId: string;
    deviceName: string;
    deviceType: string;
  };
};

type VerificationScreenRouteProp = RouteProp<{
  Verification: VerificationScreenParams;
}, 'Verification'>;

export const VerificationScreen = () => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute<VerificationScreenRouteProp>();
  const { setUser } = useAuth();

  const { phoneNumber, deviceInfo } = route.params;

  const handleVerification = async () => {
    try {
      setLoading(true);
      const { response, isRegistered } = await verifyOTP(phoneNumber, code, deviceInfo);
      
      // Store user data
      setUser(response.user);

      // Navigate based on registration status
      if (isRegistered) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'PinLogin' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ 
            name: 'UserRegistration',
            params: { phoneNumber }
          }],
        });
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Please try again'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Verification Code</Text>
      <Text style={styles.subtitle}>
        We've sent a verification code to {phoneNumber}
      </Text>
      
      <OTPInput
        value={code}
        onChangeText={setCode}
        length={6}
        style={styles.otpInput}
      />

      <Button
        title="Verify"
        onPress={handleVerification}
        loading={loading}
        disabled={code.length !== 6}
        style={styles.button}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#fff',
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
  otpInput: {
    marginBottom: 30,
  },
  button: {
    marginTop: 20,
  },
}); 