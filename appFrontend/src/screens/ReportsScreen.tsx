import React, { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { salesRepService } from '../services/salesRepService'

type ReportsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ReportsScreen'>

export function ReportsScreen() {
  const navigation = useNavigation<ReportsScreenNavigationProp>()
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      // TODO: Implement analytics loading
      // const analyticsData = await salesRepService.getParentSellerAnalytics(selectedPeriod)
      // setAnalytics(analyticsData)
      
      // Mock data for now
      setAnalytics({
        totalSales: 12500,
        totalOrders: 45,
        totalProducts: 12,
        salesReps: 3,
        topSellingProduct: 'Premium Widget',
        recentActivity: [
          { type: 'sale', amount: 250, date: '2024-01-15', rep: 'John Doe' },
          { type: 'order', amount: 150, date: '2024-01-14', rep: 'Jane Smith' },
          { type: 'sale', amount: 300, date: '2024-01-13', rep: 'John Doe' },
        ]
      })
    } catch (error) {
      console.error('Error loading analytics:', error)
      Alert.alert('Error', 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = () => {
    Alert.alert('Coming Soon', 'Report export functionality will be available soon')
  }

  const handleViewDetailedReport = (reportType: string) => {
    Alert.alert('Coming Soon', `${reportType} detailed report will be available soon`)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
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
        <Text style={styles.title}>Analytics & Reports</Text>
        <TouchableOpacity
          onPress={handleExportReport}
          style={styles.headerExportButton}
        >
          <Ionicons name="download-outline" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <Text style={styles.periodLabel}>Report Period:</Text>
          <View style={styles.periodButtons}>
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text style={[
                  styles.periodButtonText,
                  selectedPeriod === period && styles.periodButtonTextActive
                ]}>
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsSection}>
              <Text style={styles.sectionTitle}>Key Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="trending-up" size={24} color="#10B981" />
                  </View>
                  <Text style={styles.metricValue}>{formatCurrency(analytics?.totalSales || 0)}</Text>
                  <Text style={styles.metricLabel}>Total Sales</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="receipt" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.totalOrders || 0}</Text>
                  <Text style={styles.metricLabel}>Total Orders</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="cube" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.totalProducts || 0}</Text>
                  <Text style={styles.metricLabel}>Products</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="people" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.salesReps || 0}</Text>
                  <Text style={styles.metricLabel}>Sales Reps</Text>
                </View>
              </View>
            </View>

            {/* Top Performing */}
            <View style={styles.topPerformingSection}>
              <Text style={styles.sectionTitle}>Top Performing</Text>
              <View style={styles.topPerformingCard}>
                <View style={styles.topPerformingItem}>
                  <Ionicons name="trophy" size={20} color="#F59E0B" />
                  <View style={styles.topPerformingContent}>
                    <Text style={styles.topPerformingLabel}>Top Selling Product</Text>
                    <Text style={styles.topPerformingValue}>
                      {analytics?.topSellingProduct || 'No data available'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Recent Activity */}
            <View style={styles.activitySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity
                  onPress={() => handleViewDetailedReport('Activity')}
                  style={styles.viewAllButton}
                >
                  <Text style={styles.viewAllText}>View All</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.activityList}>
                {analytics?.recentActivity?.map((activity: any, index: number) => (
                  <View key={index} style={styles.activityItem}>
                    <View style={[
                      styles.activityIcon,
                      activity.type === 'sale' ? styles.saleIcon : styles.orderIcon
                    ]}>
                      <Ionicons 
                        name={activity.type === 'sale' ? 'trending-up' : 'receipt'} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        {activity.type === 'sale' ? 'Sale' : 'Order'} by {activity.rep}
                      </Text>
                      <Text style={styles.activityDate}>{formatDate(activity.date)}</Text>
                    </View>
                    <Text style={styles.activityAmount}>
                      {formatCurrency(activity.amount)}
                    </Text>
                  </View>
                )) || []}
              </View>
            </View>

            {/* Quick Reports */}
            <View style={styles.quickReportsSection}>
              <Text style={styles.sectionTitle}>Quick Reports</Text>
              <View style={styles.quickReportsGrid}>
                <TouchableOpacity
                  style={styles.quickReportCard}
                  onPress={() => handleViewDetailedReport('Sales')}
                >
                  <Ionicons name="bar-chart" size={24} color="#3B82F6" />
                  <Text style={styles.quickReportTitle}>Sales Report</Text>
                  <Text style={styles.quickReportText}>Detailed sales analysis</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickReportCard}
                  onPress={() => handleViewDetailedReport('Orders')}
                >
                  <Ionicons name="list" size={24} color="#10B981" />
                  <Text style={styles.quickReportTitle}>Orders Report</Text>
                  <Text style={styles.quickReportText}>Order fulfillment details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickReportCard}
                  onPress={() => handleViewDetailedReport('Products')}
                >
                  <Ionicons name="cube" size={24} color="#F59E0B" />
                  <Text style={styles.quickReportTitle}>Products Report</Text>
                  <Text style={styles.quickReportText}>Product performance metrics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickReportCard}
                  onPress={() => handleViewDetailedReport('Sales Reps')}
                >
                  <Ionicons name="people" size={24} color="#8B5CF6" />
                  <Text style={styles.quickReportTitle}>Sales Reps Report</Text>
                  <Text style={styles.quickReportText}>Individual performance</Text>
                </TouchableOpacity>
              </View>
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
  headerExportButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Period selector
  periodSelector: {
    marginBottom: 24,
  },
  periodLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#3B82F6',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  // Loading styles
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    marginTop: 12,
  },
  // Section styles
  metricsSection: {
    marginBottom: 24,
  },
  topPerformingSection: {
    marginBottom: 24,
  },
  activitySection: {
    marginBottom: 24,
  },
  quickReportsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3B82F6',
    marginRight: 4,
  },
  // Metrics grid
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Top performing
  topPerformingCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topPerformingItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topPerformingContent: {
    marginLeft: 12,
    flex: 1,
  },
  topPerformingLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  topPerformingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  // Activity list
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  saleIcon: {
    backgroundColor: '#10B981',
  },
  orderIcon: {
    backgroundColor: '#3B82F6',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  // Quick reports
  quickReportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickReportCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  quickReportTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  quickReportText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
})
