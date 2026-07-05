import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { realEstateApi, type PropertyBlockedDate, type PropertyListing, type PropertyRoomType } from '../../api/realEstateApi';
import { BED_TYPES, ROOM_AMENITIES } from '../../utils/propertyFormHelpers';
import { formatPrice } from '../../utils/formatPrice';

type Tab = 'rooms' | 'calendar';

export function ListingSetup() {
  const { listingId } = useParams<{ listingId: string }>();
  const [searchParams] = useSearchParams();
  const listingTitle = searchParams.get('title') || 'Listing';
  const [tab, setTab] = useState<Tab>('rooms');
  const [listing, setListing] = useState<PropertyListing | null>(null);
  const [rooms, setRooms] = useState<PropertyRoomType[]>([]);
  const [blocked, setBlocked] = useState<PropertyBlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [bedType, setBedType] = useState(BED_TYPES[0]);
  const [pricePerNight, setPricePerNight] = useState('');
  const [maxAdults, setMaxAdults] = useState('2');
  const [maxChildren, setMaxChildren] = useState('1');
  const [unitsAvailable, setUnitsAvailable] = useState('1');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');

  const load = useCallback(async () => {
    if (!listingId) return;
    try {
      setLoading(true);
      const [listingData, r, b] = await Promise.all([
        realEstateApi.getListing(listingId),
        realEstateApi.getRoomTypes(listingId),
        realEstateApi.getBlockedDates(listingId),
      ]);
      setListing(listingData);
      setRooms(r);
      setBlocked(b);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => { load(); }, [load]);

  const handleCreateRoom = async () => {
    if (!listingId || !name.trim() || !pricePerNight) {
      alert('Room name and price per night are required.');
      return;
    }
    try {
      await realEstateApi.createRoomType(listingId, {
        name: name.trim(),
        bedType,
        pricePerNight: parseFloat(pricePerNight),
        maxAdults: parseInt(maxAdults, 10) || 2,
        maxChildren: parseInt(maxChildren, 10) || 0,
        maxOccupancy: (parseInt(maxAdults, 10) || 2) + (parseInt(maxChildren, 10) || 0),
        unitsAvailable: parseInt(unitsAvailable, 10) || 1,
        amenities,
      });
      setShowForm(false);
      setName('');
      setPricePerNight('');
      setAmenities([]);
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to add room.');
    }
  };

  const handleAddBlock = async () => {
    if (!listingId || !blockStart || !blockEnd) {
      alert('Enter start and end dates.');
      return;
    }
    try {
      await realEstateApi.addBlockedDate(listingId, { startDate: blockStart, endDate: blockEnd });
      setBlockStart('');
      setBlockEnd('');
      await load();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to block dates.');
    }
  };

  const handlePublish = async () => {
    if (!listingId || rooms.length === 0) {
      alert('Add at least one room type before publishing.');
      return;
    }
    try {
      setPublishing(true);
      const updated = await realEstateApi.publishListing(listingId);
      setListing(updated);
      alert('Your listing is now live and visible to guests.');
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to publish listing.');
    } finally {
      setPublishing(false);
    }
  };

  const canPublish = listing && listing.status !== 'ACTIVE' && rooms.length > 0;
  const isLive = listing?.status === 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="Setup Listing" subtitle={listingTitle} backTo="/real-estate/manage-listings" />

      {isLive ? (
        <div className="mx-4 mb-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
          Live — visible to guests
        </div>
      ) : canPublish ? (
        <div className="mx-4 mb-2 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-900 mb-3">Ready to publish — guests cannot book until you publish.</p>
          <button type="button" onClick={handlePublish} disabled={publishing} className="w-full py-2.5 rounded-lg bg-violet-600 text-white font-semibold text-sm disabled:opacity-60">
            {publishing ? 'Publishing…' : 'Publish Listing'}
          </button>
        </div>
      ) : null}

      <div className="flex gap-2 p-4">
        {(['rooms', 'calendar'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${
              tab === t ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t === 'rooms' ? 'Rooms & Rates' : 'Calendar'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'rooms' ? (
        <div className="p-4 space-y-4">
          {!showForm ? (
            <button type="button" onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 font-semibold text-sm">
              <Plus className="w-4 h-4" /> Add Room Type
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Room name *" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="flex flex-wrap gap-2">
                {BED_TYPES.map((b) => (
                  <button key={b} type="button" onClick={() => setBedType(b)} className={`px-3 py-1 rounded-full text-xs border ${bedType === b ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-gray-200'}`}>
                    {b}
                  </button>
                ))}
              </div>
              <input value={pricePerNight} onChange={(e) => setPricePerNight(e.target.value)} placeholder="Price per night *" type="number" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              <div className="grid grid-cols-3 gap-2">
                <input value={maxAdults} onChange={(e) => setMaxAdults(e.target.value)} placeholder="Max adults" type="number" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={maxChildren} onChange={(e) => setMaxChildren(e.target.value)} placeholder="Max children" type="number" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                <input value={unitsAvailable} onChange={(e) => setUnitsAvailable(e.target.value)} placeholder="Units" type="number" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div className="flex flex-wrap gap-1">
                {ROOM_AMENITIES.map((a) => {
                  const selected = amenities.includes(a);
                  return (
                    <button key={a} type="button" onClick={() => setAmenities((prev) => selected ? prev.filter((x) => x !== a) : [...prev, a])} className={`px-2 py-0.5 rounded text-xs ${selected ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                      {a}
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={handleCreateRoom} className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold">Save Room</button>
            </div>
          )}
          {rooms.map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <p className="font-semibold text-gray-900">{r.name}</p>
              <p className="text-xs text-gray-500">{r.bedType} · {r.maxAdults} adults · {r.unitsAvailable} units</p>
              <p className="text-sm font-bold text-violet-600 mt-1">{formatPrice(r.pricePerNight, 'GMD')}/night</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">Block dates when the property is unavailable.</p>
          <input type="date" value={blockStart} onChange={(e) => setBlockStart(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input type="date" value={blockEnd} onChange={(e) => setBlockEnd(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <button type="button" onClick={handleAddBlock} className="w-full py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold">Block Dates</button>
          {blocked.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-700">{b.startDate?.slice(0, 10)} → {b.endDate?.slice(0, 10)}</span>
              <button type="button" onClick={() => listingId && realEstateApi.deleteBlockedDate(listingId, b.id).then(load)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
