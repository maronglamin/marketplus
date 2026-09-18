import { KeyRound } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import {
  clearPendingCredentialPrompt,
  hasPendingCredentialPrompt,
} from '../lib/appLockStorage'

/**
 * After OTP sign-in, prompts the user to set an unlock PIN when none exists.
 */
export function SetCredentialPrompt() {
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const navigation = useNavigation<any>()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!user || !hasPendingCredentialPrompt()) {
      return
    }

    clearPendingCredentialPrompt()
    if (!user.hasPin) {
      setVisible(true)
    }
  }, [user])

  const dismiss = () => {
    setVisible(false)
  }

  const openPinSetup = () => {
    setVisible(false)
    const root = navigation.getParent?.() || navigation
    try {
      root.navigate?.('Auth', {
        screen: 'NewPin',
        params: { currentPin: '', isFirstTime: true },
      })
    } catch {
      navigation.navigate?.('ChangePin', { isFirstTime: true })
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.backdropHit}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
          accessibilityViewIsModal
        >
          <View style={styles.handle} />

          <View style={styles.iconRing}>
            <KeyRound size={40} color="#2563EB" strokeWidth={1.75} />
          </View>

          <Text style={styles.title}>Set a PIN</Text>
          <Text style={styles.message}>
            If biometrics aren&apos;t available, you can unlock SNAP with your PIN instead of
            signing in again.
          </Text>

          <Pressable
            onPress={openPinSetup}
            accessibilityRole="button"
            accessibilityLabel="Set PIN"
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Set now</Text>
          </Pressable>

          <Pressable
            onPress={dismiss}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Not now"
          >
            <Text style={styles.dismissLink}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropHit: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginBottom: 20,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 999,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4B5563',
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissLink: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    paddingVertical: 8,
  },
})
