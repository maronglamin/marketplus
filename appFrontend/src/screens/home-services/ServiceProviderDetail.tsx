import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { homeServicesApi, type ServiceProvider } from '../../services/homeServicesApi';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { DetailImageCarousel } from '../../components/DetailImageCarousel';
import { getImageUrl } from '../../config/env';
import { isValidMapCoordinates } from '../../utils/mapCoordinates';
import { useRequireAuth } from '../../hooks/useRequireAuth';

const ACCENT = '#0EA5E9';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceProviderDetail'>;
type Route = RouteProp<HomeServicesStackParamList, 'ServiceProviderDetail'>;

export function ServiceProviderDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { providerId, categoryId, categoryName } = route.params;
  const { requireAuth } = useRequireAuth('Login to request a service.');

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    homeServicesApi.getProvider(providerId)
      .then(setProvider)
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [providerId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 80 }} />
      </View>
    );
  }

  if (!provider) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Provider</Text>
          </View>
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Provider not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const portfolio = Array.isArray(provider.portfolioImages) ? provider.portfolioImages : [];
  const profileSrc = provider.profileImageUrl ? getImageUrl(provider.profileImageUrl) : null;
  const heroImages = [
    ...(profileSrc ? [profileSrc] : []),
    ...portfolio.map((url) => getImageUrl(url)),
  ];
  const locationLabel = [provider.city, provider.address].filter(Boolean).join(' · ');
  const experience = provider.application?.experience;
  const offerings = (provider.offerings ?? []).filter((o) => o.isActive);
  const hasOfferings = offerings.length > 0;

  const handleBookOffering = (offering: (typeof offerings)[0]) => {
    if (!requireAuth('Login to request a service.')) return;
    navigation.navigate('ServiceBookingRequest', {
      categoryId: offering.categoryId || categoryId,
      categoryName: offering.category?.name || categoryName,
      providerId: provider.id,
      providerName: provider.displayName,
      offeringId: offering.id,
      offeringName: offering.name,
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0EA5E9" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          {heroImages.length > 0 ? (
            <DetailImageCarousel images={heroImages} height={220} accentColor="#FFFFFF" />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="person" size={64} color="#BAE6FD" />
            </View>
          )}
          <SafeAreaView style={styles.heroOverlay} edges={['top']}>
            <TouchableOpacity style={styles.heroBack} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          <Text style={styles.name}>{provider.displayName}</Text>
          <Text style={styles.categoryLabel}>{categoryName}</Text>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.statText}>{(provider.rating ?? 0).toFixed(1)}</Text>
              <Text style={styles.statSub}>({provider.reviewCount ?? 0} reviews)</Text>
            </View>
            {locationLabel ? (
              <View style={styles.stat}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.statText} numberOfLines={1}>{provider.city || provider.address}</Text>
              </View>
            ) : null}
          </View>

          {isValidMapCoordinates(provider.latitude, provider.longitude) && (
            <View style={{ marginBottom: 16 }}>
              <LocationMapPreview
                location={{
                  latitude: provider.latitude!,
                  longitude: provider.longitude!,
                  address: provider.address || locationLabel,
                }}
                city={provider.city}
                accent="#0EA5E9"
              />
            </View>
          )}

          {provider.serviceDescription ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this service</Text>
              <Text style={styles.sectionBody}>{provider.serviceDescription}</Text>
            </View>
          ) : null}

          {provider.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About the provider</Text>
              <Text style={styles.sectionBody}>{provider.bio}</Text>
            </View>
          ) : null}

          {experience ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <Text style={styles.sectionBody}>{experience}</Text>
            </View>
          ) : null}

          {hasOfferings ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services & pricing</Text>
              {offerings.map((offering) => (
                <TouchableOpacity
                  key={offering.id}
                  style={styles.offeringCard}
                  onPress={() => handleBookOffering(offering)}
                  activeOpacity={0.85}
                >
                  <View style={styles.offeringInfo}>
                    <Text style={styles.offeringName}>{offering.name}</Text>
                    {offering.description ? (
                      <Text style={styles.offeringDesc} numberOfLines={2}>{offering.description}</Text>
                    ) : null}
                    <View style={styles.offeringMeta}>
                      <Text style={styles.offeringMetaText}>{offering.durationMinutes} min</Text>
                      {offering.basePrice != null && (
                        <Text style={styles.offeringPrice}>From D{Number(offering.basePrice).toLocaleString()}</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (provider.categories?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Services offered</Text>
              <View style={styles.chipRow}>
                {provider.categories!.map((c) => (
                  <View key={c.category.id} style={styles.chip}>
                    <Text style={styles.chipText}>{c.category.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {locationLabel ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Service area</Text>
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={18} color={ACCENT} />
                <Text style={styles.infoText}>{locationLabel}</Text>
              </View>
            </View>
          ) : null}

        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        {hasOfferings ? (
          <TouchableOpacity style={styles.requestButton} onPress={() => handleBookOffering(offerings[0])}>
            <Ionicons name="calendar-outline" size={20} color="#FFFFFF" />
            <Text style={styles.requestButtonText}>Book a Service</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noOfferingsFooter}>
            <Text style={styles.noOfferingsText}>This provider is setting up their service menu.</Text>
          </View>
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
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#9CA3AF' },
  hero: { position: 'relative' },
  heroImage: { width: SCREEN_WIDTH, height: 220, backgroundColor: '#E0F2FE' },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroBack: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16, paddingBottom: 100 },
  name: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  categoryLabel: { fontSize: 14, color: ACCENT, fontWeight: '500', marginTop: 4 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  statSub: { fontSize: 13, color: '#9CA3AF' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  sectionBody: { fontSize: 15, color: '#4B5563', lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
  },
  chipText: { fontSize: 13, color: '#0369A1', fontWeight: '500' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoText: { flex: 1, fontSize: 14, color: '#4B5563', lineHeight: 20 },
  galleryImage: { width: 140, height: 100, borderRadius: 10, marginRight: 10 },
  offeringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  offeringInfo: { flex: 1 },
  offeringName: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  offeringDesc: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  offeringMeta: { flexDirection: 'row', gap: 12, marginTop: 6 },
  offeringMetaText: { fontSize: 12, color: '#9CA3AF' },
  offeringPrice: { fontSize: 12, fontWeight: '600', color: ACCENT },
  noOfferingsFooter: { paddingVertical: 12, alignItems: 'center' },
  noOfferingsText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 16,
  },
  requestButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
