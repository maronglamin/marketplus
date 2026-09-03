import {
  Prisma,
  PrismaClient,
  ProviderSubscriptionStatus,
  SubscriptionInterval,
  SubscriptionVertical,
} from '@prisma/client';
import { notificationService } from './notificationService';

const prisma = new PrismaClient();

type Db = PrismaClient | Prisma.TransactionClient;

export const OPERATING_STATUSES: ProviderSubscriptionStatus[] = ['GRACE', 'ACTIVE', 'PAST_DUE'];

export class SubscriptionBlockedError extends Error {
  status = 403;
  code = 'SUBSCRIPTION_REQUIRED';
  subscription: any;

  constructor(message: string, subscription: any = null) {
    super(message);
    this.name = 'SubscriptionBlockedError';
    this.subscription = subscription;
  }
}

export function sendSubscriptionBlocked(res: any, error: unknown) {
  if (error instanceof SubscriptionBlockedError) {
    return res.status(403).json({
      success: false,
      message: error.message,
      code: error.code,
      data: { subscription: error.subscription },
    });
  }
  throw error;
}

export async function ensureSubscriptionSettings(db: Db, vertical: SubscriptionVertical) {
  return db.providerSubscriptionSettings.upsert({
    where: { vertical },
    create: { vertical, isRequired: true, gracePeriodDays: 7 },
    update: {},
  });
}

