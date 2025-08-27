import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { productService } from '../services/productService';
import { orderService } from '../services/orderService';
import { RideRequestService } from '../services/rideRequestService';
import { rentalApi } from '../services/rentalApi';
import { getImageUrl } from '../config/env';

type UserSearchNavigationProp = NativeStackNavigationProp<AppStackParamList, 'UserSearch'>;

interface SearchResult {
  id: string;
  type: 'product' | 'order' | 'ride' | 'rental';
  title: string;
  subtitle?: string;
  image?: string;
  status?: string;
  date?: string;
  price?: number;
  currency?: string;
  data: any; // Original data object
}

export default function UserSearch() {
  const navigation = useNavigation<UserSearchNavigationProp>();
  const { user } = useAuth();
  
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'products' | 'orders' | 'rides' | 'rentals'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus search input on mount
  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Debounced search function
  const performSearch = useCallback(async (query: string, page: number = 1, append: boolean = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      setAllResults([]);
      setHasMore(false);
      return;
    }

    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      const results: SearchResult[] = [];
      const searchTerm = query.toLowerCase();
      const limit = 10; // 10 records per page

      // Search products (featured products)
      try {
        const products = await productService.getFeaturedProducts(limit, page);
        const productResults = products.products
          .filter(product => 
            product.name?.toLowerCase().includes(searchTerm) ||
            product.description?.toLowerCase().includes(searchTerm) ||
            product.category?.toLowerCase().includes(searchTerm)
          )
          .map(product => ({
            id: product.id,
            type: 'product' as const,
            title: product.name,
            subtitle: product.category,
            image: product.image || undefined,
            price: product.price,
            currency: product.currencyCode || 'GMD',
            data: product,
          }));
        results.push(...productResults);
      } catch (error) {
        console.error('Error searching products:', error);
      }

      // Search orders (user's orders)
      if (user?.id) {
        try {
          const orders = await orderService.getCustomerOrders(page, limit);
          const orderResults = orders.orders
            .filter(order => 
              order.orderNumber?.toLowerCase().includes(searchTerm) ||
              order.status?.toLowerCase().includes(searchTerm) ||
              order.items?.some(item => 
                item.product?.title?.toLowerCase().includes(searchTerm)
              )
            )
            .map(order => ({
              id: order.id,
              type: 'order' as const,
              title: `Order #${order.orderNumber}`,
              subtitle: `${order.items?.length || 0} items`,
              status: order.status,
              date: new Date(order.createdAt).toLocaleDateString(),
              price: order.totalAmount,
              currency: order.currencyCode || 'GMD',
              data: order,
            }));
          results.push(...orderResults);
        } catch (error) {
          console.error('Error searching orders:', error);
        }
      }

      // Search rides (user's rides)
      if (user?.id) {
        try {
          const ridesData = await RideRequestService.getCustomerRideHistory(page, limit);
          const rideResults = ridesData.rides
            .filter((ride: any) => 
              ride.pickupLocation?.address?.toLowerCase().includes(searchTerm) ||
              ride.destinationLocation?.address?.toLowerCase().includes(searchTerm) ||
              ride.status?.toLowerCase().includes(searchTerm)
            )
            .map((ride: any) => ({
              id: ride.id,
              type: 'ride' as const,
              title: `${ride.pickupLocation?.address || 'Pickup'} → ${ride.destinationLocation?.address || 'Destination'}`,
              subtitle: ride.status,
              status: ride.status,
              date: new Date(ride.createdAt).toLocaleDateString(),
              price: ride.totalFare,
              currency: ride.currencySymbol || 'GMD',
              data: ride,
            }));
          results.push(...rideResults);
        } catch (error) {
          console.error('Error searching rides:', error);
        }
      }

      // Search rentals (user's ride rentals)
      if (user?.id) {
        try {
          const rentalsData = await rentalApi.getMyRentals(user.id, 'ALL', page, limit);
          const rentalResults = rentalsData.items
            .filter((rental: any) => 
              rental.rideService?.name?.toLowerCase().includes(searchTerm) ||
              rental.status?.toLowerCase().includes(searchTerm) ||
              rental.pickupAddress?.toLowerCase().includes(searchTerm)
            )
            .map((rental: any) => ({
              id: rental.id,
              type: 'rental' as const,
              title: rental.rideService?.name || 'Ride Rental',
              subtitle: rental.status,
              image: undefined, // Rentals don't have product images
              status: rental.status,
              date: new Date(rental.createdAt).toLocaleDateString(),
              price: rental.totalAmount,
              currency: rental.currency || 'GMD',
              data: rental,
            }));
          results.push(...rentalResults);
        } catch (error) {
          console.error('Error searching rentals:', error);
        }
      }

      // Sort results by relevance and date
      const sortedResults = results.sort((a, b) => {
        // Prioritize exact matches
        const aExactMatch = a.title.toLowerCase() === searchTerm;
        const bExactMatch = b.title.toLowerCase() === searchTerm;
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        // Then by date (newer first)
        if (a.date && b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        
        return 0;
      });

      if (append) {
        setAllResults(prev => [...prev, ...sortedResults]);
        setSearchResults(prev => [...prev, ...sortedResults]);
      } else {
        setAllResults(sortedResults);
        setSearchResults(sortedResults);
      }

      // Check if there are more results
      setHasMore(sortedResults.length >= limit);
      
    } catch (error) {
      console.error('Search error:', error);
      if (!append) {
        setSearchResults([]);
        setAllResults([]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user?.id]);

  // Handle search text changes with debouncing
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setCurrentPage(1); // Reset to first page on new search
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search (500ms)
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text, 1, false);
    }, 500);
  };

  // Load more results
  const loadMoreResults = () => {
    if (!isLoadingMore && hasMore && searchText.trim()) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      performSearch(searchText, nextPage, true);
    }
  };

  // Filter results by active tab
  const filteredResults = activeTab === 'all' 
    ? searchResults 
    : searchResults.filter(result => result.type === activeTab.slice(0, -1) as any);

  // Handle result selection
  const handleResultPress = (result: SearchResult) => {
    // Add to recent searches
    if (searchText.trim()) {
      setRecentSearches(prev => {
        const newSearches = [searchText.trim(), ...prev.filter(s => s !== searchText.trim())];
        return newSearches.slice(0, 5); // Keep only 5 recent searches
      });
    }

    // Navigate based on result type
    switch (result.type) {
      case 'product':
        navigation.navigate('ProductDetail', { productId: result.id });
        break;
      case 'order':
        navigation.navigate('OrderDetails', { orderId: result.id });
        break;
      case 'ride':
        navigation.navigate('CustomerRideHistory');
        break;
      case 'rental':
        navigation.navigate('RentalDetail', { rentalId: result.id });
        break;
    }
  };

  // Handle recent search selection
  const handleRecentSearchPress = (searchTerm: string) => {
    setSearchText(searchTerm);
    performSearch(searchTerm);
  };

  // Get icon for result type
  const getResultIcon = (type: string) => {
    switch (type) {
      case 'product': return 'bag-outline';
      case 'order': return 'receipt-outline';
      case 'ride': return 'car-outline';
      case 'rental': return 'time-outline';
      default: return 'document-outline';
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
      case 'approved':
        return '#10B981';
      case 'pending':
      case 'processing':
        return '#F59E0B';
      case 'cancelled':
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  // Render footer for loading more
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color="#0EA5E9" />
        <Text style={styles.loadingMoreText}>Loading more results...</Text>
      </View>
    );
  };

  // Render search result item
  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultLeft}>
        {item.image ? (
          <Image 
            source={{ uri: getImageUrl(item.image) }}
            style={styles.resultImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.resultIconContainer}>
            <Ionicons name={getResultIcon(item.type)} size={24} color="#6B7280" />
          </View>
        )}
      </View>
      
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.resultSubtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        )}
        <View style={styles.resultMeta}>
          {item.date && (
            <Text style={styles.resultDate}>{item.date}</Text>
          )}
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {item.price && (
        <View style={styles.resultPrice}>
          <Text style={styles.priceText}>
            {item.currency} {item.price.toLocaleString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Render recent search item
  const renderRecentSearch = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.recentSearchItem}
      onPress={() => handleRecentSearchPress(item)}
    >
      <Ionicons name="time-outline" size={16} color="#6B7280" />
      <Text style={styles.recentSearchText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#6B7280" />
          </TouchableOpacity>
          
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#6B7280" />
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Search products, orders, rides, rentals..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearchTextChange}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search Tabs */}
        {searchText.length > 0 && (
          <View style={styles.tabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {[
                { key: 'all', label: 'All', icon: 'grid-outline' },
                { key: 'products', label: 'Products', icon: 'bag-outline' },
                { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
                { key: 'rides', label: 'Rides', icon: 'car-outline' },
                { key: 'rentals', label: 'Rentals', icon: 'time-outline' },
              ].map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabButton,
                    activeTab === tab.key && styles.activeTabButton
                  ]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons 
                    name={tab.icon as any} 
                    size={16} 
                    color={activeTab === tab.key ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.tabText,
                    activeTab === tab.key && styles.activeTabText
                  ]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          {searchText.length === 0 ? (
            // Recent searches
            <View style={styles.recentSearchesContainer}>
              <Text style={styles.recentSearchesTitle}>Recent Searches</Text>
              {recentSearches.length > 0 ? (
                <FlatList
                  data={recentSearches}
                  renderItem={renderRecentSearch}
                  keyExtractor={(item) => item}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No recent searches</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Start searching for products, orders, rides, and rentals
                  </Text>
                </View>
              )}
            </View>
          ) : (
            // Search results
            <View style={styles.searchResultsContainer}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#0EA5E9" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              ) : filteredResults.length > 0 ? (
                <FlatList
                  data={filteredResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.resultsList}
                  onEndReached={loadMoreResults}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={renderFooter}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No results found</Text>
                  <Text style={styles.emptyStateSubtitle}>
                    Try adjusting your search terms or browse our categories
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#1F2937',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTabButton: {
    backgroundColor: '#0EA5E9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  recentSearchesContainer: {
    padding: 16,
  },
  recentSearchesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  recentSearchText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  searchResultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  resultLeft: {
    marginRight: 12,
  },
  resultImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  resultIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultPrice: {
    marginLeft: 12,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
});
