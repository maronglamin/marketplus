import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/api';
import { navigateToRootScreen } from '../navigation/sectionNavigation';

export const TEST_PAYMENT_METHOD_ID = 'test-payment';

export function isTestPaymentsEnabled(): boolean {
  const flag = (process.env.EXPO_PUBLIC_ALLOW_TEST_PAYMENTS || '').toString().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  // Default: enabled in Expo/React Native development builds
  return typeof __DEV__ !== 'undefined' ? __DEV__ : false;
}

export const DEV_TEST_PAYMENT_METHOD = {
  id: TEST_PAYMENT_METHOD_ID,
  type: 'MOBILE_MONEY',
  provider: 'Test Payment',
  accountName: 'Development only',
  accountId: 'test',
  isDefault: false,
  status: 'ACTIVE',
  metadata: {
    providerName: 'Test Payment',
    simulated: true,
  },
};

export function withDevTestPaymentMethods(methods: any[]): any[] {
  if (!isTestPaymentsEnabled()) return methods;
  const withoutTest = methods.filter((m) => m?.id !== TEST_PAYMENT_METHOD_ID);
  return [DEV_TEST_PAYMENT_METHOD, ...withoutTest];
}

export function filterSavedPaymentMethods(all: unknown[]): any[] {
  return (all as any[]).filter((method) => method?.type !== 'CASH' && method?.isActive !== false);
}

export function resolveGatewayPaymentMethodId(method: any): string {
  if (method?.id === TEST_PAYMENT_METHOD_ID || method?.metadata?.simulated) {
    return TEST_PAYMENT_METHOD_ID;
  }
  const provider = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
  if (provider.includes('test payment') || provider === 'test') return TEST_PAYMENT_METHOD_ID;
  if (provider.includes('yonna')) return 'yonna-forex';
  if (provider.includes('wave')) return 'wave-gambia';
  if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') return 'stripe';
  return method.id;
}

export function getDefaultPaymentMethodId(methods: any[]): string | null {
  if (methods.length === 0) return null;
  const nonTest = methods.filter((method) => method.id !== TEST_PAYMENT_METHOD_ID);
  const pool = nonTest.length > 0 ? nonTest : methods;
  return pool.find((method) => method.isDefault)?.id ?? pool[0].id;
}

export async function loadSavedPaymentMethods(): Promise<any[]> {
  const response = await api.get('/api/payment-methods');
  return withDevTestPaymentMethods(filterSavedPaymentMethods(response.data?.data ?? []));
}

export async function ensureSavedPaymentMethods(
  navigation: NativeStackNavigationProp<any>,
): Promise<any[] | null> {
  try {
    const methods = await loadSavedPaymentMethods();
    if (methods.length > 0) {
      return methods;
    }

    Alert.alert(
      'No Payment Methods',
      'You need to add a payment method before you can pay. Add one in Account Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Payment Method', onPress: () => navigateToRootScreen(navigation, 'PaymentMethods') },
      ],
    );
    return null;
  } catch {
    Alert.alert('Error', 'Failed to load payment methods. Please try again.');
    return null;
  }
}
