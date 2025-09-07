import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../../navigation/AppNavigator'
import { api } from '../../api/api'

type DriverProfileScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'DriverProfile'>

interface DriverProfileData {
  id?: string;
  userId?: string;
  driverId?: string;
  isOnline?: boolean;
  status?: string;
  isVerified?: boolean;
  isActive?: boolean;
  totalRides?: number;
  totalEarnings?: number;
  rating?: number;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
  user?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
  };
  riderApplication?: {
    vehicleModel?: string;
    vehiclePlate?: string;
    licenseNumber?: string;
    status?: string;
  };
}

export function DriverProfile() {
  const navigation = useNavigation<DriverProfileScreenNavigationProp>()
  const [driverProfile, setDriverProfile] = useState<DriverProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDriverProfile()
  }, [])

  const loadDriverProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('📋 Loading driver profile...')
      const response = await api.get('/api/driver/profile')
      
      if (response.data.success && response.data.data) {
        console.log('✅ Driver profile loaded:', response.data.data)
        setDriverProfile(response.data.data)
      } else {
        throw new Error('Failed to load driver profile')
      }
    } catch (error: any) {
      console.error('❌ Error loading driver profile:', error)
      setError(error.response?.data?.message || error.message || 'Failed to load driver profile')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return '#10B981'
      case 'offline':
        return '#6B7280'
      case 'busy':
        return '#F59E0B'
      case 'suspended':
        return '#EF4444'
      default:
        return '#6B7280'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'radio-button-on'
      case 'offline':
        return 'radio-button-off'
      case 'busy':
        return 'pause-circle'
      case 'suspended':
        return 'ban'
      default:
        return 'help-circle'
    }
  }

  if (loading) {
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
          <Text style={styles.title}>Driver Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading driver profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
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
          <Text style={styles.title}>Driver Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Error Loading Profile</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadDriverProfile}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
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
        <Text style={styles.title}>Driver Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {driverProfile && (
          <>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Ionicons name="person" size={48} color="#3B82F6" />
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.driverName}>
                  {driverProfile.user?.firstName || 'Unknown'} {driverProfile.user?.lastName || 'Driver'}
                </Text>
                <Text style={styles.driverId}>ID: {driverProfile.driverId || 'Unknown'}</Text>
                <View style={styles.statusContainer}>
                  <Ionicons 
                    name={getStatusIcon(driverProfile.status || 'OFFLINE')} 
                    size={16} 
                    color={getStatusColor(driverProfile.status || 'OFFLINE')} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(driverProfile.status || 'OFFLINE') }]}>
                    {driverProfile.status || 'OFFLINE'}
                  </Text>
                </View>
              </View>
            </View>


            {/* Personal Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="person-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Full Name</Text>
                    <Text style={styles.infoValue}>
                      {driverProfile.user?.firstName || 'Unknown'} {driverProfile.user?.lastName || 'Driver'}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="call-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone Number</Text>
                    <Text style={styles.infoValue}>{driverProfile.user?.phoneNumber || 'Not specified'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member Since</Text>
                    <Text style={styles.infoValue}>{driverProfile.createdAt ? formatDate(driverProfile.createdAt) : 'Unknown'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Vehicle Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="car-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Vehicle Model</Text>
                    <Text style={styles.infoValue}>{driverProfile.riderApplication?.vehicleModel || 'Not specified'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="card-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>License Plate</Text>
                    <Text style={styles.infoValue}>{driverProfile.riderApplication?.vehiclePlate || 'Not specified'}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="document-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>License Number</Text>
                    <Text style={styles.infoValue}>{driverProfile.riderApplication?.licenseNumber || 'Not specified'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Account Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Status</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoRow}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={driverProfile.isVerified ? "#10B981" : "#6B7280"} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Verification Status</Text>
                    <Text style={[styles.infoValue, { color: driverProfile.isVerified ? "#10B981" : "#6B7280" }]}>
                      {driverProfile.isVerified ? "Verified" : "Not Verified"}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="power-outline" size={20} color={driverProfile.isActive ? "#10B981" : "#6B7280"} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Account Status</Text>
                    <Text style={[styles.infoValue, { color: driverProfile.isActive ? "#10B981" : "#6B7280" }]}>
                      {driverProfile.isActive ? "Active" : "Inactive"}
                    </Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Ionicons name="time-outline" size={20} color="#6B7280" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Last Updated</Text>
                    <Text style={styles.infoValue}>{driverProfile.updatedAt ? formatDate(driverProfile.updatedAt) : 'Unknown'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.refreshButton} onPress={loadDriverProfile}>
                <Ionicons name="refresh-outline" size={20} color="#6B7280" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    color: '#6B7280',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  driverId: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  refreshButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  refreshButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
})
