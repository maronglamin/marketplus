import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  ScrollView,
  Linking,
  Switch,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { 
  User, 
  Shield, 
  CreditCard, 
  MapPin, 
  Bell, 
  Settings, 
  HelpCircle, 
  FileText, 
  LogOut,
  ChevronRight,
  Camera,
  Lock,
  Eye,
  Globe,
  Smartphone,
  Mail,
  Calendar,
  Star,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Share2,
  Heart,
  Car,
  Store,
  Wallet,
  ShieldCheck,
  Wifi,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Languages,
  Accessibility,
  Database,
  Key,
  Users,
  Phone,
  MessageCircle,
  Zap,
  Clock,
  Target,
  Truck,
  Package,
  Receipt,
  TrendingUp,
  Award,
  Flag,
  Info,
  ExternalLink,
  XCircle,
  Clock as ClockIcon
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../contexts/AuthContext'
import { userService, UserProfileData } from '../services/userService'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ENV_CONFIG } from '../config/env'

type MenuItem = {
  id: string
  title: string
  icon: React.ReactNode
  onPress: () => void
  subtitle?: string
  isDestructive?: boolean
  showBadge?: boolean
  badgeText?: string
  isToggle?: boolean
  toggleValue?: boolean
  onToggleChange?: (value: boolean) => void
  showChevron?: boolean
  isDisabled?: boolean
}

type Category = {
  id: string
  title: string
  items: MenuItem[]
  showDivider?: boolean
}

type RootStackParamList = {
  Home: undefined
  AccountSettings: undefined
  ChangePin: undefined
  Permissions: undefined
  ManagePermissions: undefined
  FindSellers: undefined
  Login: undefined
  UserProfile: undefined
  SecuritySettings: undefined
  PaymentMethods: undefined
  Delivery: undefined
  NotificationsSettings: undefined
  PrivacySettings: undefined
  HelpSupport: undefined
  ServiceTerms: undefined
  PrivacyPolicy: undefined
  LanguageSettings: undefined
  AccessibilitySettings: undefined
  DataUsage: undefined
  AboutApp: undefined
  AccountType: undefined
  CustomerRideHistory: undefined
  AccountDeletion: undefined
}

type AccountSettingsNavigationProp = NativeStackNavigationProp<RootStackParamList, 'AccountSettings'>

