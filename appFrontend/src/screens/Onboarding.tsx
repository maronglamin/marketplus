import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
  Animated,
  Dimensions,
} from 'react-native'
import { ShoppingBag, ShoppingCart, Heart, CreditCard, Car } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../App'

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Onboarding'>

export function Onboarding() {
  const navigation = useNavigation<OnboardingNavigationProp>()
  const [showContent, setShowContent] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [poweredByError, setPoweredByError] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const fadeAnim = useRef(new Animated.Value(0)).current
  const { width } = Dimensions.get('window')
  
  const features = [
    { title: 'Browse Products', description: 'Discover quality items nearby', Icon: ShoppingCart },
    { title: 'Reserve Products', description: 'Show interest and reserve easily', Icon: Heart },
    { title: 'Flexible Payments', description: 'Wallet or card — you choose', Icon: CreditCard },
    { title: 'Ride Services', description: 'Quick rides and rentals available', Icon: Car },
  ]

  useEffect(() => {
    // Type "SNAP" character by character
    const text = 'SNAP'
    let currentIndex = 0
    
    const typeInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(typeInterval)
      }
    }, 200) // Type each character every 200ms

    // Show splash for 5 seconds
    const timer = setTimeout(() => {
      setShowContent(true)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start()
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(typeInterval)
    }
  }, [fadeAnim])

  // No extra animations for a cleaner, more professional look

  if (!showContent) {
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
              onError={(error) => {
                console.error('Failed to load splash icon:', error.nativeEvent.error);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Splash icon loaded successfully');
              }}
            />
          )}
          <Text style={styles.splashTitle}>{displayText}</Text>
        </View>
        
        <View style={styles.poweredByContainer}>

          <Text style={styles.poweredByLabel}>Powered by Cloud Nexus</Text>
        </View>
      </View>
    )
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      {/* Simplified background for a professional, minimal look */}

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          {imageError ? (
            <ShoppingBag size={80} color="#2563EB" />
          ) : (
            <Image
              source={require('../../assets/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
              onError={(error) => {
                console.error('Failed to load logo icon:', error.nativeEvent.error);
                setImageError(true);
              }}
            />
          )}
        </View>

        <Text style={styles.mainTitle}>SNAP</Text>
        <Text style={styles.subtitle}>Commerce and mobility — unified for speed and trust.</Text>

        <View style={styles.featureChips}>
          {features.map((f, idx) => (
            <View key={idx} style={styles.chip}>
              <View style={styles.chipIconBox}>
                <f.Icon size={18} color="#2563EB" />
              </View>
              <View style={styles.chipTexts}>
                <Text style={styles.chipTitle}>{f.title}</Text>
                <Text style={styles.chipDesc}>{f.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.linkText}>Terms of Use</Text>
          {' '}and{' '}
          <Text style={styles.linkText}>Privacy Policy</Text>
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Auth')}
          activeOpacity={0.9}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
  poweredByContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredByWrapper: {
    marginBottom: 8,
  },
  poweredByImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  poweredByFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  poweredByFallbackText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  poweredByLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight || 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  mainTitle: {
    fontSize: 48,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    letterSpacing: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  featureChips: {
    width: '100%',
    marginTop: 12,
    rowGap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  chipIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTexts: {
    marginLeft: 12,
    flex: 1,
  },
  chipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  chipDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  linkText: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 