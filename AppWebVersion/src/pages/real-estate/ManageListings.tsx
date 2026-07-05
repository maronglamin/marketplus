import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Building2, Calendar, Home } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { getImageUrl } from '../../config/api';
import { realEstateApi, type PropertyBooking, type PropertyInquiry, type PropertyListing } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';

type Tab = 'overview' | 'listings' | 'bookings';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-700 bg-green-50',
  PENDING_REVIEW: 'text-amber-700 bg-amber-50',
  PENDING_SETUP: 'text-amber-700 bg-amber-50',
  INACTIVE: 'text-gray-600 bg-gray-100',
  SOLD: 'text-blue-700 bg-blue-50',
  RENTED: 'text-violet-700 bg-violet-50',
};

export function ManageListings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [bookings, setBookings] = useState<PropertyBooking[]>([]);
  const [inquiries, setInquiries] = useState<PropertyInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [agentName, setAgentName] = useState('');

  const checkAgentStatus = useCallback(async () => {
    try {
      const data = await realEstateApi.getMyApplication();
      const approved = !!data?.agent || data?.application?.status === 'APPROVED';
      setIsApprovedAgent(approved);
      setApplicationStatus(data?.application?.status ?? null);
      setAgentName(data?.agent?.displayName || data?.application?.firstName || '');
      return approved;
    } catch {
      setIsApprovedAgent(false);
      return false;
    }
  }, []);

  const loadListings = useCallback(async () => {
    const approved = await checkAgentStatus();
    if (!approved) {
      setListings([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await realEstateApi.getMyListings();
      setListings(data);
      try {
        const inbox = await realEstateApi.getAgentInbox();
        setBookings(inbox.bookings ?? []);
        setInquiries(inbox.inquiries ?? []);
      } catch {
        setBookings([]);
        setInquiries([]);
      }
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [checkAgentStatus]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useApprovalRedirect({
    enabled: applicationStatus === 'PENDING' && !isApprovedAgent,
    checkApproval: async () => {
      const data = await realEstateApi.getMyApplication();
      if (data?.agent || data?.application?.status === 'APPROVED') {
        setIsApprovedAgent(true);
        setApplicationStatus('APPROVED');
        setAgentName(data.agent?.displayName || '');
        await loadListings();
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => loadListings(),
  });

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter((l) => l.status === 'ACTIVE').length,
    pending: listings.filter((l) => l.status === 'PENDING_REVIEW' || l.status === 'PENDING_SETUP').length,
    bookings: bookings.length,
  }), [listings, bookings]);

  const renderListingCard = (item: PropertyListing) => {
    const imageUrl = item.images[0]?.url ? getImageUrl(item.images[0].url) : null;
    const needsSetup = item.status === 'PENDING_SETUP';
    const needsPublish = item.status === 'PENDING_REVIEW';
    const statusLabel = needsSetup ? 'Needs setup' : needsPublish ? 'Ready to publish' : item.status.replace(/_/g, ' ');
    const target = needsSetup || needsPublish
      ? `/real-estate/listings/${item.id}/setup?title=${encodeURIComponent(item.title)}`
      : `/real-estate/listings/${item.id}`;

    const handlePublish = async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await realEstateApi.publishListing(item.id);
        await loadListings();
      } catch (err: any) {
        alert(err?.response?.data?.message || 'Failed to publish listing.');
      }
    };

    return (
      <div key={item.id} className="rounded-xl border border-gray-200 overflow-hidden">
        <Link to={target} className="flex gap-3 p-3 hover:border-violet-300">
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} className="w-20 h-20 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-gray-900 line-clamp-1">{item.title}</p>
            <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[item.status] || 'text-gray-600 bg-gray-100'}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-violet-600 font-medium">{formatPrice(item.price, item.currency)}</p>
          <p className="text-xs text-gray-500">{item.city} · {item.listingType.replace(/_/g, ' ')}</p>
        </div>
        </Link>
        {needsPublish && (
          <button type="button" onClick={handlePublish} className="w-full py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700">
            Publish now
          </button>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isApprovedAgent) {
    return (
      <div className="max-w-4xl mx-auto bg-white min-h-full">
        <PageHeader title="Property Agent" backTo="/real-estate" />
        <div className="text-center py-16 px-6">
          <p className="font-semibold text-gray-700">
            {applicationStatus === 'PENDING' ? 'Application Pending Review' : 'Agent Approval Required'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {applicationStatus === 'PENDING'
              ? 'We are reviewing your application. You will be redirected automatically when approved.'
              : 'Complete your property agent application to start listing properties.'}
          </p>
          <button type="button" onClick={() => navigate('/real-estate/become-agent')} className="mt-4 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg">
            View Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Property Agent Dashboard" backTo="/real-estate" />

      <div className="flex border-b border-gray-100">
        {(['overview', 'listings', 'bookings'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium capitalize ${
              activeTab === tab ? 'text-violet-600 border-b-2 border-violet-500' : 'text-gray-500'
            }`}
          >
            {tab === 'bookings' ? 'Bookings' : tab}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-4">
        <div className="p-5 rounded-xl bg-violet-600 text-white">
          <p className="text-xl font-bold">Welcome back{agentName ? `, ${agentName.split(' ')[0]}` : ''}</p>
          <p className="text-sm text-violet-100 mt-1">Manage listings, rooms, and reservations</p>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Total Listings" value={stats.total} />
              <StatCard label="Active" value={stats.active} />
              <StatCard label="Needs Setup" value={stats.pending} />
              <StatCard label="Reservations" value={stats.bookings} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => navigate('/real-estate/list-property')} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold">
                <Plus className="w-4 h-4" /> List Property
              </button>
              <button type="button" onClick={() => setActiveTab('bookings')} className="flex items-center justify-center gap-2 py-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 text-sm font-semibold">
                <Calendar className="w-4 h-4" /> View Bookings
              </button>
            </div>
            {listings.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">Recent Listings</h3>
                  <button type="button" onClick={() => setActiveTab('listings')} className="text-sm text-violet-600 font-semibold">See all</button>
                </div>
                <div className="space-y-2">{listings.slice(0, 3).map(renderListingCard)}</div>
              </div>
            )}
          </>
        )}

        {activeTab === 'listings' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Your Listings</h3>
              <Link to="/real-estate/list-property" className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg">
                <Plus className="w-5 h-5" />
              </Link>
            </div>
            {listings.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Home className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="font-semibold text-gray-700">No listings yet</p>
                <p className="text-sm text-gray-500 mt-1">For hotels, add room types from your dashboard after creating the listing.</p>
                <button type="button" onClick={() => navigate('/real-estate/list-property')} className="mt-4 px-4 py-2 bg-violet-600 text-white text-sm rounded-lg">
                  List Property
                </button>
              </div>
            ) : (
              <div className="space-y-2">{listings.map(renderListingCard)}</div>
            )}
          </>
        )}

        {activeTab === 'bookings' && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Reservations</h3>
              <span className="text-sm text-gray-500">{bookings.length}</span>
            </div>
            {bookings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No reservations yet</p>
            ) : (
              <div className="space-y-2">
                {bookings.map((b) => (
                  <div key={b.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="font-semibold text-gray-900">{b.listing?.title ?? 'Stay'}</p>
                    <p className="text-sm text-gray-500">{b.bookingRef} · {b.status}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(b.checkIn).toLocaleDateString()} – {new Date(b.checkOut).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-bold text-violet-600 mt-1">{formatPrice(b.totalPrice, b.currency)}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <h3 className="font-semibold text-gray-900">Inquiries</h3>
              <span className="text-sm text-gray-500">{inquiries.length}</span>
            </div>
            {inquiries.length === 0 ? (
              <p className="text-sm text-gray-500">No sales inquiries yet.</p>
            ) : (
              <div className="space-y-2">
                {inquiries.map((inq) => (
                  <div key={inq.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="font-semibold text-gray-900">{inq.listing?.title ?? 'Property'}</p>
                    <p className="text-sm text-gray-500 line-clamp-2">{inq.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{inq.status}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl border border-gray-200 bg-white">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
