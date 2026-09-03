import { api } from './api';

export type SubscriptionVertical = 'HOME_SERVICES' | 'REAL_ESTATE';

export interface ProviderSubscriptionPlan {
  id: string;
  vertical: SubscriptionVertical;
  name: string;
  interval: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'YEARLY';
  amount: number;
  currency: string;
  isActive: boolean;
}

export interface ProviderSubscription {
  id: string;
  status: 'GRACE' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED';
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  gracePeriodEndsAt: string;
  lastPaidAt?: string | null;
  plan?: ProviderSubscriptionPlan | null;
}

export interface SubscriptionSnapshot {
  settings: { isRequired: boolean; gracePeriodDays: number };
  subscription: ProviderSubscription | null;
  canOperate: boolean;
  isApproved: boolean;
}

export const providerSubscriptionApi = {
  getPlans: async (vertical: SubscriptionVertical): Promise<ProviderSubscriptionPlan[]> => {
    const res = await api.get('/api/provider-subscriptions/plans', { params: { vertical } });
    return res.data?.data ?? [];
  },
  getMine: async (vertical: SubscriptionVertical): Promise<SubscriptionSnapshot> => {
    const res = await api.get('/api/provider-subscriptions/me', { params: { vertical } });
    return res.data?.data;
  },
  pay: async (planId: string, paymentMethodId: string, paymentIntentId?: string) => {
    const res = await api.post('/api/provider-subscriptions/pay', {
      planId,
      paymentMethodId,
      paymentIntentId,
    });
    return res.data;
  },
};
