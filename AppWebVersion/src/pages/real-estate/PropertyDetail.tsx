import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Bed, Droplets, Maximize, CheckCircle, Video, UserCircle, Calendar, Check } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { GuestSelector } from '../../components/GuestSelector';
import { StayBookingDates } from '../../components/StayBookingDates';
import { StayAvailabilityBanner } from '../../components/StayAvailabilityBanner';
import { PaginatedRoomList } from '../../components/PaginatedRoomList';
import { DetailImageCarousel } from '../../components/DetailImageCarousel';
import { defaultCheckInDate, defaultCheckOutDate } from '../../utils/stayDates';
import { getImageUrl } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLoginPrompt } from '../../components/LoginPromptModal';
import { realEstateApi, type GuestSelection, type PropertyListing, type PropertyRoomType, type StaySummary } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';

const isStayType = (type: string) => type === 'HOTEL' || type === 'APARTMENT_RENTAL';

export function PropertyDetail() {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { promptLogin, loginModal } = useLoginPrompt();
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomTypes, setRoomTypes] = useState<PropertyRoomType[]>([]);
  const [staySummary, setStaySummary] = useState<StaySummary | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomsBooked, setRoomsBooked] = useState(1);

  const [checkIn, setCheckIn] = useState(defaultCheckInDate);
  const [checkOut, setCheckOut] = useState(defaultCheckOutDate);
  const [guests, setGuests] = useState<GuestSelection>({ adults: 2, children: 0, childAges: [] });

  useEffect(() => {
    if (!listingId) return;
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  const isStay = listing ? isStayType(listing.listingType) : false;

  useEffect(() => {
    if (!listing || !isStay || !listingId || checkOut <= checkIn) {
      setRoomTypes([]);
      setStaySummary(null);
      return;
    }
    setAvailLoading(true);
    realEstateApi.getAvailability(listingId, {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: guests.adults,
      children: guests.children,
    })
      .then((data) => {
        setRoomTypes(data.roomTypes ?? []);
        setStaySummary(data.staySummary ?? null);
      })
      .catch(() => {
        setRoomTypes([]);
        setStaySummary(null);
      })
      .finally(() => setAvailLoading(false));
  }, [listing, listingId, isStay, checkIn, checkOut, guests.adults, guests.children]);

  const nights = useMemo(
    () => Math.max(1, differenceInDays(checkOut, checkIn)),
    [checkIn, checkOut],
  );
  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomId);
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights * roomsBooked : 0;
  const displayPrice = listing?.fromPrice ?? listing?.price ?? 0;

  const handleBook = () => {
    if (!isAuthenticated) { promptLogin('Login to book this property.'); return; }
    if (!selectedRoom || !listingId) return;
    const params = new URLSearchParams({
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults: String(guests.adults),
      children: String(guests.children),
      childAges: guests.childAges.join(','),
      roomTypeId: selectedRoom.id,
      roomsBooked: String(roomsBooked),
    });
    navigate(`/real-estate/listings/${listingId}/book?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Property not found</p>
        <button type="button" onClick={() => navigate(-1)} className="mt-4 text-violet-600 text-sm">Go back</button>
      </div>
    );
  }

  const amenities = listing.amenities ?? [];
  const galleryUrls = listing.images.map((img) => getImageUrl(img.url));

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full pb-24">
      <div className="relative">
        {galleryUrls.length > 0 ? (
          <DetailImageCarousel images={galleryUrls} height="14rem" alt={listing.title} />
        ) : (
          <div className="w-full h-56 bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400">No images</span>
          </div>
        )}
        <button type="button" onClick={() => navigate(-1)} className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-white z-10">
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
          <p className="text-xl font-bold text-violet-600 mt-1">
            {isStay ? `From ${formatPrice(displayPrice, listing.currency)}/night` : formatPrice(listing.price, listing.currency)}
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
            <MapPin className="w-4 h-4" /> {listing.address}, {listing.city}
          </p>
        </div>

        {isStay && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-4">
            <h2 className="font-semibold text-gray-900">Your stay</h2>
            <StayBookingDates
              checkIn={checkIn}
              checkOut={checkOut}
              onCheckInChange={setCheckIn}
              onCheckOutChange={setCheckOut}
            />
            <GuestSelector value={guests} onChange={setGuests} accent="text-violet-600" />

            <StayAvailabilityBanner loading={availLoading} summary={staySummary} />

            <h3 className="font-semibold text-gray-900 pt-2">Available rooms</h3>
            {availLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PaginatedRoomList
                items={roomTypes}
                keyExtractor={(room) => room.id}
                emptyMessage="No rooms available for these dates and guests."
                renderItem={(room) => {
                  const soldOut = room.available === false || (room.unitsLeft ?? 0) <= 0;
                  const selected = selectedRoomId === room.id;
                  const photo = room.photos?.[0];
                  return (
                    <button
                      type="button"
                      disabled={soldOut}
                      onClick={() => !soldOut && setSelectedRoomId(room.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left ${
                        soldOut ? 'opacity-50 cursor-not-allowed' : ''
                      } ${selected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white'}`}
                    >
                      {photo ? (
                        <img src={getImageUrl(photo)} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Bed className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900">{room.name}</p>
                        {room.bedType && (
                          <p className="text-xs text-gray-500">{room.bedType} · up to {room.maxOccupancy} guests</p>
                        )}
                        <p className="text-sm font-bold text-violet-600 mt-0.5">
                          {formatPrice(room.pricePerNight, listing.currency)}/night
                        </p>
                        {!soldOut && room.unitsLeft != null && (
                          <p className="text-xs text-emerald-600">{room.unitsLeft} left</p>
                        )}
                        {soldOut && <p className="text-xs text-red-500 font-semibold">Sold out</p>}
                      </div>
                      {selected && <Check className="w-5 h-5 text-violet-600 shrink-0" />}
                    </button>
                  );
                }}
              />
            )}

            {selectedRoom && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">Rooms</p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setRoomsBooked((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 font-bold"
                  >
                    −
                  </button>
                  <span className="text-lg font-bold">{roomsBooked}</span>
                  <button
                    type="button"
                    onClick={() => setRoomsBooked((n) => Math.min(selectedRoom.unitsLeft ?? 1, n + 1))}
                    className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 font-bold"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm font-semibold text-violet-600 mt-2">
                  Total: {formatPrice(totalPrice, listing.currency)} · {nights} night{nights !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {listing.latitude != null && listing.longitude != null && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Location</h2>
            <LocationMapPreview
              location={{ latitude: listing.latitude, longitude: listing.longitude, address: listing.address }}
              city={listing.city}
            />
          </section>
        )}

        {(listing.bedrooms || listing.bathrooms || listing.areaSqm) && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {listing.bedrooms != null && (
              <span className="flex items-center gap-1"><Bed className="w-4 h-4 text-violet-500" /> {listing.bedrooms} beds</span>
            )}
            {listing.bathrooms != null && (
              <span className="flex items-center gap-1"><Droplets className="w-4 h-4 text-violet-500" /> {listing.bathrooms} baths</span>
            )}
            {listing.areaSqm != null && (
              <span className="flex items-center gap-1"><Maximize className="w-4 h-4 text-violet-500" /> {listing.areaSqm} m²</span>
            )}
          </div>
        )}

        {listing.description && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{listing.description}</p>
          </section>
        )}

        {amenities.length > 0 && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Amenities</h2>
            <div className="flex flex-wrap gap-2">
              {amenities.map((item, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 text-violet-700 text-xs">
                  <CheckCircle className="w-3 h-3" /> {item}
                </span>
              ))}
            </div>
          </section>
        )}

        {listing.virtualTours.length > 0 && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Virtual Tours</h2>
            {listing.virtualTours.map((tour) => (
              <Link
                key={tour.id}
                to={`/real-estate/listings/${listingId}/tour?tourUrl=${encodeURIComponent(tour.tourUrl)}&title=${encodeURIComponent(tour.title || listing.title)}`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-violet-300 mb-2"
              >
                <Video className="w-5 h-5 text-violet-600" />
                <span className="flex-1 text-sm font-medium">{tour.title || 'View Virtual Tour'}</span>
              </Link>
            ))}
          </section>
        )}

        {listing.agent && (
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">Agent</h2>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
              <UserCircle className="w-9 h-9 text-violet-600" />
              <div>
                <p className="font-medium text-gray-900">{listing.agent.displayName}</p>
                {listing.agent.companyName && <p className="text-sm text-gray-500">{listing.agent.companyName}</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto">
          {isStay ? (
            <button
              type="button"
              onClick={handleBook}
              disabled={!selectedRoom}
              className="w-full flex items-center justify-center gap-2 py-4 bg-violet-600 text-white font-semibold rounded-xl hover:bg-violet-700 disabled:opacity-50"
            >
              <Calendar className="w-5 h-5" />
              {selectedRoom ? `Book · ${formatPrice(totalPrice, listing.currency)}` : 'Select a room'}
            </button>
          ) : (
            <Link to={`/real-estate/listings/${listingId}/inquire`} className="block w-full py-4 bg-violet-600 text-white font-semibold rounded-xl text-center hover:bg-violet-700">
              Send Inquiry
            </Link>
          )}
        </div>
      </div>
      {loginModal}
    </div>
  );
}
