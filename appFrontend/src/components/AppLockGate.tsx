import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useAppLock } from '../contexts/AppLockContext'
import { AppLockScreen } from './AppLockScreen'

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { isLocked } = useAppLock()

  return (
    <View style={styles.root}>
      {children}
      {isLocked ? (
        <View style={styles.overlay}>
          <AppLockScreen />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
  },
})
