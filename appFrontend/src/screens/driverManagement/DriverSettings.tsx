import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { useAuth } from '../../contexts/AuthContext'
import { driverService, type DriverStats } from '../../services/driverService'
import { rentalService, type RentalDriver } from '../../services/rentalService'
import { userService, type UserProfileData } from '../../services/userService'
import { api } from '../../api/api'

type DriverSettingsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'DriverSettings'>

export function DriverSettings() {
  const navigation = useNavigation<DriverSettingsScreenNavigationProp>()
  const { user } = useAuth()
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null)
  const [driverStats, setDriverStats] = useState<DriverStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDriver, setIsDriver] = useState(false)

  useEffect(() => {
    checkDriverStatus()
  }, [])

  useEffect(() => {
    if (isDriver) {
      loadDriverData()
    }
  }, [isDriver])

  const checkDriverStatus = async () => {
    try {
      console.log('🔍 Checking driver status for user:', user?.id)
      const profileData = await userService.getUserProfile()
      console.log('📊 User profile data:', profileData)
      console.log('📊 Account info:', profileData?.accountInfo)
      console.log('📊 Driver data:', profileData?.driver)
      
      if (profileData && profileData.accountInfo && profileData.accountInfo.isDriver) {
        setIsDriver(true)
        setUserProfile(profileData)
        console.log('✅ User is a driver - isDriver:', profileData.accountInfo.isDriver)
        console.log('✅ Driver details:', profileData.driver)
      } else {
        setIsDriver(false)
        console.log('❌ User is not a driver - isDriver:', profileData?.accountInfo?.isDriver)
        console.log('❌ Account info available:', !!profileData?.accountInfo)
      }
    } catch (error) {
      console.error('❌ Error checking driver status:', error)
      setIsDriver(false)
    }
  }

  const loadDriverData = async () => {
    try {
      setLoading(true)
      
      // Only load driver stats if user is a driver
      if (isDriver) {
        console.log('📊 Loading driver stats...')
        const statsResponse = await driverService.getDriverStats()
        console.log('📊 Driver stats response:', statsResponse)
        console.log('📊 Today online hours:', statsResponse.todayOnlineHours)
        console.log('📊 General online hours:', statsResponse.onlineHours)
        setDriverStats(statsResponse)
      }
    } catch (error) {
      console.error('Error loading driver data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    try {
      setRefreshing(true)
      console.log('🔄 Refreshing driver settings data...')
      
      // Refresh driver status and profile data
      await checkDriverStatus()
      
      // If user is a driver, also refresh driver stats
      if (isDriver) {
        await loadDriverData()
      }
      
      console.log('✅ Driver settings data refreshed successfully')
    } catch (error) {
      console.error('❌ Error refreshing driver settings data:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleNavigateToDriverProfile = () => {
    navigation.navigate('DriverProfile')
  }

  const handleNavigateToDriverEarnings = () => {
    navigation.navigate('DriverEarnings')
  }

  const handleNavigateToDriverRequests = () => {
    navigation.navigate('DriverRequests')
  }



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Driver Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']} // Android
            tintColor="#3B82F6" // iOS
            title="Pull to refresh" // iOS
            titleColor="#6B7280" // iOS
          />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingIcon}>
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.loadingTitle}>Loading Driver Information...</Text>
            <Text style={styles.loadingText}>
              Please wait while we check your driver status.
            </Text>
          </View>
        ) : !isDriver ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="car-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Driver Account Required</Text>
            <Text style={styles.emptyText}>
              You need to be a verified driver to access driver management features.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Coming Soon', 'Driver registration will be available soon')
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Become a Driver</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Driver Overview Cards */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Driver Overview</Text>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="car-sport" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.overviewValue}>{driverStats?.totalRides || 0}</Text>
                  <Text style={styles.overviewLabel}>Total Rides</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="cash" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.overviewValue}>
                    {driverStats?.totalEarnings && driverStats.totalEarnings > 0 
                      ? `${driverStats.currencySymbol || 'D'}${driverStats.totalEarnings.toFixed(2)}`
                      : '0'
                    }
                  </Text>
                  <Text style={styles.overviewLabel}>Total Earnings</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="star" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.overviewValue}>{driverStats?.rating?.toFixed(1) || '0.0'}</Text>
                  <Text style={styles.overviewLabel}>Rating</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="time" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.overviewValue}>{driverStats?.todayOnlineHours || driverStats?.onlineHours || 0}h</Text>
                  <Text style={styles.overviewLabel}>Online Today</Text>
                </View>
              </View>
            </View>

            {/* Driver Status */}
            <View style={styles.statusSection}>
              <Text style={styles.sectionTitle}>Driver Status</Text>
              <View style={styles.statusCard}>
                  <View style={styles.statusContent}>
                    <View style={styles.statusIcon}>
                      <Ionicons 
                        name={userProfile?.driver?.isOnline ? "radio-button-on" : "radio-button-off"} 
                        size={24} 
                        color={userProfile?.driver?.isOnline ? "#10B981" : "#EF4444"} 
                      />
                    </View>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusTitle}>
                        {userProfile?.driver?.isOnline ? 'Online' : 'Offline'}
                      </Text>
                      <Text style={styles.statusSubtitle}>
                        {userProfile?.driver?.isOnline 
                          ? 'Ready to accept ride requests' 
                          : 'Not accepting ride requests'
                        }
                      </Text>
                      <Text style={styles.statusDetail}>
                        Status: {userProfile?.driver?.status || 'UNKNOWN'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verificationBadge}>
                    <Ionicons 
                      name={userProfile?.driver?.isVerified ? "checkmark-circle" : "alert-circle"} 
                      size={20} 
                      color={userProfile?.driver?.isVerified ? "#10B981" : "#F59E0B"} 
                    />
                    <Text style={[
                      styles.verificationText,
                      { color: userProfile?.driver?.isVerified ? "#10B981" : "#F59E0B" }
                    ]}>
                      {userProfile?.driver?.isVerified ? 'Verified' : 'Pending'}
                    </Text>
                  </View>
              </View>
            </View>

            {/* Driver Management Sections */}
            <View style={styles.managementSection}>
              <Text style={styles.sectionTitle}>Driver Management</Text>
              
              {/* Profile Card */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={handleNavigateToDriverProfile}
              >
                <View style={styles.managementCardContent}>
                  <View style={styles.managementIcon}>
                    <Ionicons name="person" size={28} color="#3B82F6" />
                  </View>
                  <View style={styles.managementInfo}>
                    <Text style={styles.managementTitle}>Driver Profile</Text>
                    <Text style={styles.managementSubtitle}>
                      Manage your personal information
                    </Text>
                    <Text style={styles.managementCount}>
                      {userProfile?.user?.firstName} {userProfile?.user?.lastName}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Earnings Card */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={handleNavigateToDriverEarnings}
              >
                <View style={styles.managementCardContent}>
                  <View style={styles.managementIcon}>
                    <Ionicons name="analytics" size={28} color="#10B981" />
                  </View>
                  <View style={styles.managementInfo}>
                    <Text style={styles.managementTitle}>Earnings & Analytics</Text>
                    <Text style={styles.managementSubtitle}>
                      View your earnings and performance
                    </Text>
                    <Text style={styles.managementCount}>
                      Today: {driverStats?.todayEarnings && driverStats.todayEarnings > 0 
                        ? `${driverStats.currencySymbol || 'D'}${driverStats.todayEarnings.toFixed(2)}`
                        : '0'
                      }
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Ride History Card */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={handleNavigateToDriverRequests}
              >
                <View style={styles.managementCardContent}>
                  <View style={styles.managementIcon}>
                    <Ionicons name="list" size={28} color="#F59E0B" />
                  </View>
                  <View style={styles.managementInfo}>
                    <Text style={styles.managementTitle}>Ride History</Text>
                    <Text style={styles.managementSubtitle}>
                      View and manage your ride requests
                    </Text>
                    <Text style={styles.managementCount}>
                      {driverStats?.totalRides || 0} completed rides
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>

            </View>


          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 16,
    paddingBottom: 12,
    minHeight: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 56 : 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBack: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Loading state styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  // Empty state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  // Section styles
  overviewSection: {
    marginBottom: 32,
  },
  statusSection: {
    marginBottom: 32,
  },
  managementSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  // Overview grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  overviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Status card
  statusCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    marginRight: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statusDetail: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Management cards
  managementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  managementCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  managementIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  managementInfo: {
    flex: 1,
  },
  managementTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  managementSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  managementCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
})
