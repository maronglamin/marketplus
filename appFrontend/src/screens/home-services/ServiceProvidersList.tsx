import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceProvider } from '../../services/homeServicesApi';
import { getImageUrl } from '../../config/env';

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceProvidersList'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceProvidersList'>;

export function ServiceProvidersList() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { categoryId, categoryName } = route.params;

  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeServicesApi.getProviders(categoryId)
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const renderProvider = ({ item }: { item: ServiceProvider }) => {
    const profileSrc = item.profileImageUrl ? getImageUrl(item.profileImageUrl) : null;
    const description = item.serviceDescription || item.bio;

    return (
      <TouchableOpacity
        style={styles.providerCard}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate('ServiceProviderDetail', {
            providerId: item.id,
            categoryId,
            categoryName,
          })
        }
      >
        {profileSrc ? (
          <Image source={{ uri: profileSrc }} style={styles.providerAvatar} />
        ) : (
          <View style={styles.providerAvatarPlaceholder}>
            <Ionicons name="person-outline" size={24} color="#0EA5E9" />
          </View>
        )}

        <View style={styles.providerInfo}>
          <Text style={styles.providerName}>{item.displayName}</Text>
          {item.city ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#9CA3AF" />
              <Text style={styles.locationText}>{item.city}</Text>
            </View>
          ) : null}
          {description ? (
            <Text style={styles.providerBio} numberOfLines={2}>{description}</Text>
          ) : (
            <Text style={styles.providerBioMuted}>Tap to view full profile</Text>
          )}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={styles.ratingText}>
              {item.rating.toFixed(1)} ({item.reviewCount} reviews)
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <Text style={styles.headerSubtitle}>Choose a provider</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#0EA5E9" style={styles.loader} />
        ) : providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No providers yet</Text>
            <Text style={styles.emptySubtitle}>Check back soon for {categoryName} providers</Text>
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(item) => item.id}
            renderItem={renderProvider}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
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
  loader: { marginTop: 60 },
  list: { padding: 16 },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  providerAvatar: { width: 52, height: 52, borderRadius: 26 },
  providerAvatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 },
  locationText: { fontSize: 12, color: '#9CA3AF' },
  providerBio: { fontSize: 12, color: '#4B5563', marginTop: 6, lineHeight: 17 },
  providerBioMuted: { fontSize: 12, color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  ratingText: { fontSize: 12, color: '#6B7280' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
