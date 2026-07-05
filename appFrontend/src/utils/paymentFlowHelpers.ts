import { Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/api';
import { navigateToRootScreen } from '../navigation/sectionNavigation';

export function filterSavedPaymentMethods(all: unknown[]): any[] {
  return (all as any[]).filter((method) => method?.type !== 'CASH' && method?.isActive !== false);
}

export function resolveGatewayPaymentMethodId(method: any): string {
  const provider = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
  if (provider.includes('yonna')) return 'yonna-forex';
  if (provider.includes('wave')) return 'wave-gambia';
  if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') return 'stripe';
  return method.id;
}

export function getDefaultPaymentMethodId(methods: any[]): string | null {
  if (methods.length === 0) return null;
  return methods.find((method) => method.isDefault)?.id ?? methods[0].id;
}

export async function loadSavedPaymentMethods(): Promise<any[]> {
  const response = await api.get('/api/payment-methods');
  return filterSavedPaymentMethods(response.data?.data ?? []);
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
