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
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

type SellerDashboardNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SellerDashboard'>

export function SellerDashboard() {
  const navigation = useNavigation<SellerDashboardNavigationProp>()
  const { user, token } = useAuth()
  const [kycStatus, setKycStatus] = useState<SellerKycResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  // Add focus listener to refresh data when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkKycStatus(true)
    })

    return unsubscribe
  }, [navigation, checkKycStatus])

  // Initial load
  useEffect(() => {
    checkKycStatus()
  }, [token, checkKycStatus])

  // Mock data - replace with actual API call
  const stats = {
    totalProducts: 42,
    activeProducts: 38,
    totalSales: 156,
    pendingOrders: 5,
    totalRevenue: 12500,
    averageRating: 4.8,
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Seller Verification</Text>
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
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Seller Verification</Text>
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

  // Show dashboard only if status is approved
  if (kycStatus?.status === 'APPROVED') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFFFF"
          translucent
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home')}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Seller Dashboard</Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>

          <View style={styles.revenueCard}>
            <View style={styles.revenueHeader}>
              <Text style={styles.revenueTitle}>Total Revenue</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('RevenueDetails' as any)}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.revenueValue}>${stats.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.revenueSubtitle}>USD (Default)</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.rating}>{stats.averageRating}</Text>
              <Text style={styles.ratingLabel}>Average Rating</Text>
            </View>
          </View>


            <View style={styles.statsContainer}>
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

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate('InterestManagement')}
              >
                <Ionicons name="heart-outline" size={24} color="#2563EB" />
                <Text style={styles.actionButtonText}>Manage Interests</Text>
              </TouchableOpacity>
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
  revenueTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
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
}) 