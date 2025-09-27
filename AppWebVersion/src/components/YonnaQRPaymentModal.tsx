import React, { useEffect, useState } from 'react';
import { X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { yonnaForexPaymentService } from '../api/yonnaForexPayment';

interface YonnaQRPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string; // Yonna/gateway transaction id used for polling
  appTransactionId?: string; // internal tracking
  amount: number;
  currency: string;
  paymentUrl?: string;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  paymentHtml?: string; // full HTML content to render
  onCompleted: (info: { transactionId: string; appTransactionId?: string }) => void;
  onFailed?: (message: string) => void;
}

type PollStatus = 'idle' | 'polling' | 'completed' | 'failed';

export function YonnaQRPaymentModal({
  isOpen,
  onClose,
  transactionId,
  appTransactionId,
  amount,
  currency,
  paymentUrl,
  qrCodeUrl,
  qrCodeBase64,
  paymentHtml,
  onCompleted,
  onFailed
}: YonnaQRPaymentModalProps) {
  const [pollStatus, setPollStatus] = useState<PollStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setPollStatus('polling');
    setError(null);

    let isCancelled = false;
    const interval = setInterval(async () => {
      try {
        const res = await yonnaForexPaymentService.getTransactionStatus(transactionId);
        const status = res?.data?.status || res?.data || (res as any)?.status; // be liberal in reading

        if (status && typeof status === 'string') {
          const normalized = status.toLowerCase();
          if (normalized === 'success' || normalized === 'completed' || normalized === 'paid') {
            if (!isCancelled) {
              setPollStatus('completed');
              clearInterval(interval);
              onCompleted({ transactionId, appTransactionId });
            }
          } else if (normalized === 'failed' || normalized === 'cancelled') {
            if (!isCancelled) {
              setPollStatus('failed');
              clearInterval(interval);
              const message = (res as any)?.message || 'Payment failed';
              setError(message);
              onFailed && onFailed(message);
            }
          }
        }
      } catch (e: any) {
        // keep polling, but surface error once
        if (!error) setError(e?.message || 'Unable to check payment status');
      }
    }, 3000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [isOpen, transactionId]);

  const formatAmount = (value: number, curr: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: curr.toUpperCase() }).format(value);

  if (!isOpen) return null;

  const qrSrc = qrCodeUrl || (qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : undefined);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan to Pay with Yonna</h3>
              <p className="text-sm text-gray-500">Amount: {formatAmount(amount, currency)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {paymentHtml ? (
              <div className="w-full h-[520px]">
                <iframe
                  title="Yonna QR"
                  className="w-full h-[520px] border rounded-lg"
                  srcDoc={paymentHtml}
                />
              </div>
            ) : qrSrc ? (
              <div className="flex flex-col items-center">
                <img src={qrSrc} alt="Yonna payment QR" className="w-56 h-56 mb-4 border rounded-lg" />
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
                <p className="text-xs text-gray-500 mt-2">Scan this QR with your Yonna app to complete payment.</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-gray-700 mb-3">Awaiting QR code...</p>
                {paymentUrl && (
                  <a
                    href={paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Open payment link
                  </a>
                )}
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

export default YonnaQRPaymentModal;


