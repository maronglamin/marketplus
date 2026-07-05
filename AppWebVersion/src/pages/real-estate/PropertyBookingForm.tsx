import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { differenceInDays } from 'date-fns';
import { Check } from 'lucide-react';
import { LocationMapPreview } from '../../components/LocationMapPreview';
import { GuestSelector } from '../../components/GuestSelector';
import { StayBookingDates } from '../../components/StayBookingDates';
import { StayAvailabilityBanner } from '../../components/StayAvailabilityBanner';
import { PaginatedRoomList } from '../../components/PaginatedRoomList';
import { PageHeader } from '../../components/PageHeader';
import { defaultCheckInDate, defaultCheckOutDate } from '../../utils/stayDates';
import { realEstateApi, type GuestSelection, type PropertyListing, type PropertyRoomType, type StaySummary } from '../../api/realEstateApi';
import { formatPrice } from '../../utils/formatPrice';

export function PropertyBookingForm() {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [roomTypes, setRoomTypes] = useState<PropertyRoomType[]>([]);
  const [staySummary, setStaySummary] = useState<StaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [availLoading, setAvailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const paramCheckIn = searchParams.get('checkIn');
  const paramCheckOut = searchParams.get('checkOut');
  const paramAdults = searchParams.get('adults');
  const paramChildren = searchParams.get('children');
  const paramChildAges = searchParams.get('childAges');
  const paramRoomTypeId = searchParams.get('roomTypeId');
  const paramRoomsBooked = searchParams.get('roomsBooked');

  const [checkIn, setCheckIn] = useState(() => (paramCheckIn ? new Date(paramCheckIn) : defaultCheckInDate()));
  const [checkOut, setCheckOut] = useState(() => (paramCheckOut ? new Date(paramCheckOut) : defaultCheckOutDate()));
  const [guests, setGuests] = useState<GuestSelection>({
    adults: paramAdults ? parseInt(paramAdults, 10) : 2,
    children: paramChildren ? parseInt(paramChildren, 10) : 0,
    childAges: paramChildAges ? paramChildAges.split(',').map(Number).filter((n) => !isNaN(n)) : [],
  });
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(paramRoomTypeId);
  const [roomsBooked, setRoomsBooked] = useState(paramRoomsBooked ? parseInt(paramRoomsBooked, 10) : 1);

  useEffect(() => {
    if (!listingId) return;
    realEstateApi.getListing(listingId)
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  useEffect(() => {
    if (!listing || !listingId || checkOut <= checkIn) return;
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
        if (paramRoomTypeId && data.roomTypes?.some((r) => r.id === paramRoomTypeId)) {
          setSelectedRoomId(paramRoomTypeId);
        } else if (!data.roomTypes?.some((r) => r.id === selectedRoomId)) {
          setSelectedRoomId(data.roomTypes?.[0]?.id ?? null);
        }
      })
      .catch(() => setRoomTypes([]))
      .finally(() => setAvailLoading(false));
  }, [listing, listingId, checkIn, checkOut, guests.adults, guests.children, paramRoomTypeId, selectedRoomId]);

  const nights = useMemo(
    () => Math.max(1, differenceInDays(checkOut, checkIn)),
    [checkIn, checkOut],
  );
  const selectedRoom = roomTypes.find((r) => r.id === selectedRoomId);
  const totalPrice = selectedRoom ? Number(selectedRoom.pricePerNight) * nights * roomsBooked : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing || !selectedRoom || !listingId) {
      setError('Please choose an available room type.');
      return;
    }
    if (checkOut <= checkIn) {
      setError('Check-out must be after check-in.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const booking = await realEstateApi.createBooking({
        listingId,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        adults: guests.adults,
        children: guests.children,
        childAges: guests.childAges,
        roomTypeId: selectedRoom.id,
        roomsBooked,
      });
      alert(`Your reservation ${booking.bookingRef} is pending payment.`);
      navigate('/real-estate/my-reservations');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create booking.');
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
      <PageHeader title="Confirm Booking" subtitle={listing?.title} backTo={`/real-estate/listings/${listingId}`} />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {listing && listing.latitude != null && listing.longitude != null && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Property location</p>
            <LocationMapPreview
              location={{ latitude: listing.latitude, longitude: listing.longitude, address: listing.address }}
              city={listing.city}
            />
          </div>
        )}

        <StayBookingDates
          checkIn={checkIn}
          checkOut={checkOut}
          onCheckInChange={setCheckIn}
          onCheckOutChange={setCheckOut}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
          <GuestSelector value={guests} onChange={setGuests} accent="text-violet-600" />
        </div>

        <StayAvailabilityBanner loading={availLoading} summary={staySummary} />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Room type</label>
          {availLoading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <PaginatedRoomList
              items={roomTypes}
              keyExtractor={(room) => room.id}
              emptyMessage="No rooms available for these dates."
              renderItem={(room) => {
                const selected = selectedRoomId === room.id;
                const soldOut = room.available === false;
                return (
                  <button
                    type="button"
                    disabled={soldOut}
                    onClick={() => !soldOut && setSelectedRoomId(room.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left mb-2 ${
                      soldOut ? 'opacity-50' : ''
                    } ${selected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-gray-50'}`}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{room.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(room.pricePerNight, listing?.currency ?? 'GMD')}/night
                      </p>
                    </div>
                    {selected && <Check className="w-5 h-5 text-violet-600" />}
                  </button>
                );
              }}
            />
          )}
        </div>

        {selectedRoom && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of rooms</label>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setRoomsBooked((n) => Math.max(1, n - 1))} className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 font-bold">−</button>
              <span className="text-lg font-bold">{roomsBooked}</span>
              <button type="button" onClick={() => setRoomsBooked((n) => Math.min(selectedRoom.unitsLeft ?? 1, n + 1))} className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 font-bold">+</button>
            </div>
          </div>
        )}

        {listing && selectedRoom && (
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
            <p className="text-sm text-gray-600">
              {formatPrice(selectedRoom.pricePerNight, listing.currency)} × {nights} night{nights !== 1 ? 's' : ''} × {roomsBooked} room{roomsBooked !== 1 ? 's' : ''}
            </p>
            <p className="text-lg font-bold text-violet-700 mt-1">Total: {formatPrice(totalPrice, listing.currency)}</p>
          </div>
        )}

        <button type="submit" disabled={submitting || !selectedRoom} className="w-full py-4 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60">
          {submitting ? 'Booking...' : 'Confirm Booking'}
        </button>
      </form>
    </div>
  );
}
