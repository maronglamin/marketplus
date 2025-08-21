import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { 
  User, 
  Store, 
  Car, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle,
  ArrowLeft,
  Plus,
  ExternalLink
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { userService, UserProfileData } from '../../services/userService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AccountTypeStatus {
  type: 'Customer' | 'Seller' | 'Driver';
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  status: 'active' | 'pending' | 'rejected' | 'not-applied';
  statusText: string;
  statusColor: string;
  statusIcon: React.ReactNode;
  isEnabled: boolean;
  stats?: {
    label: string;
    value: string;
    icon: React.ReactNode;
  }[];
}

export function AccountType() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  
  const [accountData, setAccountData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    loadAccountData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadAccountData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Loading account type data...');
      const data = await userService.getUserProfile();
      console.log('✅ Account data loaded:', data);
      
      setAccountData(data);
    } catch (error) {
      console.error('❌ Error loading account data:', error);
      setError('Failed to load account information');
    } finally {
      setIsLoading(false);
    }
  };



  const getAccountTypes = (): AccountTypeStatus[] => {
    if (!accountData) {
      return [
        {
          type: 'Customer',
          title: 'Customer Account',
          description: 'Shop, order, and enjoy delivery services',
          icon: <User size={24} color="#6B7280" />,
          color: '#6B7280',
          status: 'active',
          statusText: 'Active',
          statusColor: '#10B981',
          statusIcon: <CheckCircle size={16} color="#10B981" />,
          isEnabled: true,
        }
      ];
    }

    const { accountInfo, sellerKyc, driver } = accountData;
    const accountTypes: AccountTypeStatus[] = [];

    // Customer Account (always available)
    accountTypes.push({
      type: 'Customer',
      title: 'Customer Account',
      description: 'Shop, order, and enjoy delivery services',
      icon: <User size={24} color="#6B7280" />,
      color: '#6B7280',
      status: 'active',
      statusText: 'Active',
      statusColor: '#10B981',
      statusIcon: <CheckCircle size={16} color="#10B981" />,
      isEnabled: true,
    });

    // Seller Account
    if (accountInfo.isSeller) {
      let sellerStatus: 'active' | 'pending' | 'rejected' = 'pending';
      let sellerStatusText = 'Pending Verification';
      let sellerStatusColor = '#F59E0B';
      let sellerStatusIcon = <Clock size={16} color="#F59E0B" />;

      if (sellerKyc?.status === 'APPROVED') {
        sellerStatus = 'active';
        sellerStatusText = 'Verified Seller';
        sellerStatusColor = '#10B981';
        sellerStatusIcon = <CheckCircle size={16} color="#10B981" />;
      } else if (sellerKyc?.status === 'REJECTED') {
        sellerStatus = 'rejected';
        sellerStatusText = 'Verification Rejected';
        sellerStatusColor = '#EF4444';
        sellerStatusIcon = <XCircle size={16} color="#EF4444" />;
      }

      accountTypes.push({
        type: 'Seller',
        title: 'Seller Account',
        description: 'Sell products and grow your business',
        icon: <Store size={24} color="#6B7280" />,
        color: '#6B7280',
        status: sellerStatus,
        statusText: sellerStatusText,
        statusColor: sellerStatusColor,
        statusIcon: sellerStatusIcon,
        isEnabled: sellerStatus === 'active',
      });
    } else {
      accountTypes.push({
        type: 'Seller',
        title: 'Seller Account',
        description: 'Sell products and grow your business',
        icon: <Store size={24} color="#6B7280" />,
        color: '#6B7280',
        status: 'not-applied',
        statusText: 'Not Applied',
        statusColor: '#6B7280',
        statusIcon: <AlertCircle size={16} color="#6B7280" />,
        isEnabled: false,
      });
    }

    // Driver Account
    if (accountInfo.isDriver) {
      let driverStatus: 'active' | 'pending' | 'rejected' = 'pending';
      let driverStatusText = 'Pending Verification';
      let driverStatusColor = '#F59E0B';
      let driverStatusIcon = <Clock size={16} color="#F59E0B" />;

      if (driver?.isVerified && driver?.isActive) {
        driverStatus = 'active';
        driverStatusText = 'Verified Driver';
        driverStatusColor = '#10B981';
        driverStatusIcon = <CheckCircle size={16} color="#10B981" />;
      } else if (driver?.status === 'REJECTED') {
        driverStatus = 'rejected';
        driverStatusText = 'Verification Rejected';
        driverStatusColor = '#EF4444';
        driverStatusIcon = <XCircle size={16} color="#EF4444" />;
      }

      accountTypes.push({
        type: 'Driver',
        title: 'Driver Account',
        description: 'Earn money by providing ride and delivery services',
        icon: <Car size={24} color="#6B7280" />,
        color: '#6B7280',
        status: driverStatus,
        statusText: driverStatusText,
        statusColor: driverStatusColor,
        statusIcon: driverStatusIcon,
        isEnabled: driverStatus === 'active',
      });
    } else {
      accountTypes.push({
        type: 'Driver',
        title: 'Driver Account',
        description: 'Earn money by providing ride and delivery services',
        icon: <Car size={24} color="#6B7280" />,
        color: '#6B7280',
        status: 'not-applied',
        statusText: 'Not Applied',
        statusColor: '#6B7280',
        statusIcon: <AlertCircle size={16} color="#6B7280" />,
        isEnabled: false,
      });
    }

    return accountTypes;
  };

  const handleAccountTypePress = (accountType: AccountTypeStatus) => {
    if (accountType.type === 'Customer') {
      // Navigate to Home screen for Customer account
      navigation.navigate('Home');
    } else if (accountType.status === 'not-applied') {
      // Navigate to application screen
      if (accountType.type === 'Seller') {
        navigation.navigate('SellerDashboard');
      } else if (accountType.type === 'Driver') {
        navigation.navigate('BecomeRider', { type: 'driver' });
      }
    } else if (accountType.status === 'active') {
      // Navigate to dashboard
      if (accountType.type === 'Seller') {
        navigation.navigate('SellerDashboard');
      } else if (accountType.type === 'Driver') {
        navigation.navigate('DriverDashboard');
      }
    } else {
      // Show status information
      console.log('Account status:', accountType.statusText);
    }
  };

  const accountTypes = getAccountTypes();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6B7280" />
          <Text style={styles.loadingText}>Loading your account information...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAccountData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Your Account Types</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Hello, {user?.firstName || 'User'}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Here's an overview of your account types and their status
            </Text>
          </View>

          {/* Account Types */}
          <View style={styles.accountTypesSection}>
            <Text style={styles.sectionTitle}>Your Account Types</Text>
            {accountTypes.map((accountType, index) => (
              <TouchableOpacity
                key={accountType.type}
                style={[
                  styles.accountTypeCard,
                  { opacity: accountType.isEnabled ? 1 : 0.7 }
                ]}
                onPress={() => handleAccountTypePress(accountType)}
                activeOpacity={0.8}
              >
                <View style={styles.accountTypeHeader}>
                  <View style={styles.accountTypeIcon}>
                    {accountType.icon}
                  </View>
                  <View style={styles.accountTypeInfo}>
                    <Text style={styles.accountTypeTitle}>{accountType.title}</Text>
                    <Text style={styles.accountTypeDescription}>{accountType.description}</Text>
                    <View style={styles.statusContainer}>
                      {accountType.statusIcon}
                      <Text style={[styles.statusText, { color: accountType.statusColor }]}>
                        {accountType.statusText}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.accountTypeAction}>
                    {accountType.status === 'not-applied' ? (
                      <Plus size={20} color="#6B7280" />
                    ) : accountType.status === 'active' ? (
                      <ExternalLink size={20} color="#6B7280" />
                    ) : (
                      <AlertCircle size={20} color="#6B7280" />
                    )}
                  </View>
                </View>


              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Account Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Active Accounts</Text>
                <Text style={styles.summaryValue}>
                  {accountTypes.filter(acc => acc.status === 'active').length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pending Verification</Text>
                <Text style={styles.summaryValue}>
                  {accountTypes.filter(acc => acc.status === 'pending').length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Available to Apply</Text>
                <Text style={styles.summaryValue}>
                  {accountTypes.filter(acc => acc.status === 'not-applied').length}
                </Text>
              </View>
            </View>
          </View>


        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#6B7280',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  welcomeSection: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  accountTypesSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  accountTypeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  accountTypeHeader: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  accountTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  accountTypeInfo: {
    flex: 1,
  },
  accountTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  accountTypeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  accountTypeAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },

  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    fontSize: 16,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },

});
