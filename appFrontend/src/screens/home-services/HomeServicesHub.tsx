import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { exitSection } from '../../navigation/sectionNavigation';
import { homeServicesApi, type ServiceCategory } from '../../services/homeServicesApi';
import { useRequireAuth } from '../../hooks/useRequireAuth';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'HomeServicesHub'>;

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plumbing: 'water-outline',
  cleaning: 'sparkles-outline',
  welding: 'flame-outline',
  electrical: 'flash-outline',
  'architectural-design': 'business-outline',
  'fitness-coaching': 'fitness-outline',
};

export function HomeServicesHub() {
  const navigation = useNavigation<Nav>();
  const { requireAuth } = useRequireAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeServicesApi.getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  const [checkingProvider, setCheckingProvider] = React.useState(false);

  const openProviderFlow = async () => {
    if (!requireAuth('Login to register as a service provider.')) return;
    setCheckingProvider(true);
    try {
      const data = await homeServicesApi.getMyApplication();
      if (data?.provider || data?.application?.status === 'APPROVED') {
        navigation.navigate('ServiceProviderDashboard');
      } else {
        navigation.navigate('BecomeServiceProvider');
      }
    } catch {
      navigation.navigate('BecomeServiceProvider');
    } finally {
      setCheckingProvider(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => exitSection(navigation)}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Home & Professional Services</Text>
            <Text style={styles.headerSubtitle}>Book trusted trades & coaches</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.providerBanner}
            onPress={openProviderFlow}
            disabled={checkingProvider}
          >
            {checkingProvider ? (
              <ActivityIndicator size="small" color="#0EA5E9" />
            ) : (
              <Ionicons name="briefcase-outline" size={22} color="#0EA5E9" />
            )}
            <View style={styles.providerBannerText}>
              <Text style={styles.providerBannerTitle}>Become a Service Provider</Text>
              <Text style={styles.providerBannerSubtitle}>Register and offer your skills</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.myBookingsLink}
            onPress={() => {
              if (!requireAuth('Login to view your service bookings.')) return;
              navigation.navigate('MyServiceBookings');
            }}
          >
            <Ionicons name="calendar-outline" size={18} color="#0EA5E9" />
            <Text style={styles.myBookingsText}>My Service Bookings</Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>Choose a Service</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 40 }} />
          ) : (
            <View style={styles.grid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryCard}
                  onPress={() => navigation.navigate('ServiceProvidersList', {
                    categoryId: cat.id,
                    categoryName: cat.name,
                  })}
                  activeOpacity={0.85}
                >
                  <View style={styles.categoryIcon}>
                    <Ionicons
                      name={CATEGORY_ICONS[cat.slug] || 'construct-outline'}
                      size={28}
                      color="#0EA5E9"
                    />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                  {cat.description ? (
                    <Text style={styles.categoryDesc} numberOfLines={2}>{cat.description}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, marginRight: 8 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  content: { flex: 1, padding: 16 },
  providerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    marginBottom: 12,
  },
  providerBannerText: { flex: 1, marginLeft: 12 },
  providerBannerTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  providerBannerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  myBookingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  myBookingsText: { fontSize: 14, fontWeight: '500', color: '#0EA5E9' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoryCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryName: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  categoryDesc: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 16 },
});