export function AccountSettings() {
  const navigation = useNavigation<AccountSettingsNavigationProp>()
  const { logout, user, refreshUserFromStorage } = useAuth()
  
  // Fresh user data state (fetched from backend using JWT)
  const [freshUserData, setFreshUserData] = React.useState<any>(null)
  const [isLoadingFreshUserData, setIsLoadingFreshUserData] = React.useState(true)
  
  // State for user profile data
  const [userProfile, setUserProfile] = React.useState<UserProfileData | null>(null)
  const [loadingProfile, setLoadingProfile] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  // Delivery addresses moved to dedicated screen
  

  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false)

  // Load fresh user data from backend using JWT token
  const loadFreshUserData = React.useCallback(async () => {
    try {
      setIsLoadingFreshUserData(true)
      console.log('🔄 Loading fresh user data from backend...')
      const userData = await userService.getBasicUserInfo()
      console.log('✅ Fresh user data loaded:', userData)
      setFreshUserData(userData)
    } catch (error) {
      console.error('❌ Error loading fresh user data:', error)
      setFreshUserData(null)
    } finally {
      setIsLoadingFreshUserData(false)
    }
  }, [])

  // Load fresh user data with retry mechanism
  const loadFreshUserDataWithRetry = React.useCallback(async (maxRetries = 3) => {
    let retryCount = 0
    
    const attemptLoad = async (): Promise<any> => {
      try {
        console.log(`🔄 Loading fresh user data (attempt ${retryCount + 1}/${maxRetries})`)
        const userData = await userService.getBasicUserInfo()
        console.log('✅ Fresh user data loaded successfully:', userData)
        return userData
      } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error)
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying in 1 second...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return attemptLoad()
        }
        throw error
      }
    }
    
    try {
      // Check if we have a token before attempting to load
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        console.log('⚠️ No JWT token available, skipping fresh user data load')
        setFreshUserData(null)
        return
      }
      
      setIsLoadingFreshUserData(true)
      const userData = await attemptLoad()
      setFreshUserData(userData)
      console.log('✅ Fresh user data set successfully:', userData)
    } catch (error) {
      console.error('❌ Final error loading fresh user data:', error)
      setFreshUserData(null)
    } finally {
      setIsLoadingFreshUserData(false)
    }
  }, [])

  // Redirect unauthenticated users back to Home with a login prompt
  React.useEffect(() => {
    if (!user?.id) {
      // Suppress login prompt if this is immediately after an intentional logout
      (async () => {
        const val = await AsyncStorage.getItem('justLoggedOut')
        if (val) {
          await AsyncStorage.removeItem('justLoggedOut')
          // Reset to Onboarding cleanly at root
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
          root?.reset?.({ index: 0, routes: [{ name: 'Onboarding' }] });
          return;
        }
        // Navigate back to Home and prompt login (non-logout case)
        navigation.navigate('Home')
        setTimeout(() => {
          Alert.alert(
            'Login required',
            'Please login to access Account Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Login',
                onPress: () => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (navigation as any)?.getParent?.()?.navigate?.('Auth', { screen: 'Login' }) ?? (navigation as any)?.navigate?.('Auth', { screen: 'Login' })
                },
              },
            ],
            { cancelable: true }
          )
        }, 200)
      })()
    }
  }, [user?.id, navigation])

  // Load user profile data
  const loadUserProfile = React.useCallback(async (forceRefresh = false) => {
    console.log('🔄 loadUserProfile called:', { 
      userId: user?.id, 
      forceRefresh,
      hasUser: !!user 
    })

    if (!user?.id) {
      console.log('⚠️ No user ID, refreshing from storage...')
      // Try to refresh user data from storage
      const authData = await refreshUserFromStorage()
      console.log('📦 Auth data from storage:', authData)
      if (!authData?.user?.id) {
        console.log('❌ No user data found in storage')
        setLoadingProfile(false)
        setRefreshing(false)
        return
      }
      // Update the user reference for this function call
      const currentUser = authData.user
      console.log('✅ Using refreshed user data:', currentUser)
      
      // Continue with the refreshed user data
      const maxRetries = 3;
      let retryCount = 0;
      
      const attemptLoad = async (): Promise<UserProfileData> => {
        try {
          console.log(`🔄 Attempting to load profile (attempt ${retryCount + 1}/${maxRetries})`)
          const profileData = await userService.getUserProfile()
          console.log('✅ Profile loaded successfully:', profileData)
          return profileData
        } catch (error) {
          console.error(`❌ Attempt ${retryCount + 1} failed:`, error)
          retryCount++
          if (retryCount < maxRetries) {
            console.log(`⏳ Retrying in 1 second...`)
            await new Promise(resolve => setTimeout(resolve, 1000))
            return attemptLoad()
          }
          throw error
        }
      }
      
      try {
        if (!forceRefresh) {
          setLoadingProfile(true)
        }
        const profileData = await attemptLoad()
        setUserProfile(profileData)
      } catch (error) {
        console.error('❌ Final error loading profile:', error)
        // Clear any stale profile data
        setUserProfile(null)
      } finally {
        setLoadingProfile(false)
        setRefreshing(false)
      }
      return
    }

    const maxRetries = 3;
    let retryCount = 0;
    
    const attemptLoad = async (): Promise<UserProfileData> => {
      try {
        console.log(`🔄 Attempting to load profile (attempt ${retryCount + 1}/${maxRetries})`)
        const profileData = await userService.getUserProfile()
        console.log('✅ Profile loaded successfully:', profileData)
        return profileData
      } catch (error) {
        console.error(`❌ Attempt ${retryCount + 1} failed:`, error)
        retryCount++
        if (retryCount < maxRetries) {
          console.log(`⏳ Retrying in 1 second...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          return attemptLoad()
        }
        throw error
      }
    }
    
    try {
      if (!forceRefresh) {
        setLoadingProfile(true)
      }
      const profileData = await attemptLoad()
      setUserProfile(profileData)
    } catch (error) {
      console.error('❌ Final error loading profile:', error)
      // Clear any stale profile data
      setUserProfile(null)
    } finally {
      setLoadingProfile(false)
      setRefreshing(false)
    }
  }, [user?.id, refreshUserFromStorage])

  // Handle pull to refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true)
    
    // First refresh user data from storage
    await refreshUserFromStorage()
    
    // Then load fresh user data and profile
    await Promise.all([
      loadFreshUserDataWithRetry(),
      loadUserProfile(true)
    ])
  }, [loadUserProfile, refreshUserFromStorage, loadFreshUserDataWithRetry])

  // Initialize data on mount and when user changes
  React.useEffect(() => {
    console.log('🚀 AccountSettings initialization:', { 
      userId: user?.id, 
      firstName: user?.firstName, 
      lastName: user?.lastName,
      hasUser: !!user
    })
    
    if (user?.id) {
      console.log('✅ User available, loading fresh data and profile...')
      // Load fresh user data first
      loadFreshUserDataWithRetry()
      
      // Add a small delay to ensure AuthContext is fully initialized
      const timer = setTimeout(() => {
        loadUserProfile()
      }, 100)
      // Delivery addresses moved to dedicated screen
      return () => clearTimeout(timer)
    } else {
      console.log('⚠️ No user available, clearing data...')
      // Clear profile data if no user
      setFreshUserData(null)
      setUserProfile(null)
      setLoadingProfile(false)
      // Delivery addresses moved to dedicated screen
    }
  }, [user?.id, loadUserProfile, loadFreshUserDataWithRetry])

  // Handle component mount initialization
  React.useEffect(() => {
    console.log('🚀 AccountSettings component mounted, attempting to load fresh user data...')
    
    // Try to load fresh user data immediately on mount
    // This will work even if AuthContext user is not immediately available
    // because the API call uses the JWT token from AsyncStorage
    loadFreshUserDataWithRetry()
    
    // Also try to load profile data
    setTimeout(() => {
      if (user?.id) {
        loadUserProfile()
      }
    }, 200)
  }, []) // Empty dependency array for mount only

  // Add focus listener to refresh data when screen comes into focus
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (user?.id) {
        loadFreshUserDataWithRetry()
        loadUserProfile(true)
      }
    })

    return unsubscribe
  }, [navigation, user?.id, loadUserProfile, loadFreshUserDataWithRetry])

  // Get display name with better fallback logic
  const getDisplayName = () => {
    // Temporary debugging
    console.log('🔍 getDisplayName debug:', {
      hasFreshUserData: !!freshUserData,
      freshUserFirstName: freshUserData?.firstName,
      freshUserLastName: freshUserData?.lastName,
      hasUserProfile: !!userProfile,
      userProfileFullName: userProfile?.user?.fullName,
      hasUser: !!user,
      userFirstName: user?.firstName,
      userLastName: user?.lastName,
      userId: user?.id,
      loadingProfile,
      isLoadingFreshUserData
    })

    // First try fresh user data from backend
    if (freshUserData?.firstName || freshUserData?.lastName) {
      const firstName = freshUserData.firstName || ''
      const lastName = freshUserData.lastName || ''
      const fullName = `${firstName} ${lastName}`.trim()
      if (fullName) {
        return fullName
      }
    }
    
    // Then try userProfile data
    if (userProfile?.user?.fullName) {
      return userProfile.user.fullName
    }
    
    // Then try AuthContext user data
    if (user?.firstName || user?.lastName) {
      const firstName = user.firstName || ''
      const lastName = user.lastName || ''
      return `${firstName} ${lastName}`.trim()
    }
    
    // If still loading, show loading state
    if (loadingProfile || isLoadingFreshUserData) {
      return 'Loading...'
    }
    
    // Last resort - show phone number or generic text
    if (user?.phoneNumber) {
      return `User (${user.phoneNumber})`
    }
    
    return 'Account'
  }

  // Get display phone number
  const getDisplayPhone = () => {
    // First try fresh user data from backend
    if (freshUserData?.phoneNumber) {
      return freshUserData.phoneNumber
    }
    
    if (userProfile?.user?.phoneNumber) {
      return userProfile.user.phoneNumber
    }
    if (user?.phoneNumber) {
      return user.phoneNumber
    }
    return ''
  }

  // Get profile image url from freshest available source
  const getProfileImageUrl = () => {
    if (freshUserData?.profileImageUrl) {
      return freshUserData.profileImageUrl
    }
    if (userProfile?.user?.profileImageUrl) {
      return userProfile.user.profileImageUrl
    }
    if (user?.profileImageUrl) {
      // In case AuthContext carries it
      return (user as any).profileImageUrl
    }
    return null
  }

  const getProfileImageUri = () => {
    const url = getProfileImageUrl()
    if (!url) return null
    if (/^(https?:|file:)/.test(url)) return url
    const base = (ENV_CONFIG.API_BASE_URL || '').replace(/\/$/, '')
    return `${base}${url.startsWith('/') ? url : `/${url}`}`
  }

  // Handle edit image action (take photo / choose from library / remove)
  const handleEditProfileImage = async () => {
    const hasImage = !!getProfileImageUrl()
    const options = [
      { text: 'Take Photo', onPress: async () => { await takePhotoAndUpload() } },
      { text: 'Choose from Library', onPress: async () => { await pickFromLibraryAndUpload() } },
      ...(hasImage ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: async () => { await removeProfilePhoto() } }] : []),
      { text: 'Cancel', style: 'cancel' as const }
    ]
    Alert.alert('Profile Photo', 'Update your profile picture', options, { cancelable: true })
  }

  const pickFromLibraryAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo library access to select a picture.')
        return
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      })
      if (result.canceled || !result.assets?.[0]?.uri) return
      await uploadProfilePhoto(result.assets[0].uri)
    } catch (e) {
      console.error('Error selecting image:', e)
      Alert.alert('Error', 'Failed to select image.')
    }
  }

  const takePhotoAndUpload = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync()
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Please allow camera access to take a photo.')
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      })
      if (result.canceled || !result.assets?.[0]?.uri) return
      await uploadProfilePhoto(result.assets[0].uri)
    } catch (e) {
      console.error('Error taking photo:', e)
      Alert.alert('Error', 'Failed to take photo.')
    }
  }

  const uploadProfilePhoto = async (uri: string) => {
    try {
      setIsUploadingPhoto(true)
      await userService.uploadProfilePhoto(uri)
      // refresh fresh data and profile
      await Promise.all([loadFreshUserDataWithRetry(), loadUserProfile(true)])
      Alert.alert('Success', 'Profile photo updated.')
    } catch (e) {
      console.error('Upload error:', e)
      Alert.alert('Error', 'Failed to upload profile photo.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const removeProfilePhoto = async () => {
    try {
      setIsUploadingPhoto(true)
      await userService.deleteProfilePhoto()
      await Promise.all([loadFreshUserDataWithRetry(), loadUserProfile(true)])
      Alert.alert('Removed', 'Profile photo removed.')
    } catch (e) {
      console.error('Delete photo error:', e)
      Alert.alert('Error', 'Failed to remove profile photo.')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Gt verification status icon and color
  const getVerificationStatusIcon = (verificationStatus: string) => {
    switch (verificationStatus) {
      case 'Verified Seller':
      case 'Verified Driver':
      case 'Verified Seller & Driver':
        return { icon: <CheckCircle size={16} color="#10B981" />, color: '#10B981' }
      case 'Seller KYC Pending':
      case 'Driver KYC Pending':
        return { icon: <ClockIcon size={16} color="#F59E0B" />, color: '#F59E0B' }
      case 'Seller KYC Rejected':
      case 'Driver KYC Rejected':
        return { icon: <XCircle size={16} color="#DC2626" />, color: '#DC2626' }
      default:
        return { icon: <AlertCircle size={16} color="#6B7280" />, color: '#6B7280' }
    }
  }

  // Get account type display text
  const getAccountTypeDisplay = (accountInfo: UserProfileData['accountInfo']) => {
    if (accountInfo.isSeller && accountInfo.isDriver) {
      return 'Seller & Driver'
    } else if (accountInfo.isSeller) {
      return 'Seller'
    } else if (accountInfo.isDriver) {
      return 'Driver'
    }
    return 'User'
  }

  const handleLogout = async () => {
    // Prevent multiple concurrent logout alerts
    const alertOpenRef = (AccountSettings as any)._logoutAlertOpenRef || (AccountSettings as any)._setLogoutAlertRef?.();
    if (!alertOpenRef) {
      // Lazy-init a stable ref attached to the component function object to avoid re-renders
      (AccountSettings as any)._logoutAlertOpenRef = { current: false };
    }
    const ref = (AccountSettings as any)._logoutAlertOpenRef as { current: boolean };
    if (ref.current) {
      return;
    }
    ref.current = true;
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => { ref.current = false } },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout()
              // Reset to root Onboarding screen
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const root = (navigation as any)?.getParent?.()?.getParent?.() || (navigation as any)?.getParent?.();
              root?.reset?.({
                index: 0,
                routes: [{ name: 'Onboarding' }],
              });
            } catch (error) {
              console.error('Error during logout:', error)
              Alert.alert('Error', 'Failed to logout. Please try again.')
            } finally {
              ref.current = false
            }
          },
        },
      ],
      { cancelable: true }
    )
  }



  const handleContactSupport = () => {
    Linking.openURL('tel:+2206738885').catch(err => {
      console.error('Error opening phone app:', err)
    })
  }

  const handleEmailSupport = () => {
    Linking.openURL('mailto:customercare@cloudnexus.biz').catch(err => {
      console.error('Error opening email app:', err)
    })
  }

  // Delivery addresses helpers moved to dedicated screen

  const categories: Category[] = [
    {
      id: 'profile',
      title: 'Profile & Account',
      items: [
        {
          id: 'account-status',
          title: 'Account Status',
          icon: userProfile ? getVerificationStatusIcon(userProfile.accountInfo.verificationStatus).icon : <CheckCircle size={20} color="#10B981" />,
          onPress: () => {},
          subtitle: userProfile?.accountInfo.verificationStatus || 'Verified • Active',
        },
        {
          id: 'account-type',
          title: 'Account Type',
          icon: <Users size={20} color="#8B5CF6" />,
          onPress: () => navigation.navigate('AccountType' as any),
          subtitle: userProfile ? getAccountTypeDisplay(userProfile.accountInfo) : 'User',
          showChevron: true,
        },
      ],
    },
    {
      id: 'security',
      title: 'Security & Privacy',
      items: [
        {
          id: 'change-pin',
          title: 'Change PIN',
          icon: <Lock size={20} color="#DC2626" />,
          onPress: () => navigation.navigate('ChangePin'),
          showChevron: true,
        },
        {
          id: 'permissions',
          title: 'Permissions',
          icon: <ShieldCheck size={20} color="#059669" />,
          onPress: () => navigation.navigate('Permissions'),
          showChevron: true,
          subtitle: 'Location sharing',
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payments & Financial',
      items: [
        {
          id: 'payment-methods',
          title: 'Payment Methods',
          icon: <CreditCard size={20} color="#059669" />,
          onPress: () => navigation.navigate('PaymentMethods'),
          subtitle: 'Manage cards and wallets',
          showChevron: true,
        },
        {
          id: 'addresses',
          title: 'Delivery Addresses',
          icon: <MapPin size={20} color="#DC2626" />,
          onPress: () => navigation.navigate('Delivery'),
          subtitle: 'Manage delivery locations',
          showChevron: true,
        },

      ],
    },

    

    {
      id: 'support',
      title: 'Help & Support',
      items: [
        {
          id: 'contact-support',
          title: 'Contact Support',
          icon: <Phone size={20} color="#10B981" />,
          onPress: handleContactSupport,
          subtitle: 'Call us anytime',
        },
        {
          id: 'email-support',
          title: 'Email Support',
          icon: <Mail size={20} color="#6B7280" />,
          onPress: handleEmailSupport,
          subtitle: 'customercare@cloudnexus.biz',
        },
      ],
    },
    {
      id: 'legal',
      title: 'Legal & Terms',
      items: [
        {
          id: 'terms-of-service',
          title: 'Terms of Service',
          icon: <FileText size={20} color="#6B7280" />,
          onPress: () => navigation.navigate('ServiceTerms'),
          showChevron: true,
        },
        {
          id: 'privacy-policy',
          title: 'Privacy Policy',
          icon: <Shield size={20} color="#6B7280" />,
          onPress: () => navigation.navigate('PrivacyPolicy'),
          showChevron: true,
        },

      ],
    },
    {
      id: 'account-actions',
      title: '',
      items: [
        {
          id: 'delete-account',
          title: 'Delete Account',
          icon: <Trash2 size={20} color="#DC2626" />,
          onPress: () => navigation.navigate('AccountDeletion' as any),
          isDestructive: true,
          showChevron: true,
          subtitle: 'Permanent and irreversible',
        },
        {
          id: 'logout',
          title: 'Log Out',
          icon: <LogOut size={20} color="#DC2626" />,
          onPress: handleLogout,
          isDestructive: true,
        },
      ],
    },
  ]

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      style={[
        styles.menuItem,
        item.isDisabled && styles.menuItemDisabled
      ]}
      onPress={item.onPress}
      disabled={item.isDisabled}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.iconContainer}>
          {item.icon}
        </View>
        <View style={styles.menuItemContent}>
          <Text style={[
            styles.menuItemTitle,
            item.isDestructive && styles.menuItemTitleDestructive
          ]}>
            {item.title}
          </Text>
          {item.subtitle && (
            <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.menuItemRight}>
        {item.showBadge && item.badgeText && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badgeText}</Text>
          </View>
        )}
        
        {item.isToggle ? (
          <Switch
            value={item.toggleValue}
            onValueChange={item.onToggleChange}
            trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
            thumbColor={item.toggleValue ? '#2563EB' : '#F3F4F6'}
          />
        ) : item.showChevron ? (
          <ChevronRight size={20} color="#9CA3AF" />
        ) : null}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Account Settings</Text>
          <View style={styles.headerRight} />
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileImageContainer}>
            {getProfileImageUrl() ? (
              <Image
                source={{ uri: getProfileImageUri() as string }}
                style={styles.profileImage as any}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.profileImage}>
                <User size={40} color="#6B7280" />
              </View>
            )}
            {isUploadingPhoto && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.uploadText}>Uploading...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.editImageButton} onPress={handleEditProfileImage} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Camera size={16} color="#FFFFFF" />
              )}
              </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {getDisplayName()}
            </Text>
            <Text style={styles.profilePhone}>
              {getDisplayPhone()}
            </Text>
            <View style={styles.profileStatus}>
              {loadingProfile ? (
                <>
                  <ClockIcon size={16} color="#6B7280" />
                  <Text style={[styles.profileStatusText, { color: '#6B7280' }]}>
                    Loading profile...
                  </Text>
                </>
              ) : userProfile ? (
                <>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={[styles.profileStatusText, { color: '#10B981' }]}>
                    Active Account
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.profileStatusText}>Verified Account</Text>
                </>
              )}
            </View>
            {userProfile && (
              <View style={styles.accountTypeContainer}>
                <Text style={styles.accountTypeText}>
                  {getAccountTypeDisplay(userProfile.accountInfo)}
                </Text>
                {userProfile.accountInfo.isDriver && userProfile.driver?.isOnline && (
                  <View style={styles.onlineIndicator}>
                    <View style={styles.onlineDot} />
                    <Text style={styles.onlineText}>Online</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          </View>

        {/* Delivery Addresses moved to dedicated Delivery screen */}

        {/* Settings List */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
          {categories.map((category, index) => (
            <View key={category.id}>
              {category.title && (
                <Text style={styles.categoryTitle}>{category.title}</Text>
              )}
              {category.id === 'profile' ? (
                // Grid layout for Profile & Account section
                <View style={styles.gridContainer}>
                  {category.items.map((item, itemIndex) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.gridItem,
                        itemIndex % 2 === 0 ? styles.gridItemLeft : styles.gridItemRight
                      ]}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.gridItemContent}>
                        <View style={styles.gridItemIcon}>
                          {item.icon}
                        </View>
                        <Text style={styles.gridItemTitle}>{item.title}</Text>
                        {item.subtitle && (
                          <Text style={styles.gridItemSubtitle}>{item.subtitle}</Text>
                        )}
                        {item.showChevron && (
                          <View style={styles.gridItemChevron}>
                            <ChevronRight size={16} color="#9CA3AF" />
                          </View>
                        )}
              </View>
            </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Regular list layout for other sections
                <View style={styles.categoryContainer}>
                  {category.items.map(renderMenuItem)}
              </View>
              )}
              {category.showDivider && index < categories.length - 1 && (
                <View style={styles.divider} />
              )}
              </View>
          ))}
          
          {/* App Version at Bottom */}
          <View style={styles.appVersionContainer}>
            <Text style={styles.appVersionText}>Version {ENV_CONFIG.APP_VERSION}</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionLoadingText: {
    color: '#6B7280',
  },
  noDeliveryOptions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  noDeliveryOptionsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginTop: 10,
    marginBottom: 6,
    textAlign: 'center',
  },
  noDeliveryOptionsText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  addressList: {
    marginTop: 4,
    marginBottom: 8,
    gap: 10,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  selectedAddressItem: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  addressItemContent: {
    flex: 1,
    marginLeft: 10,
  },
  addressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressItemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 6,
    marginRight: 8,
  },
  addressItemText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  deleteAddressButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginLeft: 8,
  },
  addNewAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addNewAddressButtonText: {
    color: '#2563EB',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 6,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  profilePhone: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileStatusText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 4,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemTitleDestructive: {
    color: '#DC2626',
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  accountTypeText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  onlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  gridItem: {
    width: '48%', // Two items per row
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  gridItemLeft: {
    marginRight: '2%', // Space between items
  },
  gridItemRight: {
    marginLeft: '2%', // Space between items
  },
  gridItemContent: {
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  gridItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  gridItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  gridItemSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  gridItemChevron: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appVersionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  appVersionText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
}) 