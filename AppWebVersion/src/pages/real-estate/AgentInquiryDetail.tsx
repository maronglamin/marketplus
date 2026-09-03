import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { realEstateApi, type PropertyInquiry } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'text-amber-700 bg-amber-50',
  CONTACTED: 'text-sky-700 bg-sky-50',
  OFFERED: 'text-violet-700 bg-violet-50',
  CLOSED: 'text-gray-700 bg-gray-100',
  PURCHASED: 'text-emerald-700 bg-emerald-50',
};

export function AgentInquiryDetail() {
  const { inquiryId } = useParams<{ inquiryId: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<PropertyInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadInquiry = useCallback(async () => {
    if (!inquiryId) return;
    try {
      setLoading(true);
      const data = await realEstateApi.getInquiry(inquiryId);
      setInquiry(data);
    } catch {
      alert('Failed to load inquiry details.');
      navigate('/real-estate/manage-listings');
    } finally {
      setLoading(false);
    }
  }, [inquiryId, navigate]);

  useEffect(() => {
    loadInquiry();
  }, [loadInquiry]);

  const updateStatus = async (status: 'CONTACTED' | 'CLOSED' | 'PENDING' | 'OFFERED') => {
    if (!inquiryId) return;
    const messages: Record<string, string> = {
      CONTACTED: 'Update this inquiry status?',
      CLOSED: 'Close this inquiry?',
      PENDING: 'Reopen this inquiry?',
      OFFERED:
        'Only this customer will be allowed to pay. Any other purchase offer on this listing will be revoked. Continue?',
    };
    if (!window.confirm(messages[status])) return;
    try {
      setSubmitting(true);
      const updated = await realEstateApi.updateInquiryStatus(inquiryId, status);
      setInquiry(updated);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !inquiry) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const customerName = inquiry.customer
    ? `${inquiry.customer.firstName || ''} ${inquiry.customer.lastName || ''}`.trim() || 'Customer'
    : 'Customer';
  const displayStatus =
    inquiry.paymentStatus === 'PAID' || inquiry.status === 'PURCHASED' ? 'PURCHASED' : inquiry.status;
  const statusClass = STATUS_COLORS[displayStatus] || 'text-gray-700 bg-gray-100';
  const salePrice = Number(inquiry.salePrice ?? inquiry.listing?.price ?? 0);
  const currency = inquiry.currency || inquiry.listing?.currency || 'GMD';
  const isPurchased = inquiry.status === 'PURCHASED' || inquiry.paymentStatus === 'PAID';
  const listingSold = inquiry.listing?.status === 'SOLD';

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-full">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-1 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Inquiry</h1>
          <p className="text-sm text-gray-500">{inquiry.listing?.title}</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold ${statusClass}`}>
          {displayStatus}
        </div>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Property</h2>
          <p className="text-sm text-gray-700">{inquiry.listing?.title}</p>
          {inquiry.listing?.city ? <p className="text-sm text-gray-500">{inquiry.listing.city}</p> : null}
          {salePrice > 0 ? (
            <p className="text-sm font-semibold text-violet-700">Sale price: {formatPrice(salePrice, currency)}</p>
          ) : null}
          {inquiry.paymentStatus ? (
            <p className="text-sm text-gray-500">Payment: {inquiry.paymentStatus}</p>
          ) : null}
          {inquiry.listing?.status ? (
            <p className="text-sm text-gray-500">Listing status: {inquiry.listing.status}</p>
          ) : null}
          {inquiry.preferredDate ? (
            <p className="text-sm text-gray-500">
              Preferred: {format(new Date(inquiry.preferredDate), 'EEE, MMM d, yyyy')}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-violet-200 bg-violet-50 p-4">
          <h2 className="font-semibold text-gray-900 mb-2">Message</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{inquiry.message}</p>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
          <h2 className="font-semibold text-gray-900">Customer</h2>
          <p className="text-sm text-gray-700">{customerName}</p>
          {inquiry.customer?.phoneNumber ? (
            <a href={`tel:${inquiry.customer.phoneNumber}`} className="flex items-center gap-2 text-sm text-violet-600">
              <Phone className="w-4 h-4" /> {inquiry.customer.phoneNumber}
            </a>
          ) : null}
          <p className="text-xs text-gray-400">Received {format(new Date(inquiry.createdAt), 'MMM d, yyyy · h:mm a')}</p>
        </section>

        <div className="flex flex-col gap-3 pt-2">
          {!isPurchased && inquiry.status === 'PENDING' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('CONTACTED')}
              className="py-3 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-60"
            >
              Mark as Contacted
            </button>
          )}
          {!isPurchased && inquiry.status !== 'CLOSED' && inquiry.status !== 'OFFERED' && !listingSold && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('OFFERED')}
              className="py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-60"
            >
              Offer Purchase
            </button>
          )}
          {inquiry.status === 'OFFERED' && !isPurchased && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('CONTACTED')}
              className="py-3 rounded-xl bg-sky-600 text-white font-semibold disabled:opacity-60"
            >
              Revoke Purchase Offer
            </button>
          )}
          {!isPurchased && inquiry.status !== 'CLOSED' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('CLOSED')}
              className="py-3 rounded-xl bg-gray-600 text-white font-semibold disabled:opacity-60"
            >
              Close Inquiry
            </button>
          )}
          {!isPurchased && inquiry.status === 'CLOSED' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => updateStatus('PENDING')}
              className="py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-60"
            >
              Reopen
            </button>
          )}
        </div>

        <Link to="/real-estate/manage-listings" className="block text-center text-sm text-violet-600 pt-2">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
