import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { HomeServicesStackParamList } from '../../navigation/HomeServicesNavigator';
import { goToSectionRoot, navigateToRootScreen } from '../../navigation/sectionNavigation';
import { homeServicesApi, type ServiceBooking, type ServiceProvider } from '../../services/homeServicesApi';
import { settlementService, type AvailableHomeServiceEarnings } from '../../services/settlementService';
import { uploadService } from '../../services/uploadService';
import { getImageUrl } from '../../config/env';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';
import { providerSubscriptionApi, type SubscriptionSnapshot } from '../../services/providerSubscriptionApi';

const { width: screenWidth } = Dimensions.get('window');

type Nav = NativeStackNavigationProp<HomeServicesStackParamList, 'ServiceProviderDashboard'>;
import { ManageServiceOfferings, ProviderAvailabilityEditor } from './ProviderCatalogScreens';

type Tab = 'overview' | 'services' | 'availability' | 'bookings' | 'profile';

const ACCENT = '#0EA5E9';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: '#F59E0B',
  QUOTED: '#0EA5E9',
  ACCEPTED: '#10B981',
  PAID: '#059669',
  COMPLETED: '#6366F1',
  REJECTED: '#EF4444',
  CANCELLED: '#6B7280',
};

export function ServiceProviderDashboard() {
  const navigation = useNavigation<Nav>();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [offeringsCount, setOfferingsCount] = useState(0);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notApproved, setNotApproved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [serviceDescription, setServiceDescription] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [portfolioUris, setPortfolioUris] = useState<string[]>([]);
  const [availableEarnings, setAvailableEarnings] = useState<AvailableHomeServiceEarnings[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);

  const loadEarnings = useCallback(async () => {
    try {
      const earnings = await settlementService.getAvailableHomeServiceEarnings();
      setAvailableEarnings(earnings ?? []);
    } catch {
      setAvailableEarnings([]);
    }
  }, []);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const appData = await homeServicesApi.getMyApplication();
      setApplicationStatus(appData?.application?.status ?? null);
      if (!appData?.provider) {
        setNotApproved(true);
        setProvider(null);
        setBookings([]);
        setAvailableEarnings([]);
        return;
      }

      setNotApproved(false);
      const p = appData.provider as ServiceProvider;
      setProvider(p);
      setServiceDescription(p.serviceDescription || '');
      setBio(p.bio || '');
      setProfileImageUrl(p.profileImageUrl || null);
      setPortfolioImages(Array.isArray(p.portfolioImages) ? p.portfolioImages : []);

      const data = await homeServicesApi.getProviderDashboard();
      setBookings(data);
      const offerings = await homeServicesApi.getMyOfferings();
      setOfferingsCount(offerings.filter((o) => o.isActive).length);
      await loadEarnings();
      try {
        setSubscription(await providerSubscriptionApi.getMine('HOME_SERVICES'));
      } catch {
        setSubscription(null);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadEarnings]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useApprovalRedirect({
    enabled: applicationStatus === 'PENDING' && notApproved,
    checkApproval: async () => {
      const data = await homeServicesApi.getMyApplication();
      if (data?.provider) {
        setApplicationStatus('APPROVED');
        setNotApproved(false);
        await loadData(true);
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => loadData(true),
    title: 'Application Approved',
    message: 'Your service provider application was approved. Your dashboard is ready.',
  });

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING_QUOTE' || b.status === 'QUOTED').length,
    active: bookings.filter((b) => b.status === 'ACCEPTED' || b.status === 'PAID').length,
    completed: bookings.filter((b) => b.status === 'COMPLETED').length,
  }), [bookings]);

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to add a profile image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfileImageUri(result.assets[0].uri);
    }
  };

  const pickPortfolioImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to add work photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPortfolioUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setSubmitting(true);
      let uploadedProfile = profileImageUrl;
      if (profileImageUri) {
        uploadedProfile = await uploadService.uploadImage(profileImageUri);
      }

      const uploadedPortfolio = [...portfolioImages];
      for (const uri of portfolioUris) {
        const url = await uploadService.uploadImage(uri);
        uploadedPortfolio.push(url);
      }

      const updated = await homeServicesApi.updateProviderProfile({
        bio: bio.trim() || undefined,
        serviceDescription: serviceDescription.trim() || undefined,
        profileImageUrl: uploadedProfile || undefined,
        portfolioImages: uploadedPortfolio,
      });

      setProvider(updated);
      setProfileImageUrl(updated.profileImageUrl || null);
      setPortfolioImages(Array.isArray(updated.portfolioImages) ? updated.portfolioImages : uploadedPortfolio);
      setProfileImageUri(null);
      setPortfolioUris([]);
      Alert.alert('Saved', 'Your provider profile has been updated.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderBooking = ({ item }: { item: ServiceBooking }) => {
    const statusColor = STATUS_COLORS[item.status] || '#6B7280';
    const customerName = item.customer
      ? `${item.customer.firstName} ${item.customer.lastName}`.trim()
      : 'Customer';

    return (
      <TouchableOpacity
        style={styles.bookingCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('ServiceProviderBookingDetail', { bookingId: item.id })}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.bookingRef}>{item.bookingRef}</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
        <Text style={styles.categoryName}>{item.category?.name}</Text>
        <Text style={styles.customerName}>{customerName}</Text>
        {item.scheduledAt ? (
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.metaText}>{new Date(item.scheduledAt).toLocaleDateString()}</Text>
          </View>
        ) : null}
        {item.notes ? (
          <Text style={styles.notesPreview} numberOfLines={1}>{item.notes}</Text>
        ) : null}
        <View style={styles.cardFooter}>
          <Text style={styles.viewDetails}>View details</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const displayProfileImage = profileImageUri
    ? profileImageUri
    : profileImageUrl
      ? getImageUrl(profileImageUrl)
      : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ACCENT} />
          <Text style={styles.loadingText}>Loading your dashboard…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notApproved) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'HomeServicesHub')}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Provider</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.notApproved}>
          <View style={styles.pendingIconWrap}>
            <Ionicons name="time-outline" size={64} color="#D97706" />
          </View>
          <Text style={styles.notApprovedTitle}>
            {applicationStatus === 'PENDING' ? 'Application Pending Review' : 'Provider Approval Required'}
          </Text>
          <Text style={styles.notApprovedSubtitle}>
            {applicationStatus === 'PENDING'
              ? 'We are reviewing your application. You will be redirected automatically when approved.'
              : 'Complete your service provider application to start receiving bookings.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('BecomeServiceProvider')}
          >
            <Text style={styles.primaryButtonText}>View Application</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'HomeServicesHub')}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Provider Dashboard</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => goToSectionRoot(navigation, 'HomeServicesHub')}>
          <Ionicons name="home-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {(['overview', 'services', 'availability', 'bookings', 'profile'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {offeringsCount === 0 && activeTab === 'overview' && (
        <View style={styles.setupBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#D97706" />
          <Text style={styles.setupBannerText}>Complete setup: add at least one service and set your availability.</Text>
        </View>
      )}
      {subscription?.settings?.isRequired && subscription.subscription && subscription.subscription.status !== 'ACTIVE' && (
        <TouchableOpacity
          style={[
            styles.setupBanner,
            subscription.subscription.status === 'SUSPENDED' && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
          ]}
          onPress={() => navigation.navigate('ProviderSubscriptionPay', { vertical: 'HOME_SERVICES' })}
        >
          <Ionicons
            name={subscription.subscription.status === 'SUSPENDED' ? 'alert-circle-outline' : 'card-outline'}
            size={20}
            color={subscription.subscription.status === 'SUSPENDED' ? '#B91C1C' : '#D97706'}
          />
          <Text style={[styles.setupBannerText, subscription.subscription.status === 'SUSPENDED' && { color: '#991B1B' }]}>
            {subscription.subscription.status === 'GRACE'
              ? `Pay by ${new Date(subscription.subscription.gracePeriodEndsAt).toLocaleDateString()} to stay listed.`
              : subscription.subscription.status === 'PAST_DUE'
                ? 'Renew now to avoid suspension.'
                : 'Pay to restore your listing.'}
          </Text>
        </TouchableOpacity>
      )}

      {activeTab === 'overview' ? (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={ACCENT} />
          }
        >
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>
              Welcome back{provider?.displayName ? `, ${provider.displayName.split(' ')[0]}` : ''}
            </Text>
            <Text style={styles.heroSubtitle}>Manage service requests and your provider profile</Text>
            <View style={styles.heroMeta}>
              <Ionicons name="star" size={16} color="#FCD34D" />
              <Text style={styles.heroMetaText}>
                {provider?.rating?.toFixed(1) ?? '5.0'} · {provider?.reviewCount ?? 0} reviews
              </Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total Bookings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Awaiting Action</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setActiveTab('profile')}>
              <Ionicons name="person-outline" size={22} color={ACCENT} />
              <Text style={styles.actionButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => goToSectionRoot(navigation, 'HomeServicesHub')}>
              <Ionicons name="search-outline" size={22} color={ACCENT} />
              <Text style={styles.actionButtonText}>Browse Services</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <View style={styles.earningsTitleRow}>
                <Ionicons name="wallet-outline" size={20} color={ACCENT} />
                <Text style={styles.earningsTitle}>Available for settlement</Text>
              </View>
              {availableEarnings.length > 0 ? (
                availableEarnings.map((earning) => (
                  <View key={earning.currency} style={styles.earningsRow}>
                    <Text style={styles.earningsAmount}>
                      {earning.currencySymbol || earning.currency}
                      {Number(earning.amount).toLocaleString()}
                    </Text>
                    <Text style={styles.earningsMeta}>
                      {earning.bookingsCount} paid booking{earning.bookingsCount === 1 ? '' : 's'} · {earning.currency}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.earningsEmpty}>
                  Paid service bookings will appear here when ready to settle.
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.settlementButton,
                availableEarnings.length === 0 && styles.settlementButtonDisabled,
              ]}
              disabled={availableEarnings.length === 0}
              activeOpacity={0.85}
              onPress={() =>
                navigateToRootScreen(navigation, 'HomeServiceSettlementRequest', {
                  defaultCurrency: availableEarnings[0]?.currency,
                })
              }
            >
              <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.settlementButtonText}>Request Settlement</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.historyLink}
              activeOpacity={0.7}
              onPress={() =>
                navigateToRootScreen(navigation, 'SettlementHistory', { channel: 'HOME_SERVICES' })
              }
            >
              <Text style={styles.historyLinkText}>View settlement history</Text>
              <Ionicons name="chevron-forward" size={16} color={ACCENT} />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <Text style={styles.sectionCount}>{bookings.length} total</Text>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptySubtitle}>New service requests will appear here</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {bookings.map((item) => (
                <View key={item.id}>{renderBooking({ item })}</View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : activeTab === 'services' ? (
        <ManageServiceOfferings onChanged={() => loadData(true)} />
      ) : activeTab === 'availability' ? (
        <ProviderAvailabilityEditor />
      ) : activeTab === 'bookings' ? (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={ACCENT} />
          }
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Bookings Inbox</Text>
            <Text style={styles.sectionCount}>{bookings.length} total</Text>
          </View>
          {bookings.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No bookings yet</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {bookings.map((item) => (
                <View key={item.id}>{renderBooking({ item })}</View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
          <ScrollView style={styles.profileContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.profileSectionTitle}>How customers see you</Text>
            <Text style={styles.profileHint}>Add a photo and describe your services so customers can choose you.</Text>

            <TouchableOpacity style={styles.profileImagePicker} onPress={pickProfileImage}>
              {displayProfileImage ? (
                <Image source={{ uri: displayProfileImage }} style={styles.profileImage} />
              ) : (
                <View style={styles.profileImagePlaceholder}>
                  <Ionicons name="camera-outline" size={32} color="#9CA3AF" />
                  <Text style={styles.profileImagePlaceholderText}>Add profile photo</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Service Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={serviceDescription}
              onChangeText={setServiceDescription}
              placeholder="Describe what you offer, your specialties, pricing approach..."
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Short background about yourself"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Work Photos</Text>
            <Text style={styles.profileHint}>Show examples of your past work to build trust.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioRow}>
              {portfolioImages.map((url, i) => (
                <Image key={`saved-${i}`} source={{ uri: getImageUrl(url) }} style={styles.portfolioThumb} />
              ))}
              {portfolioUris.map((uri, i) => (
                <Image key={`new-${i}`} source={{ uri }} style={styles.portfolioThumb} />
              ))}
              <TouchableOpacity style={styles.addPhotoButton} onPress={pickPortfolioImage}>
                <Ionicons name="add" size={28} color={ACCENT} />
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 15, color: '#6B7280' },
  content: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4, width: 36 },
  headerSpacer: { width: 36 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'center' },
  heroCard: {
    margin: 16,
    padding: 20,
    backgroundColor: ACCENT,
    borderRadius: 12,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 6 },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  heroMetaText: { fontSize: 14, color: '#FFFFFF', fontWeight: '600' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
  },
  actionButtonText: { fontSize: 14, fontWeight: '600', color: ACCENT },
  earningsCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
    backgroundColor: '#F0F9FF',
    maxWidth: Math.min(900, screenWidth - 32),
    alignSelf: 'center',
    width: '100%',
  },
  earningsHeader: { marginBottom: 12 },
  earningsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  earningsTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  earningsRow: { marginBottom: 8 },
  earningsAmount: { fontSize: 22, fontWeight: '700', color: ACCENT },
  earningsMeta: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  earningsEmpty: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  settlementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
  },
  settlementButtonDisabled: { opacity: 0.45 },
  settlementButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
  },
  historyLinkText: { fontSize: 13, fontWeight: '600', color: ACCENT },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },
  sectionCount: { fontSize: 13, color: '#6B7280' },
  tabs: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 12, gap: 4 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  setupBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  setupBannerText: { flex: 1, fontSize: 13, color: '#92400E' },
  tabActive: { backgroundColor: '#E0F2FE' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  tabTextActive: { color: ACCENT, fontWeight: '600' },
  list: { padding: 16 },
  bookingCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bookingRef: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  categoryName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 8 },
  customerName: { fontSize: 13, color: ACCENT, marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { fontSize: 13, color: '#6B7280' },
  notesPreview: { fontSize: 13, color: '#6B7280', marginTop: 6, fontStyle: 'italic' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  viewDetails: { fontSize: 13, color: ACCENT, fontWeight: '500' },
  emptyState: { alignItems: 'center', marginTop: 24, marginBottom: 40, padding: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, textAlign: 'center' },
  notApproved: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  pendingIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  notApprovedTitle: { fontSize: 20, fontWeight: '600', color: '#111827', textAlign: 'center' },
  notApprovedSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
  primaryButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primaryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  profileContent: { flex: 1, padding: 16 },
  profileSectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  profileHint: { fontSize: 13, color: '#6B7280', marginTop: 4, marginBottom: 16, lineHeight: 18 },
  profileImagePicker: { alignSelf: 'center', marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  profileImagePlaceholderText: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  portfolioRow: { marginTop: 8, marginBottom: 20 },
  portfolioThumb: { width: 80, height: 80, borderRadius: 8, marginRight: 8 },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  buttonDisabled: { opacity: 0.6 },
});
