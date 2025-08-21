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
          <View style={styles.poweredByWrapper}>
            {poweredByError ? (
              <View style={styles.poweredByFallback}>
                <Text style={styles.poweredByFallbackText}>CN</Text>
              </View>
            ) : (
              <Image
                source={require('../../assets/poweredby.png')}
                style={styles.poweredByImage}
                resizeMode="cover"
                onError={(error) => {
                  console.error('Failed to load powered by image:', error.nativeEvent.error);
                  setPoweredByError(true);
                }}
              />
            )}
          </View>
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
        <Text style={styles.subtitle}>
          Get started today and find products you love.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <ShoppingCart size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Browse Products</Text>
              <Text style={styles.featureDescription}>
                Find products from local businesses
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Heart size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Reserve Products</Text>
              <Text style={styles.featureDescription}>
                Show interest and reserve items
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <CreditCard size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Flexible Payments</Text>
              <Text style={styles.featureDescription}>
                Pay with wallet, card, or cash
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Car size={24} color="#2563EB" />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>SNAP Riders</Text>
              <Text style={styles.featureDescription}>
                Get rides and delivery services
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Auth')}
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
    marginBottom: 32,
  },
  features: {
    width: '100%',
    gap: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
}); 