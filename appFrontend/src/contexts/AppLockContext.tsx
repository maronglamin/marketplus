import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAuth } from './AuthContext'
import { loginWithPin } from '../api/auth'
import { getDeviceInfo } from '../api/auth'
import {
  authenticateWithBiometrics,
  resolveBiometricMethod,
  type BiometricMethod,
} from '../lib/biometrics'
import {
  consumeSkipNextAppLock,
  getAppLockEnabled,
  getBiometricEnabled,
  setAppLockEnabled as persistAppLockEnabled,
  setBiometricEnabled as persistBiometricEnabled,
} from '../lib/appLockStorage'

const BACKGROUND_LOCK_DELAY_MS = 60_000

type AppLockContextValue = {
  isLocked: boolean
  biometricsAvailable: boolean
  biometricMethod: BiometricMethod
  biometricEnabled: boolean
  appLockEnabled: boolean
  setAppLockEnabled: (enabled: boolean) => Promise<void>
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  unlock: () => Promise<boolean>
  unlockWithPin: (pin: string) => Promise<boolean>
  lock: () => void
}

const AppLockContext = createContext<AppLockContextValue | null>(null)

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth()
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [biometricMethod, setBiometricMethod] = useState<BiometricMethod>('none')
  const [appLockEnabled, setAppLockEnabledState] = useState(true)
  const [biometricEnabled, setBiometricEnabledState] = useState(true)
  const backgroundSince = useRef<number | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  const biometricsAvailable = biometricMethod !== 'none'
  const lockRequired = Boolean(user) && !authLoading && appLockEnabled

  const lock = useCallback(() => {
    setIsUnlocked(false)
  }, [])

  useEffect(() => {
    void (async () => {
      const [lockOn, bioOn, method] = await Promise.all([
        getAppLockEnabled(),
        getBiometricEnabled(),
        resolveBiometricMethod(),
      ])
      setAppLockEnabledState(lockOn)
      setBiometricEnabledState(bioOn)
      setBiometricMethod(method)
      setSessionReady(true)
    })()
  }, [])

  useEffect(() => {
    if (!user) {
      setIsUnlocked(true)
      return
    }
    if (!sessionReady) return
    void consumeSkipNextAppLock().then((skip) => {
      setIsUnlocked(skip)
    })
  }, [user, sessionReady])

  const setAppLockEnabled = useCallback(async (enabled: boolean) => {
    await persistAppLockEnabled(enabled)
    setAppLockEnabledState(enabled)
    if (!enabled) {
      setIsUnlocked(true)
    } else if (user) {
      lock()
    }
  }, [user, lock])

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    await persistBiometricEnabled(enabled)
    setBiometricEnabledState(enabled)
  }, [])

  const unlock = useCallback(async (): Promise<boolean> => {
    if (!lockRequired) {
      setIsUnlocked(true)
      return true
    }
    if (!biometricsAvailable || !biometricEnabled) {
      return false
    }
    const result = await authenticateWithBiometrics(biometricMethod)
    if (result.success) {
      setIsUnlocked(true)
      return true
    }
    return false
  }, [lockRequired, biometricsAvailable, biometricEnabled, biometricMethod])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const deviceInfo = await getDeviceInfo()
      const response = await loginWithPin(deviceInfo.deviceId, pin)
      if (response.token) {
        setIsUnlocked(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (!lockRequired) return
      if (state !== 'active') {
        backgroundSince.current = Date.now()
        return
      }
      const started = backgroundSince.current
      backgroundSince.current = null
      if (started && Date.now() - started >= BACKGROUND_LOCK_DELAY_MS) {
        lock()
      }
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [lockRequired, lock])

  useEffect(() => {
    if (!lockRequired || isUnlocked || !sessionReady) return
    if (biometricsAvailable && biometricEnabled) {
      void unlock()
    }
  }, [lockRequired, isUnlocked, biometricsAvailable, biometricEnabled, unlock])

  const value = useMemo<AppLockContextValue>(() => ({
    isLocked: lockRequired && !isUnlocked,
    biometricsAvailable,
    biometricMethod,
    biometricEnabled,
    appLockEnabled,
    setAppLockEnabled,
    setBiometricEnabled,
    unlock,
    unlockWithPin,
    lock,
  }), [
    lockRequired,
    isUnlocked,
    biometricsAvailable,
    biometricMethod,
    biometricEnabled,
    appLockEnabled,
    setAppLockEnabled,
    setBiometricEnabled,
    unlock,
    unlockWithPin,
    lock,
  ])

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
}

export function useAppLock() {
  const context = useContext(AppLockContext)
  if (!context) {
    throw new Error('useAppLock must be used within AppLockProvider')
  }
  return context
}
