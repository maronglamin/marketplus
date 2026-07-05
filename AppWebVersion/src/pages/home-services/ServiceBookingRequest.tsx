import React, { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Send, Wrench } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { LocationPickerField } from '../../components/LocationPickerField';
import { DateSlotPicker } from '../../components/SlotPicker';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { homeServicesApi, type AvailableSlot } from '../../api/homeServicesApi';

export function ServiceBookingRequest() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get('categoryId') || '';
  const providerId = searchParams.get('providerId') || '';
  const providerName = searchParams.get('providerName') || '';
  const offeringId = searchParams.get('offeringId') || '';
  const offeringName = searchParams.get('offeringName') || '';

  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchSlots = useCallback(
    (from: string, to: string) => {
      if (!providerId || !offeringId) return Promise.resolve([]);
      return homeServicesApi.getAvailableSlots(providerId, offeringId, from, to);
    },
    [providerId, offeringId],
  );

  const backTo = providerId
    ? `/home-services/providers/${providerId}?categoryId=${categoryId}&categoryName=${encodeURIComponent(searchParams.get('categoryName') || '')}`
    : '/home-services';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location?.latitude || !location?.longitude || !location.address?.trim()) {
      setError('Please pin the service location on the map.');
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }
    if (!providerId || !offeringId) {
      setError('Missing provider or service information.');
      return;
    }
    try {
      setSubmitting(true);
      setError('');
      const booking = await homeServicesApi.createBooking({
        providerId,
        offeringId,
        slotStart: selectedSlot.start,
        serviceAddress: location.address.trim(),
        serviceLatitude: location.latitude,
        serviceLongitude: location.longitude,
        notes: notes.trim() || undefined,
        categoryId: categoryId || undefined,
      });
      navigate(`/home-services/bookings/${booking.id}`, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader
        title="Book Service"
        subtitle={providerName ? `${providerName} · ${offeringName}` : offeringName}
        backTo={backTo}
      />

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {offeringName && (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-sky-50 border border-sky-200">
            <Wrench className="w-5 h-5 text-sky-600 shrink-0" />
            <p className="font-semibold text-sky-900">{offeringName}</p>
          </div>
        )}

        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Choose a time slot</h2>
          <DateSlotPicker
            fetchSlots={fetchSlots}
            selectedStart={selectedSlot?.start ?? null}
            onSelect={setSelectedSlot}
          />
        </div>

        <LocationPickerField
          value={location}
          onChange={setLocation}
          label="Service location"
          placeholder="Where should the service happen?"
          accent="bg-sky-500"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe the job, access instructions, etc."
            rows={4}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 bg-sky-500 text-white font-semibold rounded-xl hover:bg-sky-600 disabled:opacity-60"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="w-5 h-5" />
              Request Quote for This Slot
            </>
          )}
        </button>
      </form>
    </div>
  );
}
