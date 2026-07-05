import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Building2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { getImageUrl } from '../../config/api';
import { realEstateApi, type PropertyListing, type PropertyListingType } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';

export function PropertyListingBrowse() {
  const { listingType } = useParams<{ listingType: PropertyListingType }>();
  const [searchParams] = useSearchParams();
  const title = searchParams.get('title') || 'Properties';
  const checkIn = searchParams.get('checkIn') || undefined;
  const checkOut = searchParams.get('checkOut') || undefined;
  const adults = searchParams.get('adults') ? parseInt(searchParams.get('adults')!, 10) : undefined;
  const children = searchParams.get('children') ? parseInt(searchParams.get('children')!, 10) : undefined;

  const [listings, setListings] = useState<PropertyListing[]>([]);
  const [loading, setLoading] = useState(true);

  const isStaySearch = (listingType === 'HOTEL' || listingType === 'APARTMENT_RENTAL') && checkIn && checkOut;

  const loadListings = useCallback(async () => {
    if (!listingType) return;
    try {
      setLoading(true);
      const data = isStaySearch
        ? await realEstateApi.searchListings({
            listingType,
            checkIn,
            checkOut,
            adults: adults ?? 2,
            children: children ?? 0,
          })
        : await realEstateApi.getListings({ listingType });
      setListings(data);
    } catch {
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [listingType, isStaySearch, checkIn, checkOut, adults, children]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title={title} subtitle={`${listings.length} listings`} backTo="/real-estate" />

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 px-6">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">No listings found</p>
          <p className="text-sm text-gray-500 mt-1">Check back later for new properties</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {listings.map((item) => {
            const imageUrl = item.images[0]?.url ? getImageUrl(item.images[0].url) : null;
            return (
              <Link
                key={item.id}
                to={`/real-estate/listings/${item.id}`}
                className="block rounded-xl overflow-hidden border border-gray-200 hover:border-violet-300 transition-colors"
              >
                {imageUrl ? (
                  <img src={imageUrl} alt={item.title} className="w-full h-40 object-cover" />
                ) : (
                  <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                    <Building2 className="w-10 h-10 text-gray-300" />
                  </div>
                )}
                <div className="p-4">
                  <p className="font-semibold text-gray-900 line-clamp-2">{item.title}</p>
                  <p className="text-lg font-bold text-violet-600 mt-1">
                    {item.fromPrice != null
                      ? `From ${formatPrice(item.fromPrice, item.currency)}/night`
                      : formatPrice(item.price, item.currency)}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" /> {item.city}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