export function addInterval(from: Date, interval: SubscriptionInterval): Date {
  const next = new Date(from);
  const months =
    interval === 'MONTHLY' ? 1 : interval === 'QUARTERLY' ? 3 : interval === 'SEMI_ANNUAL' ? 6 : 12;
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function publicProviderWhere(vertical: SubscriptionVertical) {
  const settings = await ensureSubscriptionSettings(prisma, vertical);
  const base: any = { isActive: true };
  if (!settings.isRequired) return base;
  return {
    ...base,
    subscription: { is: { status: { in: OPERATING_STATUSES } } },
  };
}

export async function publicListingAgentWhere() {
  const settings = await ensureSubscriptionSettings(prisma, 'REAL_ESTATE');
  const agentWhere: any = { isActive: true };
  if (settings.isRequired) {
    agentWhere.subscription = { is: { status: { in: OPERATING_STATUSES } } };
  }
  return agentWhere;
}

export async function ensureGraceSubscription(
  userId: string,
  vertical: SubscriptionVertical,
  ids: { serviceProviderId?: string | null; propertyAgentId?: string | null } = {},
) {
  const settings = await ensureSubscriptionSettings(prisma, vertical);
  const existing = await prisma.providerSubscription.findUnique({
    where: { userId_vertical: { userId, vertical } },
    include: { plan: true, payments: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  if (existing) {
    const patch: any = {};
    if (ids.serviceProviderId && !existing.serviceProviderId) patch.serviceProviderId = ids.serviceProviderId;
    if (ids.propertyAgentId && !existing.propertyAgentId) patch.propertyAgentId = ids.propertyAgentId;
    if (Object.keys(patch).length) {
      return prisma.providerSubscription.update({
        where: { id: existing.id },
        data: patch,
        include: { plan: true, payments: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 5 } },
      });
    }
    return existing;
  }

  const gracePeriodEndsAt = new Date(Date.now() + settings.gracePeriodDays * 24 * 60 * 60 * 1000);
  return prisma.providerSubscription.create({
    data: {
      userId,
      vertical,
      serviceProviderId: ids.serviceProviderId || null,
      propertyAgentId: ids.propertyAgentId || null,
      status: 'GRACE',
      gracePeriodEndsAt,
    },
    include: { plan: true, payments: true },
  });
}

export async function applySubscriptionExpiry(subscriptionId: string) {
  const subscription = await prisma.providerSubscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!subscription) return null;

  const settings = await ensureSubscriptionSettings(prisma, subscription.vertical);
  const now = new Date();
  let nextStatus = subscription.status;
  let gracePeriodEndsAt = subscription.gracePeriodEndsAt;
  let suspendedAt = subscription.suspendedAt;
  let notified: 'past_due' | 'suspended' | null = null;

  if (subscription.status === 'GRACE' && now > subscription.gracePeriodEndsAt && !subscription.lastPaidAt) {
    nextStatus = 'SUSPENDED';
    suspendedAt = now;
    notified = 'suspended';
  } else if (subscription.status === 'ACTIVE' && subscription.currentPeriodEnd && now > subscription.currentPeriodEnd) {
    nextStatus = 'PAST_DUE';
    gracePeriodEndsAt = new Date(now.getTime() + settings.gracePeriodDays * 24 * 60 * 60 * 1000);
    notified = 'past_due';
  } else if (subscription.status === 'PAST_DUE' && now > subscription.gracePeriodEndsAt) {
    nextStatus = 'SUSPENDED';
    suspendedAt = now;
    notified = 'suspended';
  }

  if (nextStatus === subscription.status) return subscription;

  const updated = await prisma.providerSubscription.update({
    where: { id: subscription.id },
    data: { status: nextStatus, gracePeriodEndsAt, suspendedAt },
    include: { plan: true },
  });

  if (notified === 'past_due') {
    void notificationService.sendNotificationToUser(subscription.userId, {
      title: 'Subscription due',
      body: 'Your listing period has ended. Renew now to stay visible to customers.',
      data: { type: 'provider_subscription', vertical: subscription.vertical, status: updated.status },
    });
  } else if (notified === 'suspended') {
    void notificationService.sendNotificationToUser(subscription.userId, {
      title: 'Service suspended',
      body: 'Your subscription was not paid. Pay to restore your listing.',
      data: { type: 'provider_subscription', vertical: subscription.vertical, status: updated.status },
    });
  }

  return updated;
}

export async function getSubscriptionSnapshot(userId: string, vertical: SubscriptionVertical) {
  const settings = await ensureSubscriptionSettings(prisma, vertical);
  const provider =
    vertical === 'HOME_SERVICES'
      ? await prisma.serviceProvider.findUnique({ where: { userId } })
      : await prisma.propertyAgent.findUnique({ where: { userId } });

  if (!provider) return { settings, subscription: null, canOperate: false, isApproved: false };

  let subscription = await ensureGraceSubscription(
    userId,
    vertical,
    vertical === 'HOME_SERVICES'
      ? { serviceProviderId: provider.id }
      : { propertyAgentId: provider.id },
  );
  await applySubscriptionExpiry(subscription.id);
  const refreshed = await prisma.providerSubscription.findUnique({
    where: { id: subscription.id },
    include: { plan: true, payments: { where: { status: 'SUCCESS' }, orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  if (refreshed) subscription = refreshed;
  const canOperate = !settings.isRequired || OPERATING_STATUSES.includes(subscription.status);

  return { settings, subscription, canOperate, isApproved: true };
}

export async function assertCanOperate(userId: string, vertical: SubscriptionVertical) {
  const snapshot = await getSubscriptionSnapshot(userId, vertical);
  if (!snapshot.isApproved) {
    throw new SubscriptionBlockedError(
      vertical === 'HOME_SERVICES' ? 'Must be an approved service provider' : 'Must be an approved property agent',
    );
  }
  if (!snapshot.canOperate) {
    throw new SubscriptionBlockedError(
      'Your subscription is unpaid. Pay to restore your listing and accept new work.',
      snapshot.subscription,
    );
  }
  return snapshot;
}

export async function assertProviderVisible(providerUserId: string, vertical: SubscriptionVertical) {
  const snapshot = await getSubscriptionSnapshot(providerUserId, vertical);
  if (!snapshot.settings.isRequired) return snapshot;
  if (!snapshot.canOperate) {
    throw new SubscriptionBlockedError('This provider is temporarily unavailable.', snapshot.subscription);
  }
  return snapshot;
}

export async function activateFromPayment(paymentId: string) {
  const payment = await prisma.providerSubscriptionPayment.findUnique({
    where: { id: paymentId },
    include: { plan: true, subscription: true },
  });
  if (!payment) return null;
  if (payment.status === 'SUCCESS') return payment;

  const now = new Date();
  const periodStart =
    payment.subscription.currentPeriodEnd && payment.subscription.currentPeriodEnd > now
      ? payment.subscription.currentPeriodEnd
      : now;
  const periodEnd = addInterval(periodStart, payment.plan.interval);

  const [updatedPayment] = await prisma.$transaction([
    prisma.providerSubscriptionPayment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        processedAt: now,
        periodStart,
        periodEnd,
      },
    }),
    prisma.providerSubscription.update({
      where: { id: payment.subscriptionId },
      data: {
        planId: payment.planId,
        status: 'ACTIVE',
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        lastPaidAt: now,
        suspendedAt: null,
      },
    }),
  ]);

  void notificationService.sendNotificationToUser(payment.subscription.userId, {
    title: 'Subscription active',
    body: `Your ${payment.plan.name} plan is active until ${periodEnd.toLocaleDateString()}.`,
    data: { type: 'provider_subscription', vertical: payment.subscription.vertical, status: 'ACTIVE' },
  });

  return updatedPayment;
}

export async function expireDueSubscriptions() {
  const now = new Date();
  const due = await prisma.providerSubscription.findMany({
    where: {
      OR: [
        { status: 'GRACE', gracePeriodEndsAt: { lt: now }, lastPaidAt: null },
        { status: 'ACTIVE', currentPeriodEnd: { lt: now } },
        { status: 'PAST_DUE', gracePeriodEndsAt: { lt: now } },
      ],
    },
    select: { id: true },
  });
  for (const row of due) {
    await applySubscriptionExpiry(row.id);
  }
  return due.length;
}

export async function backfillGraceSubscriptions() {
  const [providers, agents] = await Promise.all([
    prisma.serviceProvider.findMany({
      where: { subscription: null },
      select: { id: true, userId: true },
    }),
    prisma.propertyAgent.findMany({
      where: { subscription: null },
      select: { id: true, userId: true },
    }),
  ]);

  for (const provider of providers) {
    await ensureGraceSubscription(provider.userId, 'HOME_SERVICES', { serviceProviderId: provider.id });
  }
  for (const agent of agents) {
    await ensureGraceSubscription(agent.userId, 'REAL_ESTATE', { propertyAgentId: agent.id });
  }
  return { providers: providers.length, agents: agents.length };
}
