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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { AppStackParamList } from '../navigation/AppNavigator';

type RevenueDetailsNavigationProp = NativeStackNavigationProp<AppStackParamList, 'RevenueDetails'>;

interface CurrencyRevenue {
  currency: string;
  symbol: string;
  amount: number;
  percentage: number;
}

export function RevenueDetails() {
  const navigation = useNavigation<RevenueDetailsNavigationProp>();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<CurrencyRevenue[]>([]);

  useEffect(() => {
    loadRevenueData();
  }, []);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockData: CurrencyRevenue[] = [
        { currency: 'USD', symbol: '$', amount: 12500, percentage: 65 },
        { currency: 'EUR', symbol: '€', amount: 8500, percentage: 22 },
        { currency: 'GBP', symbol: '£', amount: 3200, percentage: 8 },
        { currency: 'JPY', symbol: '¥', amount: 1800000, percentage: 3 },
        { currency: 'CAD', symbol: 'C$', amount: 1500, percentage: 2 },
      ];
      
      setRevenueData(mockData);
    } catch (error) {
      console.error('Error loading revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.amount, 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading revenue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Revenue Details</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Total Revenue</Text>
            <Text style={styles.summaryValue}>
              ${totalRevenue.toLocaleString()}
            </Text>
            <Text style={styles.summarySubtitle}>Across all currencies</Text>
          </View>

          <View style={styles.currencyList}>
            <Text style={styles.sectionTitle}>Revenue by Currency</Text>
            {revenueData.map((item, index) => (
              <TouchableOpacity
                key={item.currency}
                style={styles.currencyCard}
                onPress={() => navigation.navigate('TransactionHistory', {
                  currency: item.currency,
                  currencySymbol: item.symbol
                })}
              >
                <View style={styles.currencyHeader}>
                  <View style={styles.currencyInfo}>
                    <Text style={styles.currencyName}>{item.currency}</Text>
                    <Text style={styles.currencySymbol}>{item.symbol}</Text>
                  </View>
                  <View style={styles.currencyAmount}>
                    <Text style={styles.amountValue}>
                      {item.symbol}{item.amount.toLocaleString()}
                    </Text>
                    <Text style={styles.amountPercentage}>
                      {item.percentage}%
                    </Text>
                  </View>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${item.percentage}%` }
                    ]} 
                  />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.viewTransactionsText}>View Transactions</Text>
                  <Ionicons name="chevron-forward" size={16} color="#2563EB" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={24} color="#2563EB" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Multi-Currency Support</Text>
              <Text style={styles.infoText}>
                Your revenue is automatically converted and displayed in your default currency (USD). 
                All transactions are processed in their original currency.
              </Text>
            </View>
          </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  placeholder: {
    width: 40,
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
  summaryCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginVertical: 8,
  },
  summarySubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  currencyList: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  currencyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6B7280',
  },
  currencyAmount: {
    alignItems: 'flex-end',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  amountPercentage: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  viewTransactionsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  infoCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
}); 