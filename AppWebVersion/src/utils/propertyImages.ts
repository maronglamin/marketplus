import { getImageUrl } from '../config/api';
import type { PropertyListing } from '../api/realEstateApi';

/** First listing photo, or first room-type photo as fallback. */
export function getListingCoverUrl(listing: PropertyListing): string | null {
  const listingUrl = listing.images?.[0]?.url;
  if (listingUrl) return getImageUrl(listingUrl);
  const roomPhoto = listing.roomTypesRel?.[0]?.photos?.[0];
  if (roomPhoto) return getImageUrl(roomPhoto);
  return null;
}
