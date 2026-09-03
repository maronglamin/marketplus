import React from 'react';
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
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { exitSection } from '../../navigation/sectionNavigation';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { realEstateApi } from '../../services/realEstateApi';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'RealEstateHub'>;
type HubRoute = RouteProp<RealEstateStackParamList, 'RealEstateHub'>;

const STAY_TYPES = [
  { type: 'HOTEL' as const, title: 'Hotels', subtitle: 'Book hotel stays', icon: 'bed-outline' as const, color: '#7C3AED' },
  { type: 'APARTMENT_RENTAL' as const, title: 'Apartments', subtitle: 'Short & long-term rentals', icon: 'home-outline' as const, color: '#0EA5E9' },
  { type: 'GUEST_HOUSE' as const, title: 'Guest House & Lodge', subtitle: 'Guesthouses and lodges', icon: 'business-outline' as const, color: '#DB2777' },
  { type: 'BOAT_TRIP' as const, title: 'Leisure & Trips', subtitle: 'Boat trips and leisure', icon: 'boat-outline' as const, color: '#0891B2' },
];

const BUY_TYPES = [
  { type: 'HOME_SALE' as const, title: 'Home Sales', subtitle: 'Browse residential properties', icon: 'home-outline' as const, color: '#059669' },
  { type: 'LAND_SALE' as const, title: 'Land Sales', subtitle: 'Plots & development land', icon: 'map-outline' as const, color: '#D97706' },
];

export function RealEstateHub() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<HubRoute>();
  const section = route.params?.section ?? 'all';
  const { requireAuth } = useRequireAuth();
  const [checkingAgent, setCheckingAgent] = React.useState(false);

  const showStay = section === 'stay' || section === 'all';
  const showRealEstate = section === 'realestate' || section === 'all';

  const headerTitle =
    section === 'stay' ? 'Stay & Accommodation' : section === 'realestate' ? 'Real Estate' : 'Stay & Real Estate';
  const headerSubtitle =
    section === 'stay'
      ? 'Hotels, apartments, lodges & trips'
      : section === 'realestate'
        ? 'Homes and land for sale'
        : 'Stays, trips, homes & land';
  const partnerLabel =
    section === 'stay' ? 'Become a Hospitality Partner' : 'Become a Property Agent';

  const openAgentFlow = async () => {
    if (!requireAuth('Login to register as a property agent.')) return;
    setCheckingAgent(true);
    try {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        navigation.navigate('ManageListings');
      } else {
        navigation.navigate('BecomePropertyAgent', { section });
      }
    } catch {
      navigation.navigate('BecomePropertyAgent', { section });
    } finally {
      setCheckingAgent(false);
    }
  };

  const renderTypeGrid = (
    items: typeof STAY_TYPES | typeof BUY_TYPES,
  ) => (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.type}
          style={styles.card}
          onPress={() => navigation.navigate('PropertyListingBrowse', { listingType: item.type, title: item.title })}
          activeOpacity={0.85}
        >
          <View style={[styles.cardIcon, { backgroundColor: `${item.color}18` }]}>
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => exitSection(navigation)}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={styles.agentBanner}
            onPress={openAgentFlow}
            disabled={checkingAgent}
          >
            {checkingAgent ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Ionicons name="person-add-outline" size={22} color="#7C3AED" />
            )}
            <View style={styles.agentBannerText}>
              <Text style={styles.agentBannerTitle}>{partnerLabel}</Text>
              <Text style={styles.agentBannerSubtitle}>List and manage properties</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.myBookingsLink}
            onPress={() => {
              if (!requireAuth('Login to view your reservations and inquiries.')) return;
              navigation.navigate('MyPropertyBookings');
            }}
          >
            <Ionicons name="bookmark-outline" size={18} color="#7C3AED" />
            <Text style={styles.myBookingsText}>My Reservations & Inquiries</Text>
          </TouchableOpacity>

          {showStay && (
            <>
              <Text style={styles.sectionTitle}>Stay & Accommodation</Text>
              {renderTypeGrid(STAY_TYPES)}
            </>
          )}

          {showRealEstate && (
            <>
              <Text style={[styles.sectionTitle, showStay ? { marginTop: 24 } : undefined]}>Real Estate</Text>
              {renderTypeGrid(BUY_TYPES)}
            </>
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
  agentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 12,
  },
  agentBannerText: { flex: 1, marginLeft: 12 },
  agentBannerTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  agentBannerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  myBookingsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  myBookingsText: { fontSize: 14, fontWeight: '500', color: '#7C3AED' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  cardSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 4 },
});
