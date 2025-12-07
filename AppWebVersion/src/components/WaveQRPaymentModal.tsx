import React, { useEffect, useMemo, useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { waveGambiaPaymentService } from '../api/waveGambiaPayment';
import { orderService } from '../api/orders';

interface WaveQRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  sessionId: string;
  paymentUrl: string;
  amount: number;
  currency: string;
  onCompleted: (info: { sessionId: string; transactionId?: string }) => void;
  onFailed?: (message: string) => void;
}

type PollStatus = 'idle' | 'polling' | 'completed' | 'failed';

export function WaveQRPaymentModal({
  isOpen,
  onClose,
  orderId,
  sessionId,
  paymentUrl,
  amount,
  currency,
  onCompleted,
  onFailed
}: WaveQRPaymentModalProps) {
  const [pollStatus, setPollStatus] = useState<PollStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPollStatus('polling');
    setError(null);

    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        // 1) Check provider session status
        const res = await waveGambiaPaymentService.getSession(sessionId);
        const data = res?.data || res;
        // wave responses can have payment_status / checkout_status
        const paymentStatus = (data?.payment_status || data?.status || '').toString().toUpperCase();
        const checkoutStatus = (data?.checkout_status || data?.checkoutStatus || '').toString().toUpperCase();
        const txId = data?.transaction_id || data?.transactionId;

        if (paymentStatus === 'PAID' || checkoutStatus === 'COMPLETED') {
          if (!isCancelled) {
            setPollStatus('completed');
            clearInterval(interval);
            onCompleted({ sessionId, transactionId: txId });
          }
          return;
        } else if (paymentStatus === 'FAILED' || checkoutStatus === 'CANCELLED') {
          if (!isCancelled) {
            setPollStatus('failed');
            clearInterval(interval);
            const message = (res as any)?.message || 'Payment failed';
            setError(message);
            onFailed && onFailed(message);
          }
          return;
        }

        // 2) Additionally, check our DB order status if orderId was provided
        if (orderId) {
          try {
            const order = await orderService.getOrderById(orderId);
            const dbStatus = (order?.paymentStatus || order?.status || '').toString().toUpperCase();
            const isPaid = dbStatus === 'PAID' || !!order?.paidAt;
            if (isPaid && !isCancelled) {
              setPollStatus('completed');
              clearInterval(interval);
              onCompleted({ sessionId, transactionId: txId });
              return;
            }
          } catch (e) {
            // swallow db check error; continue polling
          }
        }
      } catch (e: any) {
        if (!error) setError(e?.message || 'Unable to check payment status');
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, sessionId, orderId]);

  const qrSrc = useMemo(() => {
    // Use public QR generator service for the launch URL
    try {
      const encoded = encodeURIComponent(paymentUrl || '');
      return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encoded}`;
    } catch {
      return '';
    }
  }, [paymentUrl]);

  const formatAmount = (value: number, curr: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr.toUpperCase() }).format(value);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan to Pay with Wave</h3>
              <p className="text-sm text-gray-500">Amount: {formatAmount(amount, currency)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {qrSrc ? (
              <div className="flex flex-col items-center">
                <img src={qrSrc} alt="Wave payment QR" className="w-64 h-64 mb-4 border rounded-lg bg-white" />
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Open payment link
                  </a>
                )}
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Scan this QR with your Wave app to complete the payment.
                </p>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-700 mb-2">Preparing QR code...</p>
              </div>
            )}

            <div className="mt-6 text-center">
              {pollStatus === 'polling' && (
                <div className="inline-flex items-center space-x-2 text-blue-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Waiting for payment confirmation...</span>
                </div>
              )}
              {pollStatus === 'completed' && (
                <div className="inline-flex items-center space-x-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Payment completed</span>
                </div>
              )}
              {pollStatus === 'failed' && (
                <div className="inline-flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error || 'Payment failed'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WaveQRPaymentModal;


