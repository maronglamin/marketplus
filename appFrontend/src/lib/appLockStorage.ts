import AsyncStorage from '@react-native-async-storage/async-storage'

const ENABLED_KEY = 'snap_app_lock_enabled'
const BIOMETRIC_KEY = 'snap_biometric_enabled'
const SKIP_KEY = 'snap_skip_next_app_lock'

/** In-memory flags (vPay-style) so skip/prompt work immediately after OTP. */
let skipNextAppLock = false
let pendingCredentialPrompt = false

export async function getAppLockEnabled(): Promise<boolean> {
  // Default on like vPay when unset; returning users who opted out stay off.
  const value = await AsyncStorage.getItem(ENABLED_KEY)
  if (value === null) return true
  return value === 'true'
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function getBiometricEnabled(): Promise<boolean> {
  // Default on when unset — hardware availability is checked separately.
  const value = await AsyncStorage.getItem(BIOMETRIC_KEY)
  if (value === null) return true
  return value === 'true'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false')
}

/** Call after a fresh OTP / PIN sign-in so the user is not locked immediately. */
export function markSkipNextAppLock(): void {
  skipNextAppLock = true
  void AsyncStorage.setItem(SKIP_KEY, 'true')
}

export function consumeSkipNextAppLock(): boolean {
  const shouldSkip = skipNextAppLock
  skipNextAppLock = false
  void AsyncStorage.removeItem(SKIP_KEY)
  return shouldSkip
}

/** Call after a fresh sign-in to suggest setting an unlock PIN when none exists. */
export function markPendingCredentialPrompt(): void {
  pendingCredentialPrompt = true
}

export function clearPendingCredentialPrompt(): void {
  pendingCredentialPrompt = false
}

export function hasPendingCredentialPrompt(): boolean {
  return pendingCredentialPrompt
}
