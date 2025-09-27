import React, { useState, useEffect, Fragment } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { salesRepService, type SalesRep } from '../services/salesRepService'
import { settlementService, type SettlementRequest } from '../services/settlementService'
import { orderService, type Order } from '../services/orderService'
import { useAuth } from '../contexts/AuthContext'

type SettlementsScreenNavigationProp = NativeStackNavigationProp<AppStackParamList, 'SettlementsScreen'>

export function SettlementsScreen() {
  const navigation = useNavigation<SettlementsScreenNavigationProp>()
  const { user } = useAuth()
  const [settlements, setSettlements] = useState<(SettlementRequest & { salesRepBreakdown?: any[] })[]>([])
  const [paidOrders, setPaidOrders] = useState<Order[]>([])
  const [salesRepStatus, setSalesRepStatus] = useState<SalesRep | null>(null)
  const [salesRepsSummary, setSalesRepsSummary] = useState<Array<{
    salesRep: SalesRep
    totalOrders: number
    totalAmount: number
    orders: Order[]
    ordersByCurrency: Array<{
      currency: string
      orders: Order[]
      totalAmount: number
      orderCount: number
    }>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [isSalesRep, setIsSalesRep] = useState(false)
  const [selectedSalesRep, setSelectedSalesRep] = useState<{
    salesRep: SalesRep
    totalOrders: number
    totalAmount: number
    orders: Order[]
    ordersByCurrency: Array<{
      currency: string
      orders: Order[]
      totalAmount: number
      orderCount: number
    }>
  } | null>(null)
  const [showSalesRepModal, setShowSalesRepModal] = useState(false)

  useEffect(() => {
    checkSalesRepStatus()
  }, [])

  const checkSalesRepStatus = async () => {
    try {
      // Check if current user is a sales rep using cached method
      console.log('Checking if user is a sales rep...')
      const { isSalesRep, salesRepData } = await salesRepService.getSalesRepStatusCached(user?.id || '')
      
      if (isSalesRep && salesRepData) {
        console.log('User is a sales rep:', salesRepData)
        setIsSalesRep(true)
        setSalesRepStatus(salesRepData)
        // Sales reps can view their paid orders but cannot request settlements
        loadPaidOrders()
      } else {
        // User is not a sales rep, load settlement history for parent seller
        console.log('User is not a sales rep, loading as parent seller...')
        setIsSalesRep(false)
        setSalesRepStatus(null)
        loadSettlementHistory()
      }
    } catch (error) {
      // User is not a sales rep, load settlement history for parent seller
      console.log('User is not a sales rep, loading as parent seller...')
      setIsSalesRep(false)
      setSalesRepStatus(null)
      loadSettlementHistory()
    }
  }

  const loadSettlementHistory = async () => {
    try {
      setLoading(true)
      
      console.log('Loading settlement history for parent seller...')
      console.log('Current user ID:', user?.id)
      
      // For parent sellers, we need to:
      // 1. Get all sales reps where parentSellerId = current user ID
      // 2. For each sales rep, get their confirmed orders that are paid
      // 3. Create a summary showing each sales rep's totals
      
      // Get all sales reps under this parent seller
      console.log('Fetching all sales reps...')
      const salesReps = await salesRepService.getSalesReps()
      console.log('All sales reps:', salesReps)
      console.log('Current user ID:', user?.id)
      console.log('User type:', typeof user?.id)
      
      const mySalesReps = salesReps.filter(rep => rep.parentSellerId === user?.id)
      console.log('My sales reps:', mySalesReps)
      console.log('My sales reps count:', mySalesReps.length)
      
      // Debug each sales rep's parentSellerId
      salesReps.forEach((rep, index) => {
        console.log(`Sales rep ${index}:`, {
          id: rep.id,
          firstName: rep.firstName,
          lastName: rep.lastName,
          parentSellerId: rep.parentSellerId,
          parentSellerIdType: typeof rep.parentSellerId,
          matches: rep.parentSellerId === user?.id
        })
      })
      
      if (mySalesReps.length === 0) {
        console.log('No sales reps found for this parent seller')
        setSalesRepsSummary([])
        setSettlements([])
        return
      }
      
      // For each sales rep, get their paid orders from the database
      const salesRepSummaries = []
      
      for (const salesRep of mySalesReps) {
        try {
          console.log(`Fetching orders for sales rep: ${salesRep.firstName} ${salesRep.lastName} (${salesRep.userId})`)
          console.log(`Sales rep ID: ${salesRep.id}`)
          
          // Call the new API endpoint to get orders for this sales rep
          const response = await orderService.getSalesRepOrders(salesRep.id)
          console.log(`API response for sales rep ${salesRep.id}:`, response)
          
          const orders = response.orders
          const ordersByCurrency = response.ordersByCurrency
          const totalOrders = response.totalCount
          const totalAmount = response.totalAmount
          
          console.log(`Orders found for sales rep ${salesRep.id}:`, orders)
          console.log(`Orders by currency for sales rep ${salesRep.id}:`, ordersByCurrency)
          
          console.log(`Sales rep ${salesRep.firstName} ${salesRep.lastName}: ${totalOrders} orders, $${parseFloat(totalAmount.toString()).toFixed(2)} total`)
          
          salesRepSummaries.push({
            salesRep,
            totalOrders,
            totalAmount,
            orders,
            ordersByCurrency
          })
        } catch (error: any) {
          console.error(`Error loading orders for sales rep ${salesRep.id}:`, error)
          console.error(`Error details:`, {
            message: error?.message,
            status: error?.response?.status,
            data: error?.response?.data
          })
          // Add empty summary for this sales rep
          salesRepSummaries.push({
            salesRep,
            totalOrders: 0,
            totalAmount: 0,
            orders: [],
            ordersByCurrency: []
          })
        }
      }
      
      // Sort sales reps by highest sales amount
      const sortedSalesRepSummaries = salesRepSummaries.sort((a, b) => {
        const amountA = parseFloat(a.totalAmount.toString())
        const amountB = parseFloat(b.totalAmount.toString())
        return amountB - amountA // Sort in descending order (highest first)
      })
      
      setSalesRepsSummary(sortedSalesRepSummaries)
      
      // Also load actual settlement history
      try {
        const settlementHistory = await settlementService.getSettlementHistory(1, 50, 'ECOMMERCE', 'all')
        setSettlements(settlementHistory.settlements)
      } catch (error) {
        console.error('Error loading settlement history:', error)
        setSettlements([])
      }
    } catch (error) {
      console.error('Error loading settlement history:', error)
      Alert.alert('Error', 'Failed to load settlement history')
    } finally {
      setLoading(false)
    }
  }

  const loadPaidOrders = async () => {
    try {
      setLoading(true)
      
      // Mock data: Simulate getting cumulative paid orders for sales rep
      // In real implementation, this would query orders where:
      // 1. Order status is 'confirmed' or 'delivered' or 'completed'
      // 2. Order has external transaction with 'paid' status
      // 3. The seller is the parent of the current sales rep
      
      const mockPaidOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'ORD-001',
          totalAmount: 150.00,
          currencyCode: 'USD',
          status: 'confirmed',
          createdAt: '2024-01-15T10:30:00Z',
          customer: { id: '1', name: 'John Doe', phone: '+1234567890' },
          items: [{ 
            id: '1', 
            product: { 
              id: '1', 
              title: 'Product A', 
              price: 75.00, 
              images: [], 
              seller: { id: 'seller1', name: 'Parent Seller' } 
            }, 
            quantity: 2, 
            unitPrice: 75.00, 
            totalPrice: 150.00 
          }]
        },
        {
          id: '2',
          orderNumber: 'ORD-002',
          totalAmount: 275.50,
          currencyCode: 'USD',
          status: 'delivered',
          createdAt: '2024-01-14T14:20:00Z',
          customer: { id: '2', name: 'Jane Smith', phone: '+1234567891' },
          items: [{ 
            id: '2', 
            product: { 
              id: '2', 
              title: 'Product B', 
              price: 275.50, 
              images: [], 
              seller: { id: 'seller1', name: 'Parent Seller' } 
            }, 
            quantity: 1, 
            unitPrice: 275.50, 
            totalPrice: 275.50 
          }]
        },
        {
          id: '3',
          orderNumber: 'ORD-003',
          totalAmount: 89.99,
          currencyCode: 'USD',
          status: 'completed',
          createdAt: '2024-01-13T09:15:00Z',
          customer: { id: '3', name: 'Mike Johnson', phone: '+1234567892' },
          items: [{ 
            id: '3', 
            product: { 
              id: '3', 
              title: 'Product C', 
              price: 29.99, 
              images: [], 
              seller: { id: 'seller1', name: 'Parent Seller' } 
            }, 
            quantity: 3, 
            unitPrice: 29.99, 
            totalPrice: 89.99 
          }]
        },
        {
          id: '4',
          orderNumber: 'ORD-004',
          totalAmount: 420.00,
          currencyCode: 'USD',
          status: 'confirmed',
          createdAt: '2024-01-12T16:45:00Z',
          customer: { id: '4', name: 'Sarah Wilson', phone: '+1234567893' },
          items: [{ 
            id: '4', 
            product: { 
              id: '4', 
              title: 'Product D', 
              price: 420.00, 
              images: [], 
              seller: { id: 'seller1', name: 'Parent Seller' } 
            }, 
            quantity: 1, 
            unitPrice: 420.00, 
            totalPrice: 420.00 
          }]
        },
        {
          id: '5',
          orderNumber: 'ORD-005',
          totalAmount: 199.99,
          currencyCode: 'USD',
          status: 'delivered',
          createdAt: '2024-01-11T11:30:00Z',
          customer: { id: '5', name: 'David Brown', phone: '+1234567894' },
          items: [{ 
            id: '5', 
            product: { 
              id: '5', 
              title: 'Product E', 
              price: 99.99, 
              images: [], 
              seller: { id: 'seller1', name: 'Parent Seller' } 
            }, 
            quantity: 2, 
            unitPrice: 99.99, 
            totalPrice: 199.99 
          }]
        }
      ]
      
      // Calculate cumulative total
      const cumulativeTotal = mockPaidOrders.reduce((total, order) => total + order.totalAmount, 0)
      
      // Add cumulative total as a special "summary" item
      const summaryOrder: Order = {
        id: 'summary',
        orderNumber: 'CUMULATIVE',
        totalAmount: cumulativeTotal,
        currencyCode: 'USD',
        status: 'summary',
        createdAt: new Date().toISOString(),
        customer: { id: 'summary', name: 'All Paid Orders', phone: '' },
        items: [{ 
          id: 'summary', 
          product: { 
            id: 'summary', 
            title: `${mockPaidOrders.length} orders`, 
            price: cumulativeTotal, 
            images: [], 
            seller: { id: 'seller1', name: 'Parent Seller' } 
          }, 
          quantity: 1, 
          unitPrice: cumulativeTotal, 
          totalPrice: cumulativeTotal 
        }]
      }
      
      const ordersWithSummary = [summaryOrder, ...mockPaidOrders]
      
      setPaidOrders(ordersWithSummary)
    } catch (error) {
      console.error('Error loading paid orders:', error)
      Alert.alert('Error', 'Failed to load paid orders')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestSettlement = () => {
    if (isSalesRep) {
      Alert.alert(
        'Access Denied', 
        'Sales representatives cannot request settlements. Only the parent seller can make settlement requests.',
        [{ text: 'OK' }]
      )
    } else {
      navigation.navigate('SettlementRequest')
    }
  }

  const handleViewSettlementDetails = (settlementId: string) => {
    const settlement = settlements.find(s => s.id === settlementId)
    if (!settlement) return
    
    const salesRepBreakdown = (settlement as any).salesRepBreakdown
    if (salesRepBreakdown && salesRepBreakdown.length > 0) {
      const breakdownText = salesRepBreakdown
        .map((rep: any) => `${rep.salesRepName}: ${formatCurrency(rep.amount, settlement.currency)} (${rep.orderCount} orders)`)
        .join('\n')
      
      Alert.alert(
        'Settlement Details',
        `Settlement ID: ${settlementId}\n\nSales Rep Breakdown:\n${breakdownText}\n\nTotal: ${formatCurrency(settlement.amount, settlement.currency)}`
      )
    } else {
      Alert.alert('Settlement Details', `Settlement ID: ${settlementId}`)
    }
  }

  const handleViewOrderDetails = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId })
  }

  const handleViewSalesRepDetails = (summary: {
    salesRep: SalesRep
    totalOrders: number
    totalAmount: number
    orders: Order[]
    ordersByCurrency: Array<{
      currency: string
      orders: Order[]
      totalAmount: number
      orderCount: number
    }>
  }) => {
    setSelectedSalesRep(summary)
    setShowSalesRepModal(true)
  }

  const formatCurrency = (amount: number | string, currency: string) => {
    const symbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
      GMD: 'D', // Gambian Dalasi
    }
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
    return `${symbols[currency] || currency} ${numericAmount.toLocaleString()}`
  }

  // Debug function to test API calls
  const testApiCalls = async () => {
    try {
      console.log('=== TESTING API CALLS ===')
      
      // Test 1: Get all sales reps
      console.log('Test 1: Getting all sales reps...')
      const allSalesReps = await salesRepService.getSalesReps()
      console.log('All sales reps result:', allSalesReps)
      
      // Test 2: Get sales reps for current user
      const mySalesReps = allSalesReps.filter(rep => rep.parentSellerId === user?.id)
      console.log('My sales reps result:', mySalesReps)
      
      if (mySalesReps.length > 0) {
        // Test 3: Get orders for first sales rep
        const firstSalesRep = mySalesReps[0]
        console.log('Test 3: Getting orders for first sales rep:', firstSalesRep.id)
        const ordersResponse = await orderService.getSalesRepOrders(firstSalesRep.id)
        console.log('Orders response:', ordersResponse)
      } else {
        console.log('No sales reps found for current user')
      }
      
      console.log('=== API TEST COMPLETE ===')
    } catch (error) {
      console.error('API test error:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING': return '#F59E0B'
      case 'PROCESSING': return '#3B82F6'
      case 'COMPLETED': return '#10B981'
      case 'FAILED': return '#EF4444'
      case 'CANCELLED': return '#6B7280'
      default: return '#6B7280'
    }
  }

  return (
    <>
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
        <Text style={styles.title}>
          {isSalesRep ? 'Paid Orders' : 'Settlements'}
        </Text>
        {!isSalesRep && (
          <TouchableOpacity
            onPress={handleRequestSettlement}
            style={styles.headerRequestButton}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Sales Rep Info */}
        {isSalesRep && salesRepStatus && (
          <View style={styles.salesRepInfoSection}>
            <View style={styles.salesRepInfoCard}>
              <View style={styles.salesRepInfoHeader}>
                <Ionicons name="person-circle-outline" size={24} color="#3B82F6" />
                <Text style={styles.salesRepInfoTitle}>Sales Representative</Text>
              </View>
              <Text style={styles.salesRepInfoText}>
                Branch: {salesRepStatus.branchName}
                {salesRepStatus.branchLocation && ` - ${salesRepStatus.branchLocation}`}
              </Text>
              <Text style={styles.salesRepInfoNote}>
                Below shows all confirmed/paid orders where your parent seller is the seller. 
                Settlement requests are handled by your parent seller.
              </Text>
            </View>
          </View>
        )}

        {/* Sales Rep Summary / Paid Orders */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {isSalesRep ? 'Paid Orders History' : 'Sales Representatives Summary'}
          </Text>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>
                {isSalesRep ? 'Loading paid orders...' : 'Loading settlement history...'}
              </Text>
            </View>
          ) : isSalesRep ? (
            // Show paid orders for sales reps
            paidOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>No Paid Orders Yet</Text>
                <Text style={styles.emptyText}>
                  Your paid orders will appear here once customers complete their purchases.
                </Text>
              </View>
            ) : (
              <View style={styles.ordersList}>
                {paidOrders.map((order) => {
                  const isSummary = order.id === 'summary'
                  
                  return (
                    <TouchableOpacity
                      key={order.id}
                      style={[styles.orderCard, isSummary && styles.summaryCard]}
                      onPress={() => isSummary ? null : handleViewOrderDetails(order.id)}
                      disabled={isSummary}
                    >
                      <View style={styles.orderInfo}>
                        <View style={[styles.orderIcon, isSummary && styles.summaryIcon]}>
                          <Ionicons 
                            name={isSummary ? "calculator" : "receipt"} 
                            size={20} 
                            color={isSummary ? "#FFFFFF" : "#10B981"} 
                          />
                        </View>
                        <View style={styles.orderDetails}>
                          <Text style={[styles.orderNumber, isSummary && styles.summaryText]}>
                            {isSummary ? 'Total Sales Value' : `Order #${order.orderNumber}`}
                          </Text>
                          <Text style={[styles.orderAmount, isSummary && styles.summaryAmount]}>
                            {formatCurrency(order.totalAmount, order.currencyCode)}
                          </Text>
                          {!isSummary && (
                            <>
                              <Text style={styles.orderDate}>
                                {new Date(order.createdAt).toLocaleDateString()}
                              </Text>
                              <Text style={[styles.orderStatus, { color: getStatusColor(order.status) }]}>
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </Text>
                            </>
                          )}
                          {isSummary && (
                            <Text style={styles.summarySubtext}>
                              From {order.items[0].product.title} • All confirmed/paid orders
                            </Text>
                          )}
                        </View>
                      </View>
                      {!isSummary && <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />}
                    </TouchableOpacity>
                  )
                })}
              </View>
            )
        ) : (
          // Show sales rep summary for parent sellers
          salesRepsSummary.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Sales Representatives Yet</Text>
              <Text style={styles.emptyText}>
                Sales representatives and their paid orders will appear here once you add them and they start making sales.
              </Text>
              {/* <TouchableOpacity
                style={styles.debugButton}
                onPress={testApiCalls}
              >
                <Ionicons name="bug" size={16} color="#FFFFFF" />
                <Text style={styles.debugButtonText}>Debug API Calls</Text>
              </TouchableOpacity> */}
            </View>
            ) : (
              <View style={styles.salesRepSummaryList}>
                {salesRepsSummary.map((summary) => (
                  <TouchableOpacity
                    key={summary.salesRep.id}
                    style={styles.salesRepSummaryCard}
                    onPress={() => handleViewSalesRepDetails(summary)}
                  >
                    <View style={styles.salesRepSummaryInfo}>
                      <View style={styles.salesRepSummaryIcon}>
                        <Ionicons name="person-circle" size={24} color="#3B82F6" />
                      </View>
                      <View style={styles.salesRepSummaryDetails}>
                        <Text style={styles.salesRepSummaryName}>
                          {summary.salesRep.firstName} {summary.salesRep.lastName}
                        </Text>
                        <Text style={styles.salesRepSummaryBranch}>
                          {summary.salesRep.branchName}
                          {summary.salesRep.branchLocation && ` - ${summary.salesRep.branchLocation}`}
                        </Text>
                        <View style={styles.salesRepSummaryStats}>
                          <Text style={styles.salesRepSummaryOrders}>
                            {summary.totalOrders} orders
                          </Text>
                        </View>
                        {/* Currency Breakdown */}
                        {summary.ordersByCurrency && summary.ordersByCurrency.length > 0 && (
                          <View style={styles.currencyBreakdown}>
                            {summary.ordersByCurrency.map((currencyData, index) => (
                              <View key={index} style={styles.currencyItem}>
                                <Text style={styles.currencyCode}>{currencyData.currency}</Text>
                                <Text style={styles.currencyAmount}>
                                  {formatCurrency(currencyData.totalAmount, currencyData.currency)} ({currencyData.orderCount} orders)
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                        <Text style={styles.salesRepSummaryStatus}>
                          Status: {summary.salesRep.status}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </View>
        </ScrollView>
      </SafeAreaView>

      {/* Sales Rep Details Bottom Sheet Modal */}
      <Modal
        visible={showSalesRepModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSalesRepModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <Text style={styles.bottomSheetTitle}>Sales Rep Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowSalesRepModal(false)}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            {selectedSalesRep && (
              <ScrollView style={styles.bottomSheetContent} showsVerticalScrollIndicator={false}>
                <View style={styles.salesRepDetailsCard}>
                  <View style={styles.salesRepDetailsHeader}>
                    <View style={styles.salesRepDetailsIcon}>
                      <Ionicons name="person-circle" size={48} color="#3B82F6" />
                    </View>
                    <View style={styles.salesRepDetailsInfo}>
                      <Text style={styles.salesRepDetailsName}>
                        {selectedSalesRep.salesRep.firstName} {selectedSalesRep.salesRep.lastName}
                      </Text>
                      <Text style={styles.salesRepDetailsBranch}>
                        {selectedSalesRep.salesRep.branchName}
                        {selectedSalesRep.salesRep.branchLocation && ` - ${selectedSalesRep.salesRep.branchLocation}`}
                      </Text>
                      <Text style={styles.salesRepDetailsPhone}>
                        {selectedSalesRep.salesRep.phoneNumber}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.salesRepDetailsStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Status</Text>
                      <Text style={[styles.statValue, { color: getStatusColor(selectedSalesRep.salesRep.status) }]}>
                        {selectedSalesRep.salesRep.status}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statLabel}>Total Orders</Text>
                      <Text style={styles.statValue}>{selectedSalesRep.totalOrders}</Text>
                    </View>
                  </View>
                  
                  {/* Currency Breakdown */}
                  {selectedSalesRep.ordersByCurrency && selectedSalesRep.ordersByCurrency.length > 0 && (
                    <View style={styles.currencyBreakdownSection}>
                      <Text style={styles.currencyBreakdownTitle}>Sales by Currency</Text>
                      {selectedSalesRep.ordersByCurrency.map((currencyData, index) => (
                        <View key={index} style={styles.currencyBreakdownItem}>
                          <View style={styles.currencyInfo}>
                            <Text style={styles.currencyCode}>{currencyData.currency}</Text>
                            <Text style={styles.currencyOrderCount}>{currencyData.orderCount} orders</Text>
                          </View>
                          <Text style={styles.currencyAmount}>
                            {formatCurrency(currencyData.totalAmount, currencyData.currency)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  headerRequestButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  // Section styles
  salesRepInfoSection: {
    marginBottom: 24,
  },
  salesRepInfoCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  salesRepInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  salesRepInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginLeft: 8,
  },
  salesRepInfoText: {
    fontSize: 14,
    color: '#1E40AF',
    marginBottom: 4,
  },
  salesRepInfoNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  historySection: {
    marginBottom: 32,
  },
  infoSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  // Orders list
  ordersList: {
    gap: 12,
  },
  orderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderDetails: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  salesRepName: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 2,
    fontWeight: '500',
  },
  // Sales rep summary styles
  salesRepSummaryList: {
    gap: 12,
  },
  salesRepSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  salesRepSummaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  salesRepSummaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  salesRepSummaryDetails: {
    flex: 1,
  },
  salesRepSummaryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  salesRepSummaryBranch: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  salesRepSummaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  salesRepSummaryOrders: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  salesRepSummaryAmount: {
    fontSize: 16,
    color: '#059669',
    fontWeight: '600',
  },
  salesRepSummaryStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  currencyBreakdown: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  currencyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  currencyCode: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  currencyAmount: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Bottom Sheet Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  bottomSheetContent: {
    flex: 1,
    padding: 20,
  },
  salesRepDetailsCard: {
    backgroundColor: '#FFFFFF',
  },
  salesRepDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  salesRepDetailsIcon: {
    marginRight: 16,
  },
  salesRepDetailsInfo: {
    flex: 1,
  },
  salesRepDetailsName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  salesRepDetailsBranch: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  salesRepDetailsPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  salesRepDetailsStats: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  currencyBreakdownSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  currencyBreakdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  currencyBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyOrderCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  // Summary card styles
  summaryCard: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  summaryIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  summarySubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 4,
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
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  debugButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Settlements list
  settlementsList: {
    gap: 12,
  },
  settlementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settlementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settlementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settlementDetails: {
    flex: 1,
  },
  settlementAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  settlementDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  settlementStatus: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  settlementOrdersCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Info section
  infoCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#6B7280',
  },
})
