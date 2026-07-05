import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowLeft, ChevronRight, Wrench } from 'lucide-react';
import { getImageUrl } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { DetailImageCarousel } from '../../components/DetailImageCarousel';
import { homeServicesApi, type ServiceOffering, type ServiceProvider } from '../../api/homeServicesApi';
import { formatPrice } from '../../utils/formatPrice';

export function ServiceProviderDetail() {
  const { providerId } = useParams<{ providerId: string }>();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId') || '';
  const categoryName = searchParams.get('categoryName') || '';
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { promptLogin, loginModal } = useLoginPrompt();
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    homeServicesApi.getProvider(providerId)
      .then(setProvider)
      .catch(() => setProvider(null))
      .finally(() => setLoading(false));
  }, [providerId]);

  const handleBookOffering = (offering: ServiceOffering) => {
    if (!isAuthenticated) { promptLogin('Login to request a service.'); return; }
    if (!provider) return;
    const params = new URLSearchParams({
      categoryId: offering.categoryId || categoryId,
      categoryName: offering.category?.name || categoryName,
      providerId: provider.id,
      providerName: provider.displayName,
      offeringId: offering.id,
      offeringName: offering.name,
    });
    navigate(`/home-services/book?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Provider not found</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-sky-600 text-sm">Go back</button>
      </div>
    );
  }

  const portfolio = Array.isArray(provider.portfolioImages) ? provider.portfolioImages : [];
  const profileSrc = provider.profileImageUrl ? getImageUrl(provider.profileImageUrl) : null;
  const heroImages = [
    ...(profileSrc ? [profileSrc] : []),
    ...portfolio.map((url) => getImageUrl(url)),
  ];
  const locationLabel = [provider.city, provider.address].filter(Boolean).join(' · ');
  const offerings = (provider.offerings ?? []).filter((o) => o.isActive);
  const hasOfferings = offerings.length > 0;

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full pb-24">
      <div className="relative">
        {heroImages.length > 0 ? (
          <DetailImageCarousel images={heroImages} height="13rem" alt={provider.displayName} />
        ) : (
          <div className="w-full h-52 bg-sky-100 flex items-center justify-center">
            <span className="text-6xl text-sky-300">👤</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{provider.displayName}</h1>
          {categoryName && <p className="text-sm text-sky-600 font-medium mt-1">{categoryName}</p>}
          <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              {(provider.rating ?? 0).toFixed(1)} ({provider.reviewCount ?? 0} reviews)
            </span>
            {locationLabel && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {provider.city || provider.address}
              </span>
            )}
          </div>
        </div>

        {provider.latitude != null && provider.longitude != null && (
          <LocationMapPreview
            location={{
              latitude: provider.latitude,
              longitude: provider.longitude,
              address: provider.address || locationLabel,
            }}
            city={provider.city}
          />
        )}

        {provider.serviceDescription && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">About this service</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{provider.serviceDescription}</p>
          </section>
        )}

        {provider.bio && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">About the provider</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{provider.bio}</p>
          </section>
        )}

        {provider.application?.experience && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Experience</h2>
            <p className="text-gray-600 text-sm leading-relaxed">{provider.application.experience}</p>
          </section>
        )}

        {hasOfferings ? (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Services & pricing</h2>
            <div className="space-y-2">
              {offerings.map((offering) => (
                <button
                  key={offering.id}
                  type="button"
                  onClick={() => handleBookOffering(offering)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-sky-300 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{offering.name}</p>
                    {offering.description && (
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{offering.description}</p>
                    )}
                    <div className="flex gap-3 mt-1.5 text-xs">
                      <span className="text-gray-400">{offering.durationMinutes} min</span>
                      {offering.basePrice != null && (
                        <span className="font-semibold text-sky-600">
                          From {formatPrice(Number(offering.basePrice), 'GMD')}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        ) : (provider.categories?.length ?? 0) > 0 ? (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Services offered</h2>
            <div className="flex flex-wrap gap-2">
              {provider.categories.map((c) => (
                <span key={c.category.id} className="px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-medium">
                  {c.category.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {locationLabel && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Service area</h2>
            <p className="text-sm text-gray-600 flex items-start gap-2">
              <MapPin className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
              {locationLabel}
            </p>
          </section>
        )}

      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          {hasOfferings ? (
            <button
              type="button"
              onClick={() => handleBookOffering(offerings[0])}
              className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600"
            >
              <Calendar className="w-5 h-5" />
              Book a Service
            </button>
          ) : (
            <p className="text-center text-sm text-gray-500 py-2">
              This provider is setting up their service menu.
            </p>
          )}
        </div>
      </div>
      {loginModal}
    </div>
  );
}
