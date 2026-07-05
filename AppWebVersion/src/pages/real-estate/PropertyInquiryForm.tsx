import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { PageHeader } from '../../components/PageHeader';
import { realEstateApi, type PropertyListing } from '../../api/realEstateApi';

export function PropertyInquiryForm() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!listingId) return;
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please enter your inquiry message.');
      return;
    }
    if (!listingId) return;
    try {
      setSubmitting(true);
      setError('');
      await realEstateApi.createInquiry({
        listingId,
        message: message.trim(),
        preferredDate: preferredDate ? new Date(preferredDate).toISOString() : undefined,
      });
      alert('Inquiry sent. The agent will contact you soon.');
      navigate('/real-estate/my-reservations');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Send Inquiry" subtitle={listing?.title} backTo={`/real-estate/listings/${listingId}`} />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I'm interested in this property..."
            rows={5}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Visit Date (optional)</label>
          <input
            type="date"
            value={preferredDate}
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm"
          />
        </div>

        <button type="submit" disabled={submitting} className="w-full py-4 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60">
          {submitting ? 'Sending...' : 'Submit Inquiry'}
        </button>
      </form>
    </div>
  );
}
