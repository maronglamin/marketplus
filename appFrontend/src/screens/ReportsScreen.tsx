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
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    loadAnalytics()
  }, [selectedPeriod])

  useEffect(() => {
    loadRecentActivity()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const analyticsData = await salesRepService.getParentSellerAnalytics(selectedPeriod)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
      Alert.alert('Error', 'Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }


  const handleViewDetailedReport = (reportType: string) => {
    if (reportType === 'Activity') {
      navigation.navigate('RepsActivity')
      return
    }
    if (reportType === 'Sales') {
      navigation.navigate('SettlementsScreen')
      return
    }
    if (reportType === 'Orders') {
      navigation.navigate('RepOrderReport')
      return
    }
    if (reportType === 'Products') {
      navigation.navigate('RepProductReport')
      return
    }
    if (reportType === 'Settlement') {
      navigation.navigate('SettlementRequest')
      return
    }
    Alert.alert('Coming Soon', `${reportType} detailed report will be available soon`)
  }

  const loadRecentActivity = async () => {
    try {
      const res = await salesRepService.getRecentActivity({ limit: 5 })
      setRecentActivity(res.items)
    } catch (e) {
      console.error('Failed to load recent activity', e)
    }
  }

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatNumberAbbreviation = (num: number | string, currencyCode?: string): string => {
    const number = typeof num === 'string' ? parseFloat(num) : num
    if (isNaN(number)) return '0'
    
    const currency = currencyCode || 'USD'
    let abbreviated = ''
    
    if (number >= 1000000000) {
      abbreviated = (number / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B'
    } else if (number >= 1000000) {
      abbreviated = (number / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    } else if (number >= 1000) {
      abbreviated = (number / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
    } else {
      abbreviated = number.toString()
    }
    
    return `${currency} ${abbreviated}`
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
        <View style={styles.placeholder} />
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
                  <Text style={styles.metricValue}>
                    {formatNumberAbbreviation(analytics?.totalStats?.totalRevenue || 0, analytics?.totalStats?.revenueCurrency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    Total Sales {analytics?.currencyBreakdown?.otherCurrencyCodes?.length
                      ? `(Other: ${analytics?.currencyBreakdown?.otherCurrencyCodes.join(', ')})`
                      : ''}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="receipt" size={24} color="#3B82F6" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.totalStats?.pendingOrders || 0}</Text>
                  <Text style={styles.metricLabel}>Total Orders</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="cube" size={24} color="#F59E0B" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.totalStats?.totalProducts || 0}</Text>
                  <Text style={styles.metricLabel}>Products</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={styles.metricIcon}>
                    <Ionicons name="people" size={24} color="#8B5CF6" />
                  </View>
                  <Text style={styles.metricValue}>{analytics?.salesReps?.length || 0}</Text>
                  <Text style={styles.metricLabel}>Sales Reps</Text>
                </View>
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
                  onPress={() => handleViewDetailedReport('Settlement')}
                >
                  <Ionicons name="wallet-outline" size={24} color="#8B5CF6" />
                  <Text style={styles.quickReportTitle}>Settlement</Text>
                  <Text style={styles.quickReportText}>Request settlement payments</Text>
                </TouchableOpacity>
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
                {recentActivity.map((activity: any) => (
                  <View key={activity.id} style={styles.activityItem}>
                    <View style={[
                      styles.activityIcon,
                      activity.type === 'product' ? styles.saleIcon : styles.orderIcon
                    ]}>
                      <Ionicons 
                        name={activity.type === 'product' ? 'cube' : 'receipt'} 
                        size={16} 
                        color="#FFFFFF" 
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        {activity.type === 'product'
                          ? `${activity.data?.title || 'Product'} by ${activity.rep?.name || 'Rep'}`
                          : `Order #${activity.data?.orderNumber || ''} - ${activity.data?.productTitle || 'Product'} by ${activity.rep?.name || 'Rep'}`}
                      </Text>
                      <Text style={styles.activityDate}>{formatDate(activity.createdAt)}</Text>
                    </View>
                    <View style={styles.amountContainer}>
                      <Text style={styles.activityAmount}>
                        {formatCurrency(activity.data?.amount || 0, activity.data?.currencyCode)}
                      </Text>
                    </View>
                  </View>
                ))}
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
  placeholder: {
    width: 40,
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
  // Activity list
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
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
    flexShrink: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'right',
  },
  amountContainer: {
    minWidth: 96,
    marginLeft: 12,
    flexShrink: 0,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
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
