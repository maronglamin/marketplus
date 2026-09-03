import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import StripePaymentModal from '../../components/StripePaymentModal';
import { useAuth } from '../../contexts/AuthContext';
import {
  providerSubscriptionApi,
  type ProviderSubscriptionPlan,
  type SubscriptionSnapshot,
  type SubscriptionVertical,
} from '../../api/providerSubscriptionApi';
import {
  loadSavedPaymentMethods,
  getDefaultPaymentMethodId,
  resolveGatewayPaymentMethodId,
} from '../../utils/paymentFlowHelpers';
import { PaymentMethod } from '../../api/paymentMethods';

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  SEMI_ANNUAL: 'Every 6 months',
  YEARLY: 'Yearly',
};

export function SubscriptionPayPage({
  vertical,
  backTo,
  title,
}: {
  vertical: SubscriptionVertical;
  backTo: string;
  title: string;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<ProviderSubscriptionPlan[]>([]);
  const [snapshot, setSnapshot] = useState<SubscriptionSnapshot | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [showStripe, setShowStripe] = useState(false);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;
  const sub = snapshot?.subscription;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [planList, mine] = await Promise.all([
        providerSubscriptionApi.getPlans(vertical),
        providerSubscriptionApi.getMine(vertical),
      ]);
      setPlans(planList);
      setSnapshot(mine);
      setSelectedPlanId((current) => current || planList[0]?.id || null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not load subscription plans.');
    } finally {
      setLoading(false);
    }
  }, [vertical]);

  useEffect(() => { load(); }, [load]);

  const payWithGateway = async (gatewayId: string, paymentIntentId?: string) => {
    if (!selectedPlan) return;
    const result = await providerSubscriptionApi.pay(selectedPlan.id, gatewayId, paymentIntentId);
    const launchUrl = result?.data?.waveLaunchUrl || result?.waveLaunchUrl;
    if (launchUrl) {
      window.location.href = launchUrl;
      return;
    }
    setShowPaymentSelector(false);
    alert('Subscription payment processed.');
    navigate(backTo);
  };

  const openPay = async () => {
    if (!selectedPlan) {
      alert('Choose a billing period first.');
      return;
    }
    try {
      const methods = await loadSavedPaymentMethods();
      if (!methods.length) {
        alert('Add a payment method in Account Settings first.');
        return;
      }
      setPaymentMethods(methods);
      setSelectedPaymentMethodId(getDefaultPaymentMethodId(methods));
      setShowPaymentSelector(true);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Could not load payment methods.');
    }
  };

  const handlePaymentMethodSelect = async (method: PaymentMethod) => {
    const providerName = (method.provider || method.metadata?.providerName || '').toString().toLowerCase();
    const isYonna = providerName.includes('yonna');
    const isWave = providerName.includes('wave');
    const isTest = method.id === 'test-payment' || method.metadata?.simulated === true;

    if (method.type === 'CREDIT_CARD' || method.type === 'DEBIT_CARD') {
      setShowPaymentSelector(false);
      setShowStripe(true);
      return;
    }

    try {
      setPaying(true);
      const gateway = isTest ? 'test-payment' : isYonna ? 'yonna-forex' : isWave ? 'wave-gambia' : resolveGatewayPaymentMethodId(method);
      await payWithGateway(gateway);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Payment could not be processed.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title={title} backTo={backTo} />
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {sub && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Current status</p>
              <p className="text-lg font-bold capitalize">{sub.status.replace('_', ' ')}</p>
              {sub.status === 'GRACE' && (
                <p className="text-sm text-slate-600 mt-1">
                  Pay by {new Date(sub.gracePeriodEndsAt).toLocaleDateString()} to stay listed.
                </p>
              )}
              {sub.status === 'ACTIVE' && sub.currentPeriodEnd && (
                <p className="text-sm text-slate-600 mt-1">
                  Current period ends {new Date(sub.currentPeriodEnd).toLocaleDateString()}.
                </p>
              )}
              {sub.status === 'SUSPENDED' && (
                <p className="text-sm text-slate-600 mt-1">Pay a plan to restore your listing.</p>
              )}
            </div>
          )}

          <h2 className="font-semibold text-gray-900">Choose a plan</h2>
          {plans.length === 0 && (
            <p className="text-sm text-gray-500">No subscription plans are configured yet.</p>
          )}
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`w-full flex items-center justify-between p-4 rounded-xl border ${
                selectedPlanId === plan.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
              }`}
            >
              <div className="text-left">
                <p className="font-semibold">{plan.name}</p>
                <p className="text-sm text-gray-500">{INTERVAL_LABELS[plan.interval] || plan.interval}</p>
              </div>
              <p className="font-bold text-sky-600">
                {plan.currency} {Number(plan.amount).toLocaleString()}
              </p>
            </button>
          ))}

          <button
            type="button"
            disabled={!selectedPlan || paying}
            onClick={openPay}
            className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold disabled:opacity-50"
          >
            {paying ? 'Please wait…' : 'Pay subscription'}
          </button>
        </div>
      )}

      {showPaymentSelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentSelector(false)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
              <button type="button" onClick={() => setShowPaymentSelector(false)} className="text-gray-500">✕</button>
            </div>
            <div className="p-4 space-y-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedPaymentMethodId(method.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left ${
                    selectedPaymentMethodId === method.id ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{method.accountName || method.provider}</p>
                    <p className="text-xs text-gray-500">{method.type.replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t">
              <button
                type="button"
                disabled={!selectedPaymentMethodId || paying}
                onClick={async () => {
                  const method = paymentMethods.find((m) => m.id === selectedPaymentMethodId);
                  if (method) await handlePaymentMethodSelect(method);
                }}
                className="w-full py-3 rounded-xl bg-sky-500 text-white font-semibold disabled:opacity-50"
              >
                Process payment
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPlan && user && (
        <StripePaymentModal
          isOpen={showStripe}
          onClose={() => setShowStripe(false)}
          amount={Number(selectedPlan.amount)}
          currency={selectedPlan.currency}
          orderId={selectedPlan.id}
          onPaymentSuccess={async (paymentData: any) => {
            try {
              setPaying(true);
              await payWithGateway('stripe', paymentData?.id || paymentData?.paymentIntentId);
              setShowStripe(false);
            } catch (err: any) {
              alert(err?.response?.data?.message || 'Payment recorded but activation failed.');
            } finally {
              setPaying(false);
            }
          }}
        />
      )}
    </div>
  );
}

export function HomeServiceSubscriptionPay() {
  return (
    <SubscriptionPayPage
      vertical="HOME_SERVICES"
      backTo="/home-services/dashboard"
      title="Provider subscription"
    />
  );
}

export function RealEstateSubscriptionPay() {
  return (
    <SubscriptionPayPage
      vertical="REAL_ESTATE"
      backTo="/real-estate/manage-listings"
      title="Agent subscription"
    />
  );
}
