import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { LocationPickerField } from '../../components/LocationPickerField';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { uploadService } from '../../api/upload';
import { realEstateApi, type PropertyListingType } from '../../api/realEstateApi';
import {
  MIN_HOTEL_PHOTOS,
  MIN_PHOTO_HEIGHT,
  MIN_PHOTO_WIDTH,
  readImageDimensions,
  type ListingPhoto,
} from '../../utils/propertyFormHelpers';

const LISTING_TYPES: { value: PropertyListingType; label: string }[] = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'APARTMENT_RENTAL', label: 'Apartment Rental' },
  { value: 'HOME_SALE', label: 'Home for Sale' },
  { value: 'LAND_SALE', label: 'Land for Sale' },
];

const PHOTO_CATEGORIES = ['EXTERIOR', 'ROOM', 'BATHROOM', 'OTHER'] as const;
const isStayType = (type: PropertyListingType) => type === 'HOTEL' || type === 'APARTMENT_RENTAL';

export function ListProperty() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [checkingAgent, setCheckingAgent] = useState(true);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [photoCategory, setPhotoCategory] = useState<ListingPhoto['category']>('ROOM');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<PropertyListingType>('HOTEL');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);

  const stayListing = isStayType(listingType);
  const stepLabels = stayListing
    ? ['Property Details', 'Photos', 'Review']
    : ['Details', 'Location & Price', 'Photos', 'Review'];
  const totalSteps = stepLabels.length;

  useEffect(() => {
    realEstateApi.getMyApplication()
      .then((data) => {
        setIsApprovedAgent(!!data?.agent);
        if (!data?.agent) navigate('/real-estate/become-agent', { replace: true });
      })
      .catch(() => navigate('/real-estate/become-agent', { replace: true }))
      .finally(() => setCheckingAgent(false));
  }, [navigate]);

  useEffect(() => {
    if (step > totalSteps) setStep(totalSteps);
  }, [listingType, totalSteps, step]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const dims = await readImageDimensions(file);
      if (stayListing && (dims.width < MIN_PHOTO_WIDTH || dims.height < MIN_PHOTO_HEIGHT)) {
        setError(`Photos must be at least ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT}px.`);
        return;
      }
      const url = await uploadService.uploadImage(file);
      setPhotos((prev) => [...prev, { url, category: photoCategory, width: dims.width, height: dims.height }]);
      setError('');
    } catch {
      setError('Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!title.trim()) {
        setError('Enter a property title.');
        return false;
      }
      if (stayListing) {
        if (!price.trim()) {
          setError('Enter a price.');
          return false;
        }
        if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
          setError('Pin the property location on the map.');
          return false;
        }
        const parsed = parseFloat(price);
        if (isNaN(parsed) || parsed <= 0) {
          setError('Enter a valid price.');
          return false;
        }
      }
    }

    if (!stayListing && currentStep === 2) {
      if (!price.trim()) {
        setError('Enter a price.');
        return false;
      }
      if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
        setError('Pin the property location on the map.');
        return false;
      }
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed <= 0) {
        setError('Enter a valid price.');
        return false;
      }
    }

    const photoStep = stayListing ? 2 : 3;
    if (currentStep === photoStep) {
      const minPhotos = stayListing ? MIN_HOTEL_PHOTOS : 3;
      if (photos.length < minPhotos) {
        setError(stayListing
          ? `Upload at least ${MIN_HOTEL_PHOTOS} high-resolution photos (exterior, rooms, and bathrooms).`
          : 'Upload at least 3 photos.');
        return false;
      }
      if (stayListing) {
        const hasExterior = photos.some((p) => p.category === 'EXTERIOR');
        const hasRoom = photos.some((p) => p.category === 'ROOM');
        const hasBathroom = photos.some((p) => p.category === 'BATHROOM');
        if (!hasExterior || !hasRoom || !hasBathroom) {
          setError('Include exterior, room, and bathroom photos.');
          return false;
        }
      }
    }

    setError('');
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;
    if (!stayListing && !validateStep(2)) return;
    if (!validateStep(stayListing ? 2 : 3)) return;
    if (!location) return;

    try {
      setSubmitting(true);
      await realEstateApi.createListing({
        title: title.trim(),
        description: description.trim() || undefined,
        listingType,
        price: parseFloat(price),
        currency: 'GMD',
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        images: photos.filter((p) => p.url).map((p, i) => ({ url: p.url!, category: p.category, width: p.width, height: p.height })),
      });
      alert(stayListing
        ? 'Property shell created. Add room types and rates from your dashboard to start accepting bookings.'
        : 'Your property has been listed.');
      navigate('/real-estate/manage-listings');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create listing.');
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAgent) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isApprovedAgent) return null;

  const renderPhotosStep = () => (
    <div className="space-y-3">
      <div>
        <h2 className="font-semibold text-gray-900">High-quality photos</h2>
        <p className="text-sm text-gray-500 mt-1">
          {stayListing
            ? `At least ${MIN_HOTEL_PHOTOS} photos (min ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT}px). Include exterior, rooms, and bathrooms.`
            : 'Add clear photos of the property.'}
        </p>
      </div>
      <p className="text-sm font-semibold text-violet-600">
        {photos.length}{stayListing ? ` / ${MIN_HOTEL_PHOTOS} minimum` : ''} photos
      </p>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Photo Category</label>
        <select value={photoCategory} onChange={(e) => setPhotoCategory(e.target.value as ListingPhoto['category'])} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
          {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <input type="file" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} className="text-sm" />
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            <img src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover" />
            <span className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white text-center">{p.category}</span>
            <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs">×</button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto bg-white min-h-full">
      <PageHeader title="List Property" backTo="/real-estate/manage-listings" />
      <FormStepIndicator steps={stepLabels} currentStep={step} accent="bg-violet-500" />

      <div className="p-4 space-y-4">
        {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>}

        {stayListing && step === 1 && (
          <div className="space-y-3">
            <Field label="Title *" value={title} onChange={setTitle} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type *</label>
              <select value={listingType} onChange={(e) => { setListingType(e.target.value as PropertyListingType); setStep(1); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <Field label="Base Price *" value={price} onChange={setPrice} type="number" />
            <LocationPickerField value={location} onChange={setLocation} label="Property Location" accent="bg-violet-600" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
            </div>
          </div>
        )}

        {stayListing && step === 2 && renderPhotosStep()}

        {stayListing && step === 3 && (
          <div className="space-y-3">
            <div>
              <h2 className="font-semibold text-gray-900">Review & submit</h2>
              <p className="text-sm text-gray-500 mt-1">After submission, add room types and availability from your dashboard.</p>
            </div>
            <div className="p-4 rounded-xl bg-violet-50 border border-violet-200 text-sm space-y-1">
              <p className="font-semibold text-gray-900">{title}</p>
              <p>{location?.address}, {location?.city}</p>
              <p className="font-bold text-violet-600">From GMD {price}</p>
              <p>{photos.length} photos</p>
            </div>
          </div>
        )}

        {!stayListing && step === 1 && (
          <div className="space-y-3">
            <Field label="Title *" value={title} onChange={setTitle} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Listing Type *</label>
              <select value={listingType} onChange={(e) => setListingType(e.target.value as PropertyListingType)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
            </div>
          </div>
        )}

        {!stayListing && step === 2 && (
          <div className="space-y-3">
            <Field label="Price *" value={price} onChange={setPrice} type="number" />
            <LocationPickerField value={location} onChange={setLocation} label="Property Location" accent="bg-violet-600" />
          </div>
        )}

        {!stayListing && step === 3 && renderPhotosStep()}

        {!stayListing && step === 4 && (
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-sm space-y-1">
            <p className="font-semibold">Review</p>
            <p>{title} · {listingType}</p>
            <p>{location?.address}, {location?.city}</p>
            <p>Price: GMD {price}</p>
            <p>{photos.length} photo(s)</p>
          </div>
        )}

        <div className="flex gap-3 pt-4">
          {step > 1 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 border border-gray-300 rounded-xl">Back</button>
          )}
          {step < totalSteps ? (
            <button type="button" onClick={() => { if (validateStep(step)) setStep((s) => s + 1); }} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl">Next</button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting || uploading} className="flex-1 py-3 bg-violet-600 text-white font-semibold rounded-xl disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm" />
    </div>
  );
}
