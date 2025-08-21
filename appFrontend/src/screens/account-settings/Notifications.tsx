import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { 
  ArrowLeft, 
  Bell, 
  Mail, 
  MessageCircle, 
  Settings,
  Info,
  Shield,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react-native';

export function Notifications() {
  const navigation = useNavigation<any>();
  
  // Notification settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);



  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoIcon}>
            <Info size={20} color="#2563EB" />
          </View>
          <Text style={styles.infoText}>
            Manage how you receive notifications and updates from Cloud Nexus
          </Text>
        </View>

        {/* General Notifications */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Settings size={20} color="#6B7280" />
            <Text style={styles.categoryTitle}>General Notifications</Text>
          </View>
          <View style={styles.categoryContent}>
            {/* Push Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                  <Bell size={24} color="#2563EB" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>Push Notifications</Text>
                  <Text style={styles.itemDescription}>Receive notifications on your device</Text>
                </View>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={pushNotifications ? '#2563EB' : '#F3F4F6'}
              />
            </View>

            {/* SMS Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                  <MessageCircle size={24} color="#10B981" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>SMS Notifications</Text>
                  <Text style={styles.itemDescription}>Receive updates via SMS</Text>
                </View>
              </View>
              <Switch
                value={smsNotifications}
                onValueChange={setSmsNotifications}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={smsNotifications ? '#2563EB' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* Security Alerts */}
        <View style={styles.categorySection}>
          <View style={styles.categoryHeader}>
            <Shield size={20} color="#DC2626" />
            <Text style={styles.categoryTitle}>Security Alerts</Text>
          </View>
          <View style={styles.categoryContent}>
            {/* Security Alerts */}
            <View style={styles.notificationItem}>
              <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                  <Shield size={24} color="#DC2626" />
                </View>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>Security Alerts</Text>
                  <Text style={styles.itemDescription}>Important security and account notifications</Text>
                </View>
              </View>
              <Switch
                value={securityAlerts}
                onValueChange={setSecurityAlerts}
                trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                thumbColor={securityAlerts ? '#2563EB' : '#F3F4F6'}
              />
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <CheckCircle size={20} color="#10B981" />
              <Text style={styles.quickActionText}>Enable All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionButton}>
              <XCircle size={20} color="#DC2626" />
              <Text style={styles.quickActionText}>Disable All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer Info */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            You can change these settings at any time. Some notifications are required for app functionality.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
  },
  infoIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  categorySection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  categoryContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  quickActionsSection: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 8,
  },
  footerInfo: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});
