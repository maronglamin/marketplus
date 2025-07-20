import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { generateAndSharePDF } from '../services/pdfExportService';
import { DateRangePicker } from '../components/DateRangePicker';
import { interestService, type Interest } from '../services/interestService';
import { kycService } from '../services/kycService';
import Constants from 'expo-constants';
import { getImageUrl } from '../config/env';

// Get the API base URL
const LOCAL_IP = Constants.expoConfig?.extra?.localIp || '192.168.137.177';
const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${LOCAL_IP}:3000`;

type InterestManagementNavigationProp = NativeStackNavigationProp<AppStackParamList, 'InterestManagement'>;

export function InterestManagement() {
  const navigation = useNavigation<InterestManagementNavigationProp>();
  const route = useRoute();
  const { user, token } = useAuth();
  
  const [interests, setInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    endDate: new Date(),
  });
  const [exporting, setExporting] = useState(false);
  
  // Tab switching state
  const [activeTab, setActiveTab] = useState<'my-interests' | 'customer-interests'>('my-interests');
  const [hasKyc, setHasKyc] = useState(false);
  const [kycLoading, setKycLoading] = useState(true);

  useEffect(() => {
    checkKycStatus();
  }, []);

  useEffect(() => {
    if (!kycLoading) {
      loadInterests();
    }
  }, [activeTab, kycLoading]);

  const checkKycStatus = async () => {
    try {
      setKycLoading(true);
      await kycService.getKycStatus();
      setHasKyc(true);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setHasKyc(false);
      } else {
        console.error('Error checking KYC status:', error);
        setHasKyc(false);
      }
    } finally {
      setKycLoading(false);
    }
  };

  const loadInterests = async (isLoadMore: boolean = false) => {
    try {
      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setPage(1);
        setHasMore(true);
      }
      setError(null);
      
      const currentPage = isLoadMore ? page + 1 : 1;
      
      let response;
      if (activeTab === 'my-interests') {
        response = await interestService.getMyInterests(currentPage, 6);
      } else {
        response = await interestService.getCustomerInterests(currentPage, 6);
      }
      
      if (isLoadMore) {
        setInterests(prev => [...prev, ...response.interests]);
        setPage(currentPage);
        setHasMore(response.hasMore);
      } else {
        setInterests(response.interests);
        setPage(1);
        setHasMore(response.hasMore);
      }
    } catch (error: any) {
      console.error('Error loading interests:', error);
      setError('Failed to load interests');
      if (!isLoadMore) {
        Alert.alert('Error', 'Failed to load interests. Please try again.');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setIsInitialLoad(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      loadInterests(true);
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isCloseToBottom && !loadingMore && hasMore) {
      handleLoadMore();
    }
  };

  const handleTabPress = (tab: string) => {
    switch (tab) {
      case 'home':
        navigation.navigate('Home');
        break;
      case 'orders':
        navigation.navigate('CustomerOrders');
        break;
      case 'interests':
        // Already on interests
        break;
      case 'account':
        navigation.navigate('SellerDashboard');
        break;
    }
  };

  const isActiveTab = (tab: string) => {
    switch (tab) {
      case 'home':
        return route.name === 'Home';
      case 'orders':
        return route.name === 'CustomerOrders';
      case 'interests':
        return route.name === 'InterestManagement';
      case 'account':
        return route.name === 'SellerDashboard';
      default:
        return false;
    }
  };

  const handleViewProduct = (productId: string) => {
    navigation.navigate('ProductDetail', { productId });
  };

  const handleViewInterestDetails = (interestId: string) => {
    navigation.navigate('SellerInterestDetail', { interestId });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return '#F59E0B';
      case 'confirmed':
        return '#10B981';
      case 'negotiating':
        return '#3B82F6';
      case 'accepted':
        return '#059669';
      case 'rejected':
        return '#EF4444';
      case 'expired':
        return '#6B7280';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const formatPrice = (price: number, currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
    };
    const symbol = currencySymbols[currencyCode] || currencyCode;
    
    const formattedPrice = price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${symbol}${formattedPrice}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;
    const diffInWeeks = diffInDays / 7;
    const diffInMonths = diffInDays / 30;
    const diffInYears = diffInDays / 365;

    if (diffInHours < 24) {
      return 'Today';
    } else if (diffInDays < 7) {
      return 'This Week';
    } else if (diffInWeeks < 4) {
      return 'This Month';
    } else if (diffInMonths < 12) {
      return 'This Year';
    } else {
      return 'Older';
    }
  };

  const groupInterestsByDate = (interests: Interest[]) => {
    const groups: { [key: string]: Interest[] } = {};
    
    interests.forEach(interest => {
      const group = getDateGroup(interest.createdAt);
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(interest);
    });

    return groups;
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      
      // Filter interests by date range
      const filteredInterests = interests.filter(interest => {
        const interestDate = new Date(interest.createdAt);
        return interestDate >= exportDateRange.startDate && interestDate <= exportDateRange.endDate;
      });

      if (filteredInterests.length === 0) {
        Alert.alert('No Data', 'No interests found for the selected date range.');
        return;
      }

      await generateAndSharePDF({
        type: 'interests',
        data: filteredInterests,
        dateRange: {
          startDate: exportDateRange.startDate.toISOString(),
          endDate: exportDateRange.endDate.toISOString(),
        },
        user: {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email,
        },
      });

      Alert.alert('Success', 'PDF exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Failed to generate PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setExportDateRange({ startDate, endDate });
  };

  if (loading || kycLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.title}>Interests</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading interests...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={Platform.OS === 'android'}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.title}>Interests</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={styles.exportButton}
              disabled={exporting}
            >
              <Ionicons name="calendar-outline" size={20} color="#2563EB" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportPDF}
              style={[styles.exportButton, exporting && styles.exportButtonDisabled]}
              disabled={exporting}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#2563EB" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => loadInterests()}
              style={styles.refreshButton}
            >
              <Ionicons name="refresh" size={24} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Switching - Only show if user has KYC */}
        {hasKyc && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-interests' && styles.activeTab]}
              onPress={() => setActiveTab('my-interests')}
            >
              <Ionicons 
                name="heart-outline" 
                size={20} 
                color={activeTab === 'my-interests' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'my-interests' && styles.activeTabText]}>
                My Interests
              </Text>
            </TouchableOpacity>
              <TouchableOpacity
              style={[styles.tab, activeTab === 'customer-interests' && styles.activeTab]}
              onPress={() => setActiveTab('customer-interests')}
            >
              <Ionicons 
                name="people-outline" 
                size={20} 
                color={activeTab === 'customer-interests' ? '#2563EB' : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === 'customer-interests' && styles.activeTabText]}>
                Customer Interests
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Date Range Display */}
        <View style={styles.dateRangeDisplay}>
          <Text style={styles.dateRangeText}>
            Export Range: {exportDateRange.startDate.toLocaleDateString()} - {exportDateRange.endDate.toLocaleDateString()}
          </Text>
                </View>

        <ScrollView style={styles.content} onScroll={handleScroll} scrollEventThrottle={16}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadInterests()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : interests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                {activeTab === 'my-interests' ? 'No Interests Yet' : 'No Customer Interests'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'my-interests' 
                  ? "You haven't shown interest in any products yet. Start browsing to find products you like."
                  : "You don't have any customer interests yet. When customers show interest in your products, they'll appear here."
                }
              </Text>
              {activeTab === 'my-interests' && (
                <TouchableOpacity
                  style={styles.shopButton}
                  onPress={() => navigation.navigate('Home')}
                >
                  <Text style={styles.shopButtonText}>Start Browsing</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            Object.entries(groupInterestsByDate(interests)).map(([group, groupInterests]) => (
              <View key={group} style={styles.dateGroup}>
                <Text style={styles.dateGroupTitle}>{group}</Text>
                {groupInterests.map((interest) => (
                  <View key={interest.id} style={styles.interestCard}>
                    <TouchableOpacity
                      style={styles.productInfo}
                      onPress={() => handleViewProduct(interest.productId)}
                    >
                      <Image
                        source={{ 
                          uri: interest.product.image 
                            ? getImageUrl(interest.product.image)
                            : 'https://via.placeholder.com/80x80?text=No+Image'
                        }}
                        style={styles.productImage}
                        resizeMode="cover"
                        defaultSource={{ uri: 'https://via.placeholder.com/80x80?text=Loading' }}
                      />
                      <View style={styles.productDetails}>
                        <Text style={styles.productName}>{interest.product.title}</Text>
                        <Text style={styles.price}>
                          {formatPrice(interest.totalAmount, interest.currencyCode)}
                        </Text>
                        <Text style={styles.quantity}>
                          Quantity: {interest.quantity}
                        </Text>
                        {activeTab === 'customer-interests' && interest.customer && (
                          <Text style={styles.customerName}>
                            Customer: {interest.customer.name}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <View style={styles.interestInfo}>
                      <View style={styles.interestDetails}>
                        <Text style={styles.date}>{formatDate(interest.createdAt)}</Text>
                      </View>
                      <View style={styles.interestActions}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(interest.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: getStatusColor(interest.status) },
                    ]}
                  >
                    {interest.status.charAt(0).toUpperCase() + interest.status.slice(1)}
                  </Text>
                </View>
                  <TouchableOpacity
                          style={[
                            styles.conversationButton,
                            {
                              backgroundColor: 
                                interest.status === 'pending' ? '#EFF6FF' :
                                interest.status === 'negotiating' ? '#FFFBEB' :
                                interest.status === 'accepted' ? '#ECFDF5' :
                                '#F3F4F6',
                              borderColor: 
                                interest.status === 'pending' ? '#DBEAFE' :
                                interest.status === 'negotiating' ? '#FED7AA' :
                                interest.status === 'accepted' ? '#A7F3D0' :
                                '#E5E7EB'
                            }
                          ]}
                    onPress={() => {
                            handleViewInterestDetails(interest.id);
                          }}
                        >
                          <Ionicons 
                            name={
                              interest.status === 'pending' ? 'chatbubble-outline' :
                              interest.status === 'negotiating' ? 'chatbubble-ellipses-outline' :
                              interest.status === 'accepted' ? 'chatbubble-ellipses' :
                              'chatbubble-outline'
                            } 
                            size={20} 
                            color={
                              interest.status === 'pending' ? '#2563EB' :
                              interest.status === 'negotiating' ? '#F59E0B' :
                              interest.status === 'accepted' ? '#10B981' :
                              '#6B7280'
                            } 
                          />
                  </TouchableOpacity>
                      </View>
                    </View>

                    {activeTab === 'my-interests' && interest.status === 'pending' && (
                      <View style={styles.actions}>
                  <TouchableOpacity
                          style={[styles.actionButton, styles.messageButton]}
                    onPress={() => {
                            handleViewInterestDetails(interest.id);
                    }}
                  >
                          <Ionicons name="chatbubble-outline" size={16} color="#2563EB" />
                          <Text style={styles.messageButtonText}>Message Seller</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
              </View>
            ))
          )}
          
          {/* Loading more indicator */}
          {loadingMore && (
            <View style={styles.loadingMoreContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.loadingMoreText}>Loading more interests...</Text>
            </View>
          )}
          
          {/* End of list indicator */}
          {!hasMore && interests.length > 0 && (
            <View style={styles.endOfListContainer}>
              <Text style={styles.endOfListText}>No more interests to load</Text>
            </View>
          )}
        </ScrollView>

        {/* Date Range Picker Modal */}
        <DateRangePicker
          startDate={exportDateRange.startDate}
          endDate={exportDateRange.endDate}
          onDateRangeChange={handleDateRangeChange}
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
        />

        {/* Bottom Navigation */}
        <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('home') && styles.activeNavItem]}
              onPress={() => handleTabPress('home')}
            >
              <Ionicons
                name={isActiveTab('home') ? 'home' : 'home-outline'}
                size={24}
                color={isActiveTab('home') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('home') && styles.activeNavText,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('orders') && styles.activeNavItem]}
              onPress={() => handleTabPress('orders')}
            >
              <Ionicons
                name={isActiveTab('orders') ? 'bag' : 'bag-outline'}
                size={24}
                color={isActiveTab('orders') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('orders') && styles.activeNavText,
                ]}
              >
                Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navItem,
                isActiveTab('interests') && styles.activeNavItem,
              ]}
              onPress={() => handleTabPress('interests')}
            >
              <Ionicons
                name={
                  isActiveTab('interests')
                    ? 'heart'
                    : 'heart-outline'
                }
                size={24}
                color={isActiveTab('interests') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('interests') && styles.activeNavText,
                ]}
              >
                Interests
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, isActiveTab('account') && styles.activeNavItem]}
              onPress={() => handleTabPress('account')}
            >
              <Ionicons
                name={isActiveTab('account') ? 'person' : 'person-outline'}
                size={24}
                color={isActiveTab('account') ? '#2563EB' : '#6B7280'}
              />
              <Text
                style={[
                  styles.navText,
                  isActiveTab('account') && styles.activeNavText,
                ]}
              >
                Seller
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exportButton: {
    padding: 12,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  refreshButton: {
    padding: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  interestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 4,
  },
  quantity: {
    fontSize: 12,
    color: '#6B7280',
  },
  interestInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  interestDetails: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  interestActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  conversationButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  messageButton: {
    backgroundColor: '#3B82F6',
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  shopButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeNavItem: {
    // Active state styling
  },
  navText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeNavText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  loadingMoreContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginLeft: 8,
  },
  endOfListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  endOfListText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateGroupTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  dateRangeDisplay: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dateRangeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  activeTabText: {
    color: '#2563EB',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  bottomNavContainer: {
    backgroundColor: '#FFFFFF',
  },
}); 