import React, { useState, useEffect, useCallback } from 'react';
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { interestService, type Interest } from '../services/interestService';
import { getImageUrl } from '../config/env';

type ChatListNavigationProp = NativeStackNavigationProp<AppStackParamList, 'ChatList'>;

interface ChatItem {
  id: string;
  sellerId: string;
  sellerName: string;
  businessName: string;
  sellerImage?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  productTitle: string;
  productImage?: string;
  interestStatus: string;
}

export function ChatList() {
  const navigation = useNavigation<ChatListNavigationProp>();
  const { user, token } = useAuth();
  
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChatItems();
  }, []);

  const loadChatItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's interests to build chat list
      const response = await interestService.getChatListInterests(1, 50);
      
      console.log('ChatList - Raw interests response:', {
        total: response.total,
        interestsCount: response.interests.length,
        interests: response.interests.slice(0, 3) // Log first 3 for debugging
      });
      
      // Create chat items for each interest (not grouped by seller)
      const chatItems: ChatItem[] = [];
      
      response.interests.forEach((interest: Interest) => {
        // Skip if no seller information
        if (!interest.product.seller) {
          console.warn('Interest without seller info:', interest.id);
          return;
        }

        const sellerName = interest.product.seller.name;
        const businessName = interest.product.seller.businessName || sellerName;
        
        chatItems.push({
          id: interest.id, // Use interest ID instead of seller ID
          sellerId: interest.product.seller.id,
          sellerName,
          businessName,
          sellerImage: interest.product.seller.image,
          lastMessage: `Interest in ${interest.product.title}`,
          lastMessageTime: interest.updatedAt || interest.createdAt,
          unreadCount: 0,
          productTitle: interest.product.title,
          productImage: interest.product.image,
          interestStatus: interest.status,
        });
      });
      
      // Sort by latest message time
      const sortedChats = chatItems.sort((a, b) => 
        new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
      );
      
      console.log('ChatList - Processed chat items:', {
        totalInterests: response.interests.length,
        totalChatItems: chatItems.length,
        chatItems: sortedChats.length,
        chatItemsData: sortedChats.slice(0, 3) // Log first 3 for debugging
      });
      
      setChatItems(sortedChats);
    } catch (error: any) {
      console.error('Error loading chat items:', error);
      setError('Failed to load conversations');
      Alert.alert('Error', 'Failed to load conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadChatItems();
    } finally {
      setRefreshing(false);
    }
  }, [loadChatItems]);

  const handleChatPress = (chatItem: ChatItem) => {
    navigation.navigate('SellerInterestDetail', { 
      interestId: chatItem.id
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
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

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar 
          barStyle="dark-content" 
          backgroundColor="#FFFFFF" 
          translucent={Platform.OS === 'android'}
        />
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Messages</Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
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
          <Text style={styles.title}>Messages</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons name="refresh" size={24} color="#2563EB" />
            )}
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadChatItems} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : chatItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Messages Yet</Text>
              <Text style={styles.emptyText}>
                You haven't sent any interest messages yet. Start browsing products and show interest to begin conversations with sellers.
              </Text>
              <TouchableOpacity
                style={styles.browseButton}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.browseButtonText}>Browse Products</Text>
              </TouchableOpacity>
            </View>
          ) : (
            chatItems.map((chatItem) => (
              <TouchableOpacity
                key={chatItem.id}
                style={styles.chatItem}
                onPress={() => handleChatPress(chatItem)}
                activeOpacity={0.7}
              >
                <View style={styles.chatItemLeft}>
                  {chatItem.sellerImage ? (
                    <Image
                      source={{ 
                        uri: getImageUrl(chatItem.sellerImage)
                      }}
                      style={styles.sellerImage}
                      resizeMode="cover"
                      defaultSource={{ uri: 'https://via.placeholder.com/60x60?text=Loading' }}
                    />
                  ) : (
                    <View style={styles.sellerImagePlaceholder}>
                      <Ionicons name="person" size={30} color="#9CA3AF" />
                    </View>
                  )}
                  {chatItem.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chatItem.unreadCount}</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.chatItemContent}>
                  <View style={styles.chatItemHeader}>
                    <Text style={styles.businessName} numberOfLines={1}>
                      {chatItem.businessName}
                    </Text>
                    <Text style={styles.timeText}>
                      {formatTime(chatItem.lastMessageTime)}
                    </Text>
                  </View>
                  
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {chatItem.lastMessage}
                  </Text>
                  
                  <View style={styles.chatItemFooter}>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {chatItem.productTitle}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(chatItem.interestStatus)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(chatItem.interestStatus) },
                        ]}
                      >
                        {chatItem.interestStatus.charAt(0).toUpperCase() + chatItem.interestStatus.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.chatItemRight}>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  content: {
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
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  chatItemLeft: {
    position: 'relative',
    marginRight: 12,
  },
  sellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  sellerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chatItemContent: {
    flex: 1,
  },
  chatItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  chatItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  chatItemRight: {
    marginLeft: 8,
  },
}); 