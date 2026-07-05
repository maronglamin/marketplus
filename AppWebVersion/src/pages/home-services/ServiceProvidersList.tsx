import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Star, MapPin, ChevronRight, User } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { getImageUrl } from '../../config/api';
import { homeServicesApi, type ServiceProvider } from '../../api/homeServicesApi';

export function ServiceProvidersList() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [searchParams] = useSearchParams();
  const categoryName = searchParams.get('name') || 'Providers';
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    homeServicesApi.getProviders(categoryId)
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, [categoryId]);

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title={categoryName} subtitle="Choose a provider" backTo="/home-services" />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 px-6">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No providers yet</p>
          <p className="text-sm text-gray-500 mt-1">Check back soon for {categoryName} providers</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {providers.map((provider) => {
            const profileSrc = provider.profileImageUrl ? getImageUrl(provider.profileImageUrl) : null;
            const description = provider.serviceDescription || provider.bio;
            return (
              <Link
                key={provider.id}
                to={`/home-services/providers/${provider.id}?categoryId=${categoryId}&categoryName=${encodeURIComponent(categoryName)}`}
                className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300 transition-colors"
              >
                {profileSrc ? (
                  <img src={profileSrc} alt={provider.displayName} className="w-13 h-13 rounded-full object-cover w-[52px] h-[52px]" />
                ) : (
                  <div className="w-[52px] h-[52px] rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-sky-500" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{provider.displayName}</p>
                  {provider.city && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> {provider.city}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                    {description || 'Tap to view full profile'}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    {provider.rating.toFixed(1)} ({provider.reviewCount} reviews)
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-3" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
