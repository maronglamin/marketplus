import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  Animated,
} from 'react-native'
import { ShoppingBag } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'
import AsyncStorage from '@react-native-async-storage/async-storage'

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

const HAS_SEEN_ONBOARDING_KEY = 'hasSeenOnboarding'
const FIRST_LAUNCH_MS = 5000
const RETURN_LAUNCH_MS = 800

export function Onboarding() {
  const navigation = useNavigation<OnboardingNavigationProp>()
  const [imageError, setImageError] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const [showTagline, setShowTagline] = useState(false)
  const taglineOpacity = useRef(new Animated.Value(0)).current

  useEffect(() => {
    let typeInterval: ReturnType<typeof setInterval> | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    const goHome = async () => {
      try {
        await AsyncStorage.setItem(HAS_SEEN_ONBOARDING_KEY, 'true')
        await AsyncStorage.removeItem('justLoggedOut')
      } catch {}
      if (!cancelled) {
        navigation.replace('Main')
      }
    }

    ;(async () => {
      try {
        const flag = await AsyncStorage.getItem('justLoggedOut')
        if (flag) {
          await AsyncStorage.removeItem('justLoggedOut')
        }
      } catch {}

      let seen = false
      try {
        seen = (await AsyncStorage.getItem(HAS_SEEN_ONBOARDING_KEY)) === 'true'
      } catch {}

      const splashMs = seen ? RETURN_LAUNCH_MS : FIRST_LAUNCH_MS

      const text = 'SNAP'
      let currentIndex = 0
      typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayText(text.slice(0, currentIndex + 1))
          currentIndex++
        } else {
          if (typeInterval) clearInterval(typeInterval)
          setShowTagline(true)
          Animated.timing(taglineOpacity, {
            toValue: 1,
            duration: seen ? 200 : 400,
            useNativeDriver: true,
          }).start()
        }
      }, seen ? 80 : 200)

      timer = setTimeout(() => {
        void goHome()
      }, splashMs)
    })()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
      if (typeInterval) clearInterval(typeInterval)
    }
  }, [navigation, taglineOpacity])

  return (
    <View style={styles.splashContainer}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.splashContent}>
        {imageError ? (
          <View style={styles.splashIcon}>
            <ShoppingBag size={80} color="#2563EB" />
          </View>
        ) : (
          <Image
            source={require('../../assets/icon.png')}
            style={styles.splashIcon}
            resizeMode="contain"
            onError={() => setImageError(true)}
          />
        )}
        <Text style={styles.splashTitle}>{displayText}</Text>
        {showTagline ? (
          <Animated.Text style={[styles.splashTagline, { opacity: taglineOpacity }]}>
            Super APP
          </Animated.Text>
        ) : (
          <Text style={[styles.splashTagline, styles.splashTaglinePlaceholder]} />
        )}
      </View>

      <View style={styles.poweredByContainer}>
        <Text style={styles.poweredByLabel}>Powered by Cloud Nexus</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashIcon: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    minHeight: 60,
  },
  splashTagline: {
    fontSize: 22,
    fontWeight: '500',
    color: '#2563EB',
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: 4,
    minHeight: 28,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  splashTaglinePlaceholder: {
    opacity: 0,
  },
  poweredByContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredByLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
})
