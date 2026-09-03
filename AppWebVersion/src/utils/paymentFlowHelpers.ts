import { paymentMethodService, PaymentMethod } from '../api/paymentMethods';

export const TEST_PAYMENT_METHOD_ID = 'test-payment';

export function isTestPaymentsEnabled(): boolean {
  const flag = (process.env.REACT_APP_ALLOW_TEST_PAYMENTS || '').toString().toLowerCase();
  if (flag === 'true' || flag === '1') return true;
  if (flag === 'false' || flag === '0') return false;
  return process.env.NODE_ENV === 'development';
}

export const DEV_TEST_PAYMENT_METHOD: PaymentMethod = {
  id: TEST_PAYMENT_METHOD_ID,
  userId: 'dev',
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function withDevTestPaymentMethods(methods: PaymentMethod[]): PaymentMethod[] {
  if (!isTestPaymentsEnabled()) return methods;
  const withoutTest = methods.filter((m) => m.id !== TEST_PAYMENT_METHOD_ID);
  return [DEV_TEST_PAYMENT_METHOD, ...withoutTest];
}

export function filterSavedPaymentMethods(all: PaymentMethod[]): PaymentMethod[] {
  return all.filter((method) => method.type !== 'CASH' && method.status !== 'INACTIVE');
}

export function resolveGatewayPaymentMethodId(method: PaymentMethod): string {
  if (method.id === TEST_PAYMENT_METHOD_ID || method.metadata?.simulated) {
    return TEST_PAYMENT_METHOD_ID;
  }
  const provider = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
  if (provider.includes('test payment') || provider === 'test') return TEST_PAYMENT_METHOD_ID;
  if (provider.includes('yonna')) return 'yonna-forex';
  if (provider.includes('wave')) return 'wave-gambia';
  if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') return 'stripe';
  return method.id;
}

export function getDefaultPaymentMethodId(methods: PaymentMethod[]): string | null {
  if (methods.length === 0) return null;
  const nonTest = methods.filter((method) => method.id !== TEST_PAYMENT_METHOD_ID);
  const pool = nonTest.length > 0 ? nonTest : methods;
  return pool.find((method) => method.isDefault)?.id ?? pool[0].id;
}

export async function loadSavedPaymentMethods(): Promise<PaymentMethod[]> {
  const response = await paymentMethodService.getPaymentMethods();
  return withDevTestPaymentMethods(filterSavedPaymentMethods(response.paymentMethods ?? []));
}
