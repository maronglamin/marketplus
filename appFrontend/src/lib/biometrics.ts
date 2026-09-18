import * as LocalAuthentication from 'expo-local-authentication'
import { AppState, InteractionManager, Platform } from 'react-native'

export type BiometricMethod = 'faceId' | 'touchId' | 'androidBiometric' | 'none'

export async function waitForAppActive(): Promise<void> {
  await new Promise<void>((resolve) => {
    const run = () => InteractionManager.runAfterInteractions(() => resolve())
    if (AppState.currentState === 'active') {
      run()
      return
    }
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        subscription.remove()
        run()
      }
    })
  })
}

export async function resolveBiometricMethod(): Promise<BiometricMethod> {
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ])

    if (!hasHardware || !isEnrolled) {
      return 'none'
    }

    if (Platform.OS === 'ios') {
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'faceId'
      }
      if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'touchId'
      }
      return hasHardware && isEnrolled ? 'faceId' : 'none'
    }

    return hasHardware && isEnrolled ? 'androidBiometric' : 'none'
  } catch {
    // Missing native module / OEM biometric failures must never crash startup.
    return 'none'
  }
}

export function getBiometricLabel(method: BiometricMethod): string {
  switch (method) {
    case 'faceId':
      return 'Face ID'
    case 'touchId':
      return 'Touch ID'
    case 'androidBiometric':
      return 'Biometrics'
    default:
      return 'Biometrics'
  }
}

function getPromptMessage(method: BiometricMethod): string {
  switch (method) {
    case 'faceId':
      return 'Unlock SNAP with Face ID'
    case 'touchId':
      return 'Unlock SNAP with Touch ID'
    default:
      return 'Unlock SNAP'
  }
}

export async function authenticateWithBiometrics(
  method: BiometricMethod
): Promise<LocalAuthentication.LocalAuthenticationResult> {
  try {
    await waitForAppActive()
    if (Platform.OS === 'ios') {
      return await LocalAuthentication.authenticateAsync({
        promptMessage: getPromptMessage(method),
        disableDeviceFallback: true,
        fallbackLabel: '',
      })
    }
    return await LocalAuthentication.authenticateAsync({
      promptMessage: getPromptMessage(method),
      disableDeviceFallback: true,
      // Prefer weak+strong so more Android devices can unlock; "strong" alone
      // fails on some OEM fingerprint setups and strands users on the lock screen.
      biometricsSecurityLevel: 'weak',
      cancelLabel: 'Use PIN',
    })
  } catch {
    return { success: false, error: 'unknown', warning: undefined }
  }
}
