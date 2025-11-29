import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Package,
  Users,
  DollarSign,
  Plus,
  TrendingUp,
  AlertCircle,
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../components/Button'
import type { AppStackParamList } from '../navigation/AppNavigator'
import { useAuth } from '../contexts/AuthContext'
import { kycService, type SellerKycResponse } from '../services/kycService'
import { interestService, type Interest } from '../services/interestService'
import { productService, type SellerStats } from '../services/productService'
import { salesRepService, type SalesRep } from '../services/salesRepService'
import { getImageUrl } from '../utils/imageUtils'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

type SellerDashboardNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerDashboard'>

export function SellerDashboard() {
  const navigation = useNavigation<SellerDashboardNavigationProp>()
  const { user, token } = useAuth()
  const [kycStatus, setKycStatus] = useState<SellerKycResponse | null>(null)
  const [salesRepStatus, setSalesRepStatus] = useState<SalesRep | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customerInterests, setCustomerInterests] = useState<Interest[]>([])
  const [interestsLoading, setInterestsLoading] = useState(false)
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    activeProducts: 0,
    totalSales: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    revenueCurrency: 'USD',
    hasOtherCurrencies: false
  })
  const [statsLoading, setStatsLoading] = useState(false)

  // Get current user from JWT token to ensure fresh data
  const getCurrentUserFromToken = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('token')
      if (!storedToken) {
        console.log('No token found')
        return null
      }

      // Decode JWT token to get user info
      const tokenParts = storedToken.split('.')
      if (tokenParts.length !== 3) {
        console.log('Invalid token format')
        return null
      }

      const payload = JSON.parse(atob(tokenParts[1]))
      const currentUserId = payload.userId || payload.sub || payload.id
      
      console.log('Current user ID from token:', currentUserId)
      return currentUserId
    } catch (error) {
      console.error('Error getting user from token:', error)
      return null
    }
  }

  const checkKycStatus = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      }

      // Check token and KYC status in parallel
      const [storedToken, kycResponse] = await Promise.all([
        AsyncStorage.getItem('token'),
        kycService.getKycStatus()
      ]);

      if (!storedToken) {
        console.log('No token found')
        setKycStatus(null)
        return
      }

      setKycStatus(kycResponse)
    } catch (error) {
      console.error('Error checking KYC status:', error)
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setKycStatus(null)
      } else if (axios.isAxiosError(error) && error.response?.status === 401) {
        setKycStatus(null)
      } else {
        setKycStatus(null)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const checkSalesRepStatus = useCallback(async () => {
    const currentUserId = await getCurrentUserFromToken()
    if (!currentUserId) return

    try {
      console.log('Checking sales rep status for user:', currentUserId)
      
      // Use cached sales rep check for better performance
      const { isSalesRep, salesRepData } = await salesRepService.getSalesRepStatusCached(currentUserId)
      
      if (isSalesRep && salesRepData && salesRepData.status === 'ACTIVE' && salesRepData.userId === currentUserId) {
        console.log('User is an active sales rep:', salesRepData)
        setSalesRepStatus(salesRepData)
        // Sales reps don't need their own KYC, they inherit access from parent
        // Set a mock KYC status to allow dashboard access
        setKycStatus({
          status: 'APPROVED',
          id: 'sales-rep-inherited',
          userId: currentUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      } else {
        console.log('User is not an active sales rep or user ID mismatch')
        setSalesRepStatus(null)
      }
    } catch (error) {
      console.error('Error checking sales rep status:', error)
      setSalesRepStatus(null)
    }
  }, [])

  const loadCustomerInterests = useCallback(async () => {
    const isApproved = kycStatus?.status === 'APPROVED' || salesRepStatus?.status === 'ACTIVE'
    if (!isApproved) return
    
    try {
      setInterestsLoading(true)
      const response = await interestService.getCustomerInterests(1, 20) // Get more to filter
      
      // Filter out rejected and cancelled interests
      const filteredInterests = response.interests.filter(interest => 
        interest.status === 'PENDING'
      )
      
      setCustomerInterests(filteredInterests.slice(0, 10)) // Show only first 10 after filtering
    } catch (error) {
      console.error('Error loading customer interests:', error)
    } finally {
      setInterestsLoading(false)
    }
  }, [kycStatus?.status, salesRepStatus?.status])

  const loadSellerStats = useCallback(async () => {
    const isApproved = kycStatus?.status === 'APPROVED' || salesRepStatus?.status === 'ACTIVE'
    if (!isApproved) return
    
    try {
      setStatsLoading(true)
      const statsData = await productService.getSellerStats()
      setStats(statsData)
    } catch (error) {
      console.error('Error loading seller stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }, [kycStatus?.status, salesRepStatus?.status])

  // Add focus listener to refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      // Always get fresh user from token on focus
      const currentUserId = await getCurrentUserFromToken()
      if (!currentUserId) return
      
      // Clear state first to ensure fresh data
      setKycStatus(null)
      setSalesRepStatus(null)
      setCustomerInterests([])
      setStats({
        totalProducts: 0,
        activeProducts: 0,
        totalSales: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        revenueCurrency: 'USD',
        hasOtherCurrencies: false
      })
      
      // Then check status with fresh data
      await checkSalesRepStatus()
      await checkKycStatus(true)
    })

    return unsubscribe
  }, [navigation, checkKycStatus, checkSalesRepStatus])

  // Initial load - always get fresh user from token
  useEffect(() => {
    const initializeDashboard = async () => {
      const currentUserId = await getCurrentUserFromToken()
      if (!currentUserId) {
        setLoading(false)
        return
      }
      
      // Clear any existing state
      setKycStatus(null)
      setSalesRepStatus(null)
      setCustomerInterests([])
      setStats({
        totalProducts: 0,
        activeProducts: 0,
        totalSales: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        revenueCurrency: 'USD',
        hasOtherCurrencies: false
      })
      
      // Load fresh data
      await checkSalesRepStatus()
      await checkKycStatus()
    }
    
    initializeDashboard()
  }, [token, checkKycStatus, checkSalesRepStatus])

  // Load customer interests and stats when KYC is approved or user is active sales rep
  useEffect(() => {
    const isApproved = kycStatus?.status === 'APPROVED' || salesRepStatus?.status === 'ACTIVE'
    if (isApproved) {
      loadCustomerInterests()
      loadSellerStats()
    }
  }, [kycStatus?.status, salesRepStatus?.status, loadCustomerInterests, loadSellerStats])

  // Mock data for rating - replace with actual API call
  const ratingData = {
    averageRating: 4.8,
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    } else {
      return 'Just now'
    }
  }

  const getCurrencySymbol = (currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
      MXN: '$',
      KRW: '₩',
      SGD: 'S$',
      HKD: 'HK$',
      NZD: 'NZ$',
    };
    return currencySymbols[currencyCode] || currencyCode;
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return '#F59E0B';
      case 'CONFIRMED': return '#10B981';
      case 'ACCEPTED': return '#059669';
      case 'REJECTED': return '#EF4444';
      case 'CANCELLED': return '#6B7280';
      case 'EXPIRED': return '#6B7280';
      default: return '#6B7280';
    }
  }

  const getStatusDisplayName = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return 'Pending';
      case 'CONFIRMED': return 'Confirmed';
      case 'ACCEPTED': return 'Accepted';
      case 'REJECTED': return 'Rejected';
      case 'CANCELLED': return 'Cancelled';
      case 'EXPIRED': return 'Expired';
      default: return status;
    }
  }


  const handleChatPress = (interestId: string) => {
    console.log('=== NAVIGATION DEBUG ===');
    console.log('Navigating to SellerInterestDetail with interestId:', interestId);
    console.log('Navigation object:', navigation);
    console.log('Current route:', navigation.getState().routes);
    
    try {
      // Explicitly navigate to SellerInterestDetail with the correct parameters
      // This should be the same navigation that works for the chat icon
      navigation.navigate('SellerInterestDetail', { interestId });
      console.log('Navigation call completed successfully');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  const handleViewAllInterests = () => {
    navigation.navigate('InterestManagement')
  }

  if (loading || refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>
            {refreshing ? 'Refreshing...' : 'Loading your dashboard...'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  // Check for pending status first
  if (kycStatus?.status === 'PENDING') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Seller Verification</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.content}>
            <View style={styles.kycContainer}>
              <View style={[styles.kycIconContainer, styles.pendingIcon]}>
                <Ionicons name="time-outline" size={64} color="#F59E0B" />
              </View>
              <Text style={styles.kycTitle}>Verification in Progress</Text>
              <Text style={styles.kycDescription}>
                Your seller verification is being reviewed. We'll notify you once it's approved.
              </Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#2563EB" />
                <Text style={styles.infoText}>
                  You cannot submit a new verification while your current submission is being reviewed.
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // Then check for rejected status
  if (kycStatus?.status === 'REJECTED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Seller Verification</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.content}>
            <View style={styles.kycContainer}>
              <View style={[styles.kycIconContainer, styles.rejectedIcon]}>
                <Ionicons name="alert-circle-outline" size={64} color="#DC2626" />
              </View>
              <Text style={styles.kycTitle}>Verification Rejected</Text>
              <Text style={styles.kycDescription}>
                Your seller verification was not approved. Please review and update your information.
              </Text>
              <Button
                label="Update Verification"
                onPress={() => navigation.navigate('SellerKycForm')}
                style={styles.kycButton}
              />
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // Then check for suspended status
  if (((kycStatus?.status || '') as string).toString().toUpperCase() === 'SUSPENDED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Seller Verification</Text>
            <View style={styles.placeholder} />
          </View>
          <ScrollView style={styles.content}>
            <View style={styles.kycContainer}>
              <View style={[styles.kycIconContainer, styles.rejectedIcon]}>
                <Ionicons name="warning-outline" size={64} color="#DC2626" />
              </View>
              <Text style={styles.kycTitle}>Account Suspended</Text>
              <Text style={styles.kycDescription}>
                Your seller account has been suspended. Please contact support for more information.
              </Text>
              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={24} color="#2563EB" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoText}>
                    You cannot submit a new verification while your account is suspended. Contact support for assistance.
                  </Text>
                  <Text style={[styles.infoText, { marginTop: 8, color: '#0F172A', fontWeight: '600' }]}>
                    Contact Support:
                  </Text>
                  <Text style={[styles.infoText, { color: '#334155' }]}>
                    Email: customercare@cloudnexus.biz
                  </Text>
                  <Text style={[styles.infoText, { color: '#334155' }]}>
                    Phone: +220 673 8885
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // Show dashboard if KYC is approved OR user is an active sales rep
  const isApproved = kycStatus?.status === 'APPROVED' || salesRepStatus?.status === 'ACTIVE'
  console.log('Dashboard access check:', {
    kycStatus: kycStatus?.status,
    salesRepStatus: salesRepStatus?.status,
    isApproved
  })
  
  if (isApproved) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent={false}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>
              {salesRepStatus?.status === 'ACTIVE' ? 'Sales Rep Dashboard' : 'Seller Dashboard'}
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>

          <TouchableOpacity 
            style={styles.revenueCard}
            onPress={() => navigation.navigate('RevenueDetails' as any)}
            activeOpacity={0.7}
          >
            <View style={styles.revenueHeader}>
              <View style={styles.revenueTitleContainer}>
                <Text style={styles.revenueTitle}>Total Revenue</Text>
                {salesRepStatus?.status === 'ACTIVE' && (
                  <View style={styles.salesRepBadge}>
                    <Text style={styles.salesRepBadgeText}>Sales Rep</Text>
                  </View>
                )}
              </View>
              <View style={styles.viewAllButton}>
                <Text style={styles.viewAllText}>
                  {stats.hasOtherCurrencies ? 'View All Currencies' : 'View All'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </View>
            </View>
            <Text style={styles.revenueValue}>
              {getCurrencySymbol(stats.revenueCurrency)} {stats.totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.revenueSubtitle}>
              {stats.revenueCurrency} {stats.hasOtherCurrencies ? '(Latest TNX)' : ''}
            </Text>
            {salesRepStatus?.status === 'ACTIVE' && (
              <Text style={styles.salesRepInfo}>
                Branch: {salesRepStatus.branchName}
                {salesRepStatus.branchLocation && ` - ${salesRepStatus.branchLocation}`}
              </Text>
            )}
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.rating}>{ratingData.averageRating}</Text>
              <Text style={styles.ratingLabel}>Average Rating</Text>
            </View>
          </TouchableOpacity>


            <View style={styles.statsContainer}>
              {statsLoading ? (
                <View style={styles.statsLoading}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.statsLoadingText}>Loading stats...</Text>
                </View>
              ) : (
                <>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalProducts}</Text>
                  <Text style={styles.statLabel}>Total Products</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.activeProducts}</Text>
                  <Text style={styles.statLabel}>Active Products</Text>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.totalSales}</Text>
                  <Text style={styles.statLabel}>Total Sales</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                  <Text style={styles.statLabel}>Pending Orders</Text>
                </View>
              </View>
                </>
              )}
            </View>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('AddProduct' as any)}
              >
                <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
                <Text style={styles.actionButtonText}>Add New Product</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('ProductListing')}
              >
                <Ionicons name="list-outline" size={24} color="#2563EB" />
                <Text style={styles.actionButtonText}>Product Listing</Text>
              </TouchableOpacity>
            </View>

            {/* Customer Interests Section */}
            <View style={styles.interestsSection}>
              <View style={styles.interestsHeader}>
                <Text style={styles.interestsTitle}>Active Interests</Text>
                <TouchableOpacity
                  style={styles.viewAllButton}
                  onPress={handleViewAllInterests}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                </TouchableOpacity>
              </View>

              {interestsLoading ? (
                <View style={styles.interestsLoading}>
                  <ActivityIndicator size="small" color="#2563EB" />
                  <Text style={styles.interestsLoadingText}>Loading interests...</Text>
                </View>
              ) : customerInterests.length > 0 ? (
                <View style={styles.interestsList}>
                  {customerInterests.map((interest) => (
              <TouchableOpacity
                      key={interest.id}
                      style={styles.interestCard}
                      onPress={() => {
                        console.log('Interest card pressed, calling handleChatPress with interestId:', interest.id);
                        handleChatPress(interest.id);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.interestProductInfo}>
                        <Image
                          source={{ 
                            uri: interest.product.image 
                              ? (getImageUrl(interest.product.image) || 'https://via.placeholder.com/60x60?text=No+Image')
                              : 'https://via.placeholder.com/60x60?text=No+Image'
                          }}
                          style={styles.interestProductImage}
                          resizeMode="cover"
                        />
                        <View style={styles.interestDetails}>
                          <Text style={styles.interestProductName} numberOfLines={2}>
                            {interest.product.title}
                          </Text>
                          <Text style={styles.interestCustomerName}>
                            {interest.customer?.name || 'Unknown Customer'}
                          </Text>
                          <Text style={styles.interestTime}>
                            {formatTimeAgo(interest.createdAt)}
                          </Text>
                          <Text style={styles.interestQuantity}>
                            Qty: {interest.quantity}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.rightColumn}>
                        <View style={styles.chatButton}>
                          <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                          <Text style={styles.chatButtonText}>Chat</Text>
                        </View>
                        <View style={[
                          styles.statusBadge, 
                          { backgroundColor: `${getStatusColor(interest.status)}20` }
                        ]}>
                          <Text style={[
                            styles.statusText, 
                            { color: getStatusColor(interest.status) }
                          ]}>
                            {getStatusDisplayName(interest.status)}
                          </Text>
                        </View>
                      </View>
              </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.noInterestsContainer}>
                  <Ionicons name="heart-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.noInterestsText}>No active interests</Text>
                  <Text style={styles.noInterestsSubtext}>
                    Active customer interests will appear here. Rejected and cancelled interests are hidden.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    )
  }

  // If no KYC status (null) or any other status, show the "Become a Seller" screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Become a Seller</Text>
          <View style={styles.placeholder} />
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.kycContainer}>
            <View style={styles.kycIconContainer}>
              <Ionicons name="storefront-outline" size={64} color="#2563EB" />
            </View>
            <Text style={styles.kycTitle}>Start Selling Today</Text>
            <Text style={styles.kycDescription}>
              Complete your seller verification to start listing products and making sales.
            </Text>
          </View>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            label="Get Started"
            onPress={() => navigation.navigate('SellerKycForm')}
            style={styles.kycButton}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 16,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 64 : 64,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  settingsButton: {
    padding: 12,
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'column',
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  revenueCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
  },
  revenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  revenueTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  revenueTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  salesRepBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  salesRepBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  salesRepInfo: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  revenueValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  revenueSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  ratingLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 4,
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
  },
  kycContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  kycIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  rejectedIcon: {
    backgroundColor: '#FEE2E2',
  },
  pendingIcon: {
    backgroundColor: '#FEF3C7',
  },
  kycTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  kycDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  kycButton: {
    width: '100%',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  interestsSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  interestsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  interestsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  interestsLoading: {
    alignItems: 'center',
    padding: 20,
  },
  interestsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
  interestsList: {
    gap: 12,
  },
  interestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  interestProductInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  interestProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  interestDetails: {
    flex: 1,
  },
  interestProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  rightColumn: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  interestCustomerName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  interestTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  interestQuantity: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noInterestsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noInterestsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  noInterestsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsLoading: {
    alignItems: 'center',
    padding: 20,
  },
  statsLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
}) 