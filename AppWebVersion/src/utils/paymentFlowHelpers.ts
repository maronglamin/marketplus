import { paymentMethodService, PaymentMethod } from '../api/paymentMethods';

export function filterSavedPaymentMethods(all: PaymentMethod[]): PaymentMethod[] {
  return all.filter((method) => method.type !== 'CASH' && method.status !== 'INACTIVE');
}

export function resolveGatewayPaymentMethodId(method: PaymentMethod): string {
  const provider = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
  if (provider.includes('yonna')) return 'yonna-forex';
  if (provider.includes('wave')) return 'wave-gambia';
  if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') return 'stripe';
  return method.id;
}

export function getDefaultPaymentMethodId(methods: PaymentMethod[]): string | null {
  if (methods.length === 0) return null;
  return methods.find((method) => method.isDefault)?.id ?? methods[0].id;
}

export async function loadSavedPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await paymentMethodService.getPaymentMethods();
  return filterSavedPaymentMethods(response.paymentMethods ?? []);
}
