import AsyncStorage from '@react-native-async-storage/async-storage'

const ENABLED_KEY = 'snap_app_lock_enabled'
const BIOMETRIC_KEY = 'snap_biometric_enabled'
const SKIP_KEY = 'snap_skip_next_app_lock'

export async function getAppLockEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY)
  return value !== 'false'
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function getBiometricEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(BIOMETRIC_KEY)
  return value !== 'false'
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? 'true' : 'false')
}

export function markSkipNextAppLock(): void {
  void AsyncStorage.setItem(SKIP_KEY, 'true')
}

export async function consumeSkipNextAppLock(): Promise<boolean> {
  const value = await AsyncStorage.getItem(SKIP_KEY)
  if (value === 'true') {
    await AsyncStorage.removeItem(SKIP_KEY)
    return true
  }
  return false
}
