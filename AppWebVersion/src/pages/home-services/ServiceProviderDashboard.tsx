import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { getImageUrl } from '../../config/api';
import { uploadService } from '../../api/upload';
import { homeServicesApi, type ServiceBooking, type ServiceProvider } from '../../api/homeServicesApi';
import { settlementService, type AvailableHomeServiceEarnings } from '../../api/settlementService';
import { formatPrice, formatStatus } from '../../utils/formatPrice';
import { useApprovalRedirect } from '../../hooks/useApprovalRedirect';
import { providerSubscriptionApi, type SubscriptionSnapshot } from '../../api/providerSubscriptionApi';
import { ManageServiceOfferings } from './ManageServiceOfferings';
import { ProviderAvailabilityEditor } from './ProviderAvailabilityEditor';

type Tab = 'overview' | 'services' | 'availability' | 'bookings' | 'profile';

const STATUS_COLORS: Record<string, string> = {
  PENDING_QUOTE: 'text-amber-600 bg-amber-50',
  QUOTED: 'text-sky-600 bg-sky-50',
  ACCEPTED: 'text-emerald-600 bg-emerald-50',
  PAID: 'text-green-700 bg-green-50',
  COMPLETED: 'text-indigo-600 bg-indigo-50',
};

export function ServiceProviderDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [offeringsCount, setOfferingsCount] = useState(0);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [availableEarnings, setAvailableEarnings] = useState<AvailableHomeServiceEarnings[]>([]);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [notApproved, setNotApproved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [serviceDescription, setServiceDescription] = useState('');
  const [bio, setBio] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const appData = await homeServicesApi.getMyApplication();
      setApplicationStatus(appData?.application?.status ?? null);
      if (!appData?.provider) {
        setNotApproved(true);
        setProvider(null);
        setBookings([]);
        setAvailableEarnings([]);
        return;
      }
      setNotApproved(false);
      const p = appData.provider as ServiceProvider;
      setProvider(p);
      setServiceDescription(p.serviceDescription || '');
      setBio(p.bio || '');
      setProfileImageUrl(p.profileImageUrl || null);
      setPortfolioImages(Array.isArray(p.portfolioImages) ? p.portfolioImages : []);
      const data = await homeServicesApi.getProviderDashboard();
      setBookings(data);
      const offerings = await homeServicesApi.getMyOfferings();
      setOfferingsCount(offerings.filter((o) => o.isActive).length);
      try {
        const earnings = await settlementService.getAvailableHomeServiceEarnings();
        setAvailableEarnings(earnings ?? []);
      } catch {
        setAvailableEarnings([]);
      }
      try {
        setSubscription(await providerSubscriptionApi.getMine('HOME_SERVICES'));
      } catch {
        setSubscription(null);
      }
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useApprovalRedirect({
    enabled: applicationStatus === 'PENDING' && notApproved,
    checkApproval: async () => {
      const data = await homeServicesApi.getMyApplication();
      if (data?.provider) {
        setApplicationStatus('APPROVED');
        setNotApproved(false);
        await loadData();
        return { isApproved: true };
      }
      return { isApproved: false };
    },
    onApproved: () => loadData(),
  });

  const stats = useMemo(() => ({
    total: bookings.length,
    pending: bookings.filter((b) => b.status === 'PENDING_QUOTE' || b.status === 'QUOTED').length,
    active: bookings.filter((b) => b.status === 'ACCEPTED' || b.status === 'PAID').length,
    completed: bookings.filter((b) => b.status === 'COMPLETED').length,
  }), [bookings]);

  const handleSaveProfile = async () => {
    try {
      setSubmitting(true);
      await homeServicesApi.updateProviderProfile({
        bio: bio.trim() || undefined,
        serviceDescription: serviceDescription.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
        portfolioImages,
      });
      alert('Profile updated successfully.');
      loadData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadService.uploadImage(file);
      setProfileImageUrl(url);
    } catch {
      alert('Failed to upload image.');
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadService.uploadImage(file);
      setPortfolioImages((prev) => [...prev, url]);
    } catch {
      alert('Failed to upload image.');
    }
  };

  const renderBooking = (booking: ServiceBooking) => (
    <Link
      key={booking.id}
      to={`/home-services/provider/bookings/${booking.id}`}
      className="block p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300"
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-900">{booking.bookingRef}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || 'text-gray-600 bg-gray-100'}`}>
          {formatStatus(booking.status)}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-1">{booking.category?.name}</p>
      <p className="text-xs text-gray-500 mt-1">{booking.serviceAddress}</p>
    </Link>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notApproved) {
    return (
      <div className="max-w-4xl mx-auto bg-white min-h-full">
        <PageHeader title="Service Provider" backTo="/home-services" />
        <div className="text-center py-16 px-6">
          <p className="font-semibold text-gray-700">
            {applicationStatus === 'PENDING' ? 'Application Pending Review' : 'Provider Approval Required'}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {applicationStatus === 'PENDING'
              ? 'We are reviewing your application. You will be redirected automatically when approved.'
              : 'Complete your service provider application to start receiving bookings.'}
          </p>
          <button type="button" onClick={() => navigate('/home-services/become-provider')} className="mt-4 px-4 py-2 bg-sky-500 text-white text-sm rounded-lg">
            View Application
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Provider Dashboard" subtitle={provider?.displayName} backTo="/home-services" />

      <div className="flex overflow-x-auto border-b border-gray-100 px-2 gap-1">
        {(['overview', 'services', 'availability', 'bookings', 'profile'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 px-3 py-2.5 text-sm font-medium capitalize rounded-t-lg ${
              activeTab === tab ? 'text-sky-600 bg-sky-50' : 'text-gray-500'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {offeringsCount === 0 && activeTab === 'overview' && (
        <div className="mx-4 mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Complete setup: add at least one service and set your availability.
        </div>
      )}
      {subscription?.settings?.isRequired && subscription.subscription && subscription.subscription.status !== 'ACTIVE' && (
        <button
          type="button"
          onClick={() => navigate('/home-services/subscription')}
          className={`mx-4 mt-3 p-3 rounded-lg border text-sm text-left ${
            subscription.subscription.status === 'SUSPENDED'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {subscription.subscription.status === 'GRACE'
            ? `Pay by ${new Date(subscription.subscription.gracePeriodEndsAt).toLocaleDateString()} to stay listed.`
            : subscription.subscription.status === 'PAST_DUE'
              ? 'Renew now to avoid suspension.'
              : 'Pay to restore your listing.'}
        </button>
      )}

      {activeTab === 'overview' && (
        <div className="p-4 space-y-4">
          <div className="p-5 rounded-xl bg-sky-500 text-white">
            <p className="text-xl font-bold">
              Welcome back{provider?.displayName ? `, ${provider.displayName.split(' ')[0]}` : ''}
            </p>
            <p className="text-sm text-sky-100 mt-1">Manage service requests and your provider profile</p>
            <p className="text-sm font-semibold mt-2">
              {provider?.rating?.toFixed(1) ?? '5.0'} · {provider?.reviewCount ?? 0} reviews
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Bookings" value={stats.total} />
            <StatCard label="Awaiting Action" value={stats.pending} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Completed" value={stats.completed} />
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-sky-700" />
              <h3 className="font-semibold text-gray-900">Available for settlement</h3>
            </div>
            {availableEarnings.length === 0 ? (
              <p className="text-sm text-gray-600">No settleable earnings yet. Completed paid jobs will appear here.</p>
            ) : (
              <div className="space-y-2 mb-3">
                {availableEarnings.map((earning) => (
                  <div key={earning.currency}>
                    <p className="text-xl font-bold text-sky-700">{formatPrice(earning.amount, earning.currency)}</p>
                    <p className="text-sm text-gray-500">{earning.bookingsCount} booking(s) ready</p>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={availableEarnings.length === 0}
              onClick={() => navigate('/home-services/settlement-request')}
              className="w-full py-2.5 rounded-xl bg-sky-600 text-white text-sm font-semibold disabled:opacity-45"
            >
              Request Settlement
            </button>
            <button
              type="button"
              onClick={() => navigate('/settlement-history?channel=HOME_SERVICES')}
              className="w-full mt-2 text-sm text-sky-700 font-medium"
            >
              View settlement history
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setActiveTab('profile')} className="py-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-semibold">
              Edit Profile
            </button>
            <button type="button" onClick={() => navigate('/home-services')} className="py-3 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 text-sm font-semibold">
              Browse Services
            </button>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Recent Bookings</h3>
              <span className="text-sm text-gray-500">{bookings.length} total</span>
            </div>
            {bookings.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No bookings yet</p>
            ) : (
              <div className="space-y-2">{bookings.slice(0, 5).map(renderBooking)}</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'services' && <ManageServiceOfferings onChanged={() => loadData()} />}
      {activeTab === 'availability' && <ProviderAvailabilityEditor />}
      {activeTab === 'bookings' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bookings Inbox</h3>
            <span className="text-sm text-gray-500">{bookings.length} total</span>
          </div>
          {bookings.length === 0 ? (
            <p className="text-center text-gray-500 py-12">No bookings yet</p>
          ) : (
            bookings.map(renderBooking)
          )}
        </div>
      )}
      {activeTab === 'profile' && (
        <div className="p-4 space-y-4">
          <div>
            <p className="font-semibold text-gray-900">How customers see you</p>
            <p className="text-sm text-gray-500 mt-1">Add a photo and describe your services so customers can choose you.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo</label>
            <div className="flex items-center gap-4">
              {profileImageUrl ? (
                <img src={getImageUrl(profileImageUrl)} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-sky-100" />
              )}
              <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Description</label>
            <textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {portfolioImages.map((url, i) => (
                <img key={i} src={getImageUrl(url)} alt="" className="w-20 h-20 rounded-lg object-cover" />
              ))}
            </div>
            <input type="file" accept="image/*" onChange={handlePortfolioUpload} className="text-sm" />
          </div>
          <button type="button" onClick={handleSaveProfile} disabled={submitting} className="w-full py-3 bg-sky-500 text-white font-semibold rounded-xl disabled:opacity-60">
            {submitting ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      )}
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
