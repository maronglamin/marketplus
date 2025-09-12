import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { useAuth } from '../contexts/AuthContext'
import { salesRepService, type SalesRep } from '../services/salesRepService'
import { branchService, type Branch } from '../services/branchService'
import { api } from '../api/api'

type SettingsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'Settings'>

export function Settings() {
  const navigation = useNavigation<SettingsScreenNavigationProp>()
  const { user } = useAuth()
  const [salesReps, setSalesReps] = useState<SalesRep[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [isSeller, setIsSeller] = useState(false)

  useEffect(() => {
    checkSellerStatus()
    loadData()
  }, [])

  const checkSellerStatus = async () => {
    try {
      const response = await api.get('/api/seller-kyc')
      if (response.data && response.data.status) {
        setIsSeller(response.data.status === 'APPROVED')
      } else {
        setIsSeller(false)
      }
    } catch (error) {
      console.error('Error checking seller status:', error)
      setIsSeller(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)
      const [reps, branchList] = await Promise.all([
        salesRepService.getSalesReps(),
        branchService.getBranches()
      ])
      setSalesReps(reps)
      setBranches(branchList)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNavigateToBranches = () => {
    navigation.navigate('BranchesScreen')
  }

  const handleNavigateToSalesReps = () => {
    navigation.navigate('SalesRepsScreen')
  }

  const handleNavigateToSettlements = () => {
    navigation.navigate('SettlementsScreen')
  }

  const handleNavigateToReports = () => {
    navigation.navigate('ReportsScreen')
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
        <Text style={styles.title}>Sales Management</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isSeller ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons name="business-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyTitle}>Seller Account Required</Text>
            <Text style={styles.emptyText}>
              You need to be a verified seller to access sales management features.
            </Text>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.overviewGrid}>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="business" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.overviewValue}>{branches.length}</Text>
                  <Text style={styles.overviewLabel}>Branches</Text>
                </View>
                <View style={styles.overviewCard}>
                  <View style={styles.overviewIcon}>
                    <Ionicons name="people" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.overviewValue}>{salesReps.length}</Text>
                  <Text style={styles.overviewLabel}>Sales Reps</Text>
                </View>
              </View>
            </View>

            {/* Management Sections */}
            <View style={styles.managementSection}>
              <Text style={styles.sectionTitle}>Management</Text>
              
              {/* Branches Card */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={handleNavigateToBranches}
              >
                <View style={styles.managementCardContent}>
                  <View style={styles.managementIcon}>
                    <Ionicons name="business" size={28} color="#3B82F6" />
                  </View>
                  <View style={styles.managementInfo}>
                    <Text style={styles.managementTitle}>Branches</Text>
                    <Text style={styles.managementSubtitle}>
                      Manage your business locations
                    </Text>
                    <Text style={styles.managementCount}>
                      {branches.length} branch{branches.length !== 1 ? 'es' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Sales Reps Card */}
              <TouchableOpacity
                style={styles.managementCard}
                onPress={handleNavigateToSalesReps}
              >
                <View style={styles.managementCardContent}>
                  <View style={styles.managementIcon}>
                    <Ionicons name="people" size={28} color="#10B981" />
                  </View>
                  <View style={styles.managementInfo}>
                    <Text style={styles.managementTitle}>Sales Representatives</Text>
                    <Text style={styles.managementSubtitle}>
                      Manage your sales team
                    </Text>
                    <Text style={styles.managementCount}>
                      {salesReps.length} sales rep{salesReps.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            {/* Financial Sections */}
            <View style={styles.financialSection}>
              <Text style={styles.sectionTitle}>Financial</Text>
              
              {/* Settlements Card */}
              <TouchableOpacity
                style={styles.financialCard}
                onPress={handleNavigateToSettlements}
              >
                <View style={styles.financialCardContent}>
                  <View style={styles.financialIcon}>
                    <Ionicons name="card" size={28} color="#F59E0B" />
                  </View>
                  <View style={styles.financialInfo}>
                    <Text style={styles.financialTitle}>Settlements</Text>
                    <Text style={styles.financialSubtitle}>
                      Request and track payments
                    </Text>
                    <Text style={styles.financialStatus}>
                      View awaiting settlements
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Reports Card */}
              <TouchableOpacity
                style={styles.financialCard}
                onPress={handleNavigateToReports}
              >
                <View style={styles.financialCardContent}>
                  <View style={styles.financialIcon}>
                    <Ionicons name="bar-chart" size={28} color="#8B5CF6" />
                  </View>
                  <View style={styles.financialInfo}>
                    <Text style={styles.financialTitle}>Analytics & Reports</Text>
                    <Text style={styles.financialSubtitle}>
                      View detailed performance metrics
                    </Text>
                    <Text style={styles.financialStatus}>
                      View comprehensive reports
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
  managementSection: {
    marginBottom: 32,
  },
  financialSection: {
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
  // Financial cards
  financialCard: {
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
  financialCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  financialIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  financialInfo: {
    flex: 1,
  },
  financialTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  financialSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  financialStatus: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
})