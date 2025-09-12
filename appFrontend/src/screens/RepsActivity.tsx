import React, { useEffect, useState, useCallback } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Platform, StatusBar, FlatList, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppStackParamList } from '../navigation/AppNavigator'
import { salesRepService } from '../services/salesRepService'

type RepsActivityNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RepsActivity'>

export function RepsActivity() {
  const navigation = useNavigation<RepsActivityNavigationProp>()
  const [items, setItems] = useState<any[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadPage = async (nextCursor?: string) => {
    if (loading) return
    setLoading(true)
    try {
      const res = await salesRepService.getRecentActivity({ limit: 20, cursor: nextCursor })
      const newItems = nextCursor ? [...items, ...res.items] : res.items
      setItems(newItems)
      setCursor(res.nextCursor)
      setHasMore(Boolean(res.nextCursor))
    } catch (e) {
      console.error('Failed to load reps activity', e)
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await loadPage(undefined)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const loadMore = () => {
    if (!hasMore || loading || !cursor) return
    loadPage(cursor)
  }

  useEffect(() => {
    loadPage(undefined)
  }, [])

  const formatCurrency = (amount: number, currencyCode?: string) => {
    const currency = currencyCode || 'USD'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount)
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString()

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, item.type === 'product' ? styles.saleIcon : styles.orderIcon]}>
        <Ionicons name={item.type === 'product' ? 'cube' : 'receipt'} size={16} color="#FFFFFF" />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>
          {item.type === 'product'
            ? `${item.data?.title || 'Product'} by ${item.rep?.name || 'Rep'}`
            : `Order #${item.data?.orderNumber || ''} - ${item.data?.productTitle || 'Product'} by ${item.rep?.name || 'Rep'}`}
        </Text>
        <Text style={styles.activityDate}>{formatDate(item.createdAt)}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.activityAmount}>{formatCurrency(item.data?.amount || 0, item.data?.currencyCode)}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Reps Activity</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        contentContainerStyle={{ padding: 16 }}
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListFooterComponent={loading ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : null}
      />
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
  activityItem: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
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
})


