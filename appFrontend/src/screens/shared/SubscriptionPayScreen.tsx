import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  providerSubscriptionApi,
  type ProviderSubscriptionPlan,
  type SubscriptionSnapshot,
  type SubscriptionVertical,
} from '../../services/providerSubscriptionApi';
import {
  ensureSavedPaymentMethods,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';
import { PaymentMethodIcon } from '../../components/PaymentMethodIcon';
import StripePayment from '../../components/StripePayment';
import YonnaPaymentModal from '../../components/YonnaPaymentModal';
import { useAuth } from '../../contexts/AuthContext';

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Every 6 months',
  YEARLY: 'Yearly',
};

export function SubscriptionPayScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const vertical: SubscriptionVertical = route.params?.vertical || 'HOME_SERVICES';
  const [plans, setPlans] = useState<ProviderSubscriptionPlan[]>([]);
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);
  const [showYonna, setShowYonna] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [planList, mine] = await Promise.all([
        providerSubscriptionApi.getPlans(vertical),
        providerSubscriptionApi.getMine(vertical),
      ]);
      setPlans(planList);
      setSnapshot(mine);
      if (!selectedPlanId && planList[0]) setSelectedPlanId(planList[0].id);
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Could not load subscription plans.');
    } finally {
      setLoading(false);
    }
  }, [vertical]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const payWithGateway = async (gatewayId: string, paymentIntentId?: string) => {
    if (!selectedPlan) return;
    const result = await providerSubscriptionApi.pay(selectedPlan.id, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl || result?.data?.data?.waveLaunchUrl;
    if (launchUrl) {
      await Linking.openURL(launchUrl);
      return;
    }
    setShowPaymentSelector(false);
    Alert.alert('Success', 'Subscription payment processed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    load();
  };

  const openPay = async () => {
    if (!selectedPlan) {
      Alert.alert('Select a plan', 'Choose a billing period first.');
      return;
    }
    const methods = await ensureSavedPaymentMethods(navigation);
    if (!methods) return;
    setPaymentMethods(methods);
    setSelectedPaymentMethodId(methods.find((m: any) => m.isDefault)?.id || methods[0]?.id || null);
    setShowPaymentSelector(true);
  };

  const handlePaymentMethodSelect = async (method: any) => {
    const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');
    const isTest =
      method.id === 'test-payment' || method.metadata?.simulated === true || providerName.includes('test payment');

    if (isTest) {
      try {
        setPaying(true);
        await payWithGateway('test-payment');
      } catch (error: any) {
        Alert.alert('Payment Failed', error?.response?.data?.message || 'Could not process test payment.');
      } finally {
        setPaying(false);
      }
      return;
    }

    if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
      setShowPaymentSelector(false);
      setShowStripe(true);
      return;
    }

    if (isYonna) {
      setShowPaymentSelector(false);
      setShowYonna(true);
      return;
    }

    try {
      setPaying(true);
      await payWithGateway(isWave ? 'wave-gambia' : resolveGatewayPaymentMethodId(method));
    } catch (error: any) {
      Alert.alert('Payment Failed', error?.response?.data?.message || 'Payment could not be processed.');
    } finally {
      setPaying(false);
    }
  };

  const sub = snapshot?.subscription;
  const title = vertical === 'HOME_SERVICES' ? 'Provider subscription' : 'Agent subscription';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0EA5E9" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {sub && (
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Current status</Text>
              <Text style={styles.statusValue}>{sub.status.replace('_', ' ')}</Text>
              {sub.status === 'GRACE' && (
                <Text style={styles.statusHint}>
                  Pay by {new Date(sub.gracePeriodEndsAt).toLocaleDateString()} to stay listed.
                </Text>
              )}
              {sub.currentPeriodEnd && sub.status === 'ACTIVE' && (
                <Text style={styles.statusHint}>
                  Current period ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
                </Text>
              )}
              {sub.status === 'SUSPENDED' && (
                <Text style={styles.statusHint}>Pay a plan to restore your listing.</Text>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Choose a plan</Text>
          {plans.length === 0 && (
            <Text style={styles.empty}>No subscription plans are configured yet. Check back after admin setup.</Text>
          )}
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planCard, selectedPlanId === plan.id && styles.planCardSelected]}
              onPress={() => setSelectedPlanId(plan.id)}
            >
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <Text style={styles.planInterval}>{INTERVAL_LABELS[plan.interval] || plan.interval}</Text>
              </View>
              <Text style={styles.planAmount}>
                {plan.currency} {Number(plan.amount).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[styles.payButton, (!selectedPlan || paying) && styles.payDisabled]}
            disabled={!selectedPlan || paying}
            onPress={openPay}
          >
            {paying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.payText}>Pay subscription</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      <Modal visible={showPaymentSelector} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowPaymentSelector(false)}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment method</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[styles.methodRow, selectedPaymentMethodId === method.id && styles.planCardSelected]}
                onPress={() => setSelectedPaymentMethodId(method.id)}
              >
                <PaymentMethodIcon method={method} size={28} color="#0EA5E9" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.planName}>{method.provider || method.metadata?.providerName}</Text>
                  <Text style={styles.planInterval}>{method.type}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.payButton, { margin: 16 }]}
            disabled={!selectedPaymentMethodId || paying}
            onPress={async () => {
              const method = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
              if (method) await handlePaymentMethodSelect(method);
            }}
          >
            <Text style={styles.payText}>{paying ? 'Please wait…' : 'Process payment'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {selectedPlan && user?.id && (
        <StripePayment
          visible={showStripe}
          onClose={() => setShowStripe(false)}
          amount={Number(selectedPlan.amount)}
          currency={selectedPlan.currency}
          orderId={selectedPlan.id}
          customerId={user.id}
          onPaymentSuccess={async (paymentIntentId) => {
            try {
              setPaying(true);
              await payWithGateway('stripe', paymentIntentId);
              setShowStripe(false);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Payment recorded but activation failed.');
            } finally {
              setPaying(false);
            }
          }}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          transactionType="rental"
        />
      )}

      {selectedPlan && (
        <YonnaPaymentModal
          visible={showYonna}
          amount={Number(selectedPlan.amount)}
          currency={selectedPlan.currency}
          orderId={selectedPlan.id}
          onPaymentSuccess={async () => {
            try {
              setPaying(true);
              await payWithGateway('yonna-forex');
              setShowYonna(false);
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Payment could not be completed.');
            } finally {
              setPaying(false);
            }
          }}
          onPaymentError={(msg) => Alert.alert('Payment Failed', msg)}
          onClose={() => setShowYonna(false)}
          transactionType="rental"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  back: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#111827' },
  content: { padding: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusLabel: { fontSize: 12, color: '#64748B' },
  statusValue: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 4, textTransform: 'capitalize' },
  statusHint: { fontSize: 13, color: '#475569', marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  empty: { fontSize: 14, color: '#6B7280', marginBottom: 16 },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  planCardSelected: { borderColor: '#0EA5E9', backgroundColor: '#F0F9FF' },
  planName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  planInterval: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  planAmount: { fontSize: 16, fontWeight: '700', color: '#0EA5E9' },
  payButton: {
    marginTop: 16,
    backgroundColor: '#0EA5E9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  payDisabled: { opacity: 0.5 },
  payText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
});
