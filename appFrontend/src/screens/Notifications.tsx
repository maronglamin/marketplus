import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { rentalApi } from '../services/rentalApi';
import { useAuth } from '../contexts/AuthContext';

type RootStackParamList = {
  Home: undefined;
  Notifications: undefined;
  RentalChat: { rentalId: string };
};

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

interface RentalNotification {
  id: string;
  type: 'rental_message';
  rentalId: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  senderName: string;
  rentalService: string;
  pickupAddress: string;
  unreadCount: number;
  totalMessages: number;
}

export function Notifications() {
  const navigation = useNavigation<NotificationsScreenNavigationProp>();
  const { user } = useAuth();
  
  const [notifications, setNotifications] = useState<RentalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const data = await rentalApi.getAllNotifications();
      setNotifications(data.notifications || []);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      setError('Failed to load notifications');
      if (!isRefresh) {
        Alert.alert('Error', 'Failed to load notifications. Please try again.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleRefresh = () => {
    loadNotifications(true);
  };

  const handleNotificationPress = (notification: RentalNotification) => {
    // Navigate to the rental chat
    navigation.navigate('RentalChat', { rentalId: notification.rentalId });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'rental_message':
        return 'chatbubble-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string, read: boolean) => {
    if (read) {
      return '#9CA3AF'; // Gray for read messages
    }
    
    switch (type) {
      case 'rental_message':
        return '#2563EB'; // Blue for unread messages
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.title}>Notifications</Text>
            <View style={styles.placeholderButton} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <TouchableOpacity
            onPress={handleRefresh}
            style={styles.refreshButton}
            disabled={refreshing}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={refreshing ? "#9CA3AF" : "#2563EB"} 
            />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
            />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => loadNotifications()} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                You don't have any rental messages yet.
              </Text>
            </View>
          ) : (
            <>
              {/* Summary Section */}
              <View style={styles.summaryContainer}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {notifications.filter(n => !n.read).length}
                  </Text>
                  <Text style={styles.summaryLabel}>Unread</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {notifications.length}
                  </Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
              </View>

              {/* Notifications List */}
              {notifications.map((notification) => (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notification,
                    !notification.read && styles.unreadNotification,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.notificationIcon,
                    { backgroundColor: notification.read ? '#F3F4F6' : '#EBF4FF' }
                  ]}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type)} 
                      size={24} 
                      color={getNotificationColor(notification.type, notification.read)} 
                    />
                  </View>
                  <View style={styles.notificationContent}>
                    <View style={styles.notificationHeader}>
                      <Text style={[
                        styles.notificationTitle,
                        notification.read && styles.readNotificationTitle
                      ]}>
                        {notification.title}
                      </Text>
                      <Text style={[
                        styles.notificationTime,
                        notification.read && styles.readNotificationTime
                      ]}>
                        {getTimeAgo(notification.time)}
                      </Text>
                    </View>
                    <Text style={[
                      styles.notificationMessage,
                      notification.read && styles.readNotificationMessage
                    ]} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <View style={styles.notificationMeta}>
                      <Text style={styles.notificationService}>
                        {notification.rentalService}
                      </Text>
                      <View style={styles.messageCountContainer}>
                        {notification.unreadCount > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadBadgeText}>
                              {notification.unreadCount}
                            </Text>
                          </View>
                        )}
                        <Text style={styles.totalMessagesText}>
                          {notification.totalMessages} message{notification.totalMessages > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {!notification.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              ))}
            </>
          )}
        </ScrollView>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  placeholderButton: {
    width: 36,
    height: 36,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
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
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  notification: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  unreadNotification: {
    backgroundColor: '#F8FAFC',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  readNotificationTitle: {
    color: '#6B7280',
    fontWeight: '500',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  readNotificationTime: {
    color: '#D1D5DB',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  readNotificationMessage: {
    color: '#9CA3AF',
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationService: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  messageCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadBadge: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  totalMessagesText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
    marginLeft: 8,
    alignSelf: 'center',
  },
}); 