import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyInquiry } from '../../services/realEstateApi';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'AgentInquiryDetail'>;
type Route = RouteProp<RealEstateStackParamList, 'AgentInquiryDetail'>;

const ACCENT = '#7C3AED';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#D97706',
  CONTACTED: '#0EA5E9',
  OFFERED: '#7C3AED',
  CLOSED: '#6B7280',
  PURCHASED: '#059669',
};

function DetailRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={18} color="#6B7280" />
      <View style={styles.detailContent}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, onPress ? styles.linkValue : null]}>{value}</Text>
      </View>
      {onPress ? <Ionicons name="open-outline" size={16} color={ACCENT} /> : null}
    </View>
  );
  if (!onPress) return content;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

export function AgentInquiryDetail() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { inquiryId } = route.params;

  const [inquiry, setInquiry] = useState<PropertyInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadInquiry = useCallback(async () => {
    try {
      setLoading(true);
      const data = await realEstateApi.getInquiry(inquiryId);
      setInquiry(data);
    } catch {
      Alert.alert('Error', 'Failed to load inquiry details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [inquiryId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadInquiry();
    }, [loadInquiry]),
  );

  const updateStatus = (status: 'CONTACTED' | 'CLOSED' | 'PENDING' | 'OFFERED') => {
    const labels: Record<string, string> = {
      CONTACTED: 'Mark as contacted',
      CLOSED: 'Close inquiry',
      PENDING: 'Reopen inquiry',
      OFFERED: 'Offer purchase to this customer',
    };
    const messages: Record<string, string> = {
      CONTACTED: 'Update this inquiry status?',
      CLOSED: 'Update this inquiry status?',
      PENDING: 'Update this inquiry status?',
      OFFERED:
        'Only this customer will be allowed to pay. Any other purchase offer on this listing will be revoked.',
    };
    Alert.alert(labels[status], messages[status], [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Update',
        onPress: async () => {
          try {
            setSubmitting(true);
            const updated = await realEstateApi.updateInquiryStatus(inquiryId, status);
            setInquiry(updated);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to update inquiry.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  if (loading || !inquiry) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 80 }} />
      </View>
    );
  }

  const statusColor = STATUS_COLORS[inquiry.status] || '#6B7280';
  const customerName = inquiry.customer
    ? `${inquiry.customer.firstName || ''} ${inquiry.customer.lastName || ''}`.trim() || 'Customer'
    : 'Customer';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Inquiry</Text>
            <Text style={styles.headerSubtitle}>{inquiry.listing?.title || 'Property'}</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
            <Ionicons name="information-circle-outline" size={20} color={statusColor} />
            <Text style={[styles.statusBannerText, { color: statusColor }]}>
              {inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED'
                ? 'PURCHASED'
                : inquiry.status}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Property</Text>
          <View style={styles.card}>
            <DetailRow icon="home-outline" label="Listing" value={inquiry.listing?.title || 'Property'} />
            {inquiry.listing?.city ? (
              <DetailRow icon="location-outline" label="City" value={inquiry.listing.city} />
            ) : null}
            {inquiry.salePrice != null || inquiry.listing?.price != null ? (
              <DetailRow
                icon="cash-outline"
                label="Sale price"
                value={`${inquiry.currency || inquiry.listing?.currency || 'GMD'} ${Number(
                  inquiry.salePrice ?? inquiry.listing?.price ?? 0,
                ).toLocaleString()}`}
              />
            ) : null}
            {inquiry.paymentStatus ? (
              <DetailRow icon="card-outline" label="Payment" value={inquiry.paymentStatus} />
            ) : null}
            {inquiry.listing?.status ? (
              <DetailRow icon="flag-outline" label="Listing status" value={inquiry.listing.status} />
            ) : null}
            {inquiry.preferredDate ? (
              <DetailRow
                icon="calendar-outline"
                label="Preferred date"
                value={format(new Date(inquiry.preferredDate), 'EEE, MMM d, yyyy')}
              />
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Message</Text>
          <View style={styles.messageCard}>
            <Text style={styles.messageText}>{inquiry.message}</Text>
          </View>

          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.card}>
            <DetailRow icon="person-outline" label="Name" value={customerName} />
            {inquiry.customer?.phoneNumber ? (
              <DetailRow
                icon="call-outline"
                label="Phone"
                value={inquiry.customer.phoneNumber}
                onPress={() => Linking.openURL(`tel:${inquiry.customer!.phoneNumber}`)}
              />
            ) : null}
            <DetailRow
              icon="time-outline"
              label="Received"
              value={format(new Date(inquiry.createdAt), 'MMM d, yyyy · h:mm a')}
            />
          </View>

          <View style={styles.actions}>
            {inquiry.status !== 'PURCHASED' && inquiry.paymentStatus !== 'PAID' && inquiry.status === 'PENDING' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.contactButton, submitting && styles.disabled]}
                onPress={() => updateStatus('CONTACTED')}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="chatbubble-ellipses-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}>Mark as Contacted</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            {inquiry.status !== 'PURCHASED' &&
              inquiry.paymentStatus !== 'PAID' &&
              inquiry.status !== 'CLOSED' &&
              inquiry.status !== 'OFFERED' &&
              inquiry.listing?.status !== 'SOLD' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.offerButton, submitting && styles.disabled]}
                onPress={() => updateStatus('OFFERED')}
                disabled={submitting}
              >
                <Ionicons name="cash-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Offer Purchase</Text>
              </TouchableOpacity>
            )}
            {inquiry.status === 'OFFERED' && inquiry.paymentStatus !== 'PAID' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.contactButton, submitting && styles.disabled]}
                onPress={() => updateStatus('CONTACTED')}
                disabled={submitting}
              >
                <Ionicons name="close-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Revoke Purchase Offer</Text>
              </TouchableOpacity>
            )}
            {inquiry.status !== 'PURCHASED' && inquiry.paymentStatus !== 'PAID' && inquiry.status !== 'CLOSED' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.closeButton, submitting && styles.disabled]}
                onPress={() => updateStatus('CLOSED')}
                disabled={submitting}
              >
                <Ionicons name="checkmark-done-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Close Inquiry</Text>
              </TouchableOpacity>
            )}
            {inquiry.status !== 'PURCHASED' && inquiry.paymentStatus !== 'PAID' && inquiry.status === 'CLOSED' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.reopenButton, submitting && styles.disabled]}
                onPress={() => updateStatus('PENDING')}
                disabled={submitting}
              >
                <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Reopen</Text>
              </TouchableOpacity>
            )}
          </View>
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
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusBannerText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  card: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  messageCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 14,
    marginBottom: 20,
  },
  messageText: { fontSize: 15, color: '#1F2937', lineHeight: 22 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#1F2937', fontWeight: '500' },
  linkValue: { color: ACCENT },
  actions: { gap: 10, marginBottom: 32 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  contactButton: { backgroundColor: '#0EA5E9' },
  offerButton: { backgroundColor: '#7C3AED' },
  closeButton: { backgroundColor: '#6B7280' },
  reopenButton: { backgroundColor: ACCENT },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.7 },
});
