import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native'
import PinInput from './PinInput'
import { useAppLock } from '../contexts/AppLockContext'
import { useAuth } from '../contexts/AuthContext'
import { getBiometricLabel } from '../lib/biometrics'

export function AppLockScreen() {
  const { unlock, unlockWithPin, biometricsAvailable, biometricEnabled, biometricMethod } = useAppLock()
  const { logout } = useAuth()
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePin = async (value: string) => {
    if (value.length !== 4) return
    setLoading(true)
    const ok = await unlockWithPin(value)
    setLoading(false)
    if (!ok) {
      Alert.alert('Incorrect PIN', 'Try again or sign in with email or phone.')
      setPin('')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SNAP is locked</Text>
        <Text style={styles.subtitle}>
          {biometricsAvailable && biometricEnabled
            ? `Unlock with ${getBiometricLabel(biometricMethod)} or your PIN`
            : 'Enter your 4-digit PIN to continue'}
        </Text>

        {biometricsAvailable && biometricEnabled ? (
          <TouchableOpacity style={styles.bioButton} onPress={() => void unlock()} disabled={loading}>
            <Text style={styles.bioButtonText}>Unlock with {getBiometricLabel(biometricMethod)}</Text>
          </TouchableOpacity>
        ) : null}

        <PinInput
          value={pin}
          onChangeText={setPin}
          maxLength={4}
          onComplete={handlePin}
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.signInAgain}
          onPress={async () => {
            await logout()
          }}
        >
          <Text style={styles.signInAgainText}>Sign in with email or phone</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  bioButton: {
    backgroundColor: '#2563EB',
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 28,
    width: '100%',
    alignItems: 'center',
  },
  bioButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signInAgain: {
    marginTop: 28,
  },
  signInAgainText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
  },
})
