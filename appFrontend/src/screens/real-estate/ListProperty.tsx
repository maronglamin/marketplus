import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { RealEstateStackParamList } from '../../navigation/RealEstateNavigator';
import { realEstateApi, type PropertyListingType } from '../../services/realEstateApi';
import { FormStepIndicator } from '../../components/FormStepIndicator';
import { FormScreenLayout } from '../../components/FormScreenLayout';
import { LocationPickerField } from '../../components/LocationPickerField';
import type { MapLocationWithCity } from '../../services/mapLocationService';
import { uploadService } from '../../services/uploadService';
import {
  BED_TYPES,
  MIN_HOTEL_PHOTOS,
  MIN_PHOTO_HEIGHT,
  MIN_PHOTO_WIDTH,
  ROOM_AMENITIES,
  type ListingPhoto,
  type RoomTypeConfig,
  pickListingPhoto,
} from '../../utils/propertyFormHelpers';

const ACCENT = '#7C3AED';

type Nav = NativeStackNavigationProp<RealEstateStackParamList, 'ListProperty'>;

const LISTING_TYPES: { value: PropertyListingType; label: string }[] = [
  { value: 'HOTEL', label: 'Hotel' },
  { value: 'APARTMENT_RENTAL', label: 'Apartment Rental' },
  { value: 'HOME_SALE', label: 'Home for Sale' },
  { value: 'LAND_SALE', label: 'Land for Sale' },
];

const PHOTO_CATEGORIES: { value: ListingPhoto['category']; label: string }[] = [
  { value: 'EXTERIOR', label: 'Exterior' },
  { value: 'ROOM', label: 'Room' },
  { value: 'BATHROOM', label: 'Bathroom' },
  { value: 'OTHER', label: 'Other' },
];

const isStayType = (type: PropertyListingType) => type === 'HOTEL' || type === 'APARTMENT_RENTAL';

const emptyRoom = (): RoomTypeConfig => ({
  name: '',
  bedType: BED_TYPES[0],
  layout: '',
  amenities: [],
  pricePerNight: '',
});

export function ListProperty() {
  const navigation = useNavigation<Nav>();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [checkingAgent, setCheckingAgent] = useState(true);
  const [isApprovedAgent, setIsApprovedAgent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoCategory, setPhotoCategory] = useState<ListingPhoto['category']>('ROOM');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<PropertyListingType>('HOTEL');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState<MapLocationWithCity | null>(null);
  const [photos, setPhotos] = useState<ListingPhoto[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomTypeConfig[]>([emptyRoom()]);
  const [showTypePicker, setShowTypePicker] = useState(false);

  const stayListing = isStayType(listingType);
  const STEPS = stayListing
    ? ['Property Details', 'Photos', 'Review']
    : ['Details', 'Location & Price', 'Photos', 'Review'];
  const TOTAL_STEPS = STEPS.length;

  useEffect(() => {
    realEstateApi.getMyApplication()
      .then((data) => setIsApprovedAgent(!!data?.agent))
      .catch(() => setIsApprovedAgent(false))
      .finally(() => setCheckingAgent(false));
  }, []);

  useEffect(() => {
    if (step > TOTAL_STEPS) setStep(TOTAL_STEPS);
  }, [listingType, TOTAL_STEPS, step]);

  const addPhoto = async () => {
    const asset = await pickListingPhoto();
    if (!asset) return;

    const w = asset.width ?? 0;
    const h = asset.height ?? 0;
    if (stayListing && w > 0 && h > 0 && (w < MIN_PHOTO_WIDTH || h < MIN_PHOTO_HEIGHT)) {
      Alert.alert(
        'Resolution too low',
        `Photos must be at least ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT} pixels. This image is ${w}×${h}.`,
      );
      return;
    }

    setPhotos((prev) => [...prev, { uri: asset.uri, category: photoCategory, width: w || undefined, height: h || undefined }]);
  };

  const updateRoom = (index: number, patch: Partial<RoomTypeConfig>) => {
    setRoomTypes((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const toggleRoomAmenity = (roomIndex: number, amenity: string) => {
    setRoomTypes((prev) =>
      prev.map((r, i) => {
        if (i !== roomIndex) return r;
        const has = r.amenities.includes(amenity);
        return { ...r, amenities: has ? r.amenities.filter((a) => a !== amenity) : [...r.amenities, amenity] };
      }),
    );
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!title.trim()) {
        Alert.alert('Required', 'Enter a property title.');
        return false;
      }
      if (stayListing) {
        if (!price.trim()) {
          Alert.alert('Required', 'Enter a price.');
          return false;
        }
        if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
          Alert.alert('Required', 'Pin the property location on the map.');
          return false;
        }
        const parsed = parseFloat(price);
        if (isNaN(parsed) || parsed <= 0) {
          Alert.alert('Invalid price', 'Enter a valid price.');
          return false;
        }
      }
    }

    if (!stayListing && currentStep === 2) {
      if (!price.trim()) {
        Alert.alert('Required', 'Enter a price.');
        return false;
      }
      if (!location?.latitude || !location?.longitude || !location.address?.trim() || !location.city?.trim()) {
        Alert.alert('Required', 'Pin the property location on the map.');
        return false;
      }
      const parsed = parseFloat(price);
      if (isNaN(parsed) || parsed <= 0) {
        Alert.alert('Invalid price', 'Enter a valid price.');
        return false;
      }
    }

    const photoStep = stayListing ? 2 : 3;
    if (currentStep === photoStep) {
      const minPhotos = stayListing ? MIN_HOTEL_PHOTOS : 3;
      if (photos.length < minPhotos) {
        Alert.alert('More photos needed', stayListing
          ? `Upload at least ${MIN_HOTEL_PHOTOS} high-resolution photos (exterior, rooms, and bathrooms).`
          : 'Upload at least 3 photos.');
        return false;
      }
      if (stayListing) {
        const hasExterior = photos.some((p) => p.category === 'EXTERIOR');
        const hasRoom = photos.some((p) => p.category === 'ROOM');
        const hasBathroom = photos.some((p) => p.category === 'BATHROOM');
        if (!hasExterior || !hasRoom || !hasBathroom) {
          Alert.alert('Photo categories required', 'Include exterior, room, and bathroom photos.');
          return false;
        }
      }
    }

    if (stayListing && currentStep === 3) {
      // review step — no extra validation
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!validateStep(1)) return;
    if (!stayListing && !validateStep(2)) return;
    if (!validateStep(stayListing ? 2 : 3)) return;
    if (!location) return;

    try {
      setSubmitting(true);
      setUploading(true);
      const uploadedImages = [];
      for (const photo of photos) {
        const url = await uploadService.uploadImage(photo.uri);
        uploadedImages.push({
          url,
          category: photo.category,
          width: photo.width,
          height: photo.height,
        });
      }
      setUploading(false);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        listingType,
        price: parseFloat(price),
        address: location.address.trim(),
        city: location.city.trim(),
        latitude: location.latitude,
        longitude: location.longitude,
        images: uploadedImages,
      };

      await realEstateApi.createListing(payload);

      Alert.alert('Listing Created', stayListing
        ? 'Property shell created. Add room types and rates from your dashboard to start accepting bookings.'
        : 'Your property has been listed.', [
        { text: 'View Listings', onPress: () => navigation.navigate('ManageListings') },
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to create listing.');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const renderPhotosStep = () => (
    <>
      <Text style={styles.stepTitle}>High-quality photos</Text>
      <Text style={styles.stepSubtitle}>
        {stayListing
          ? `At least ${MIN_HOTEL_PHOTOS} photos (min ${MIN_PHOTO_WIDTH}×${MIN_PHOTO_HEIGHT}px). Clear, naturally lit, no watermarks. Include exterior, rooms, and bathrooms.`
          : 'Add clear photos of the property.'}
      </Text>
      <Text style={styles.photoCount}>{photos.length}{stayListing ? ` / ${MIN_HOTEL_PHOTOS} minimum` : ''} photos</Text>

      <Text style={styles.label}>Photo category</Text>
      <View style={styles.chipRow}>
        {PHOTO_CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, photoCategory === c.value && styles.chipSelected]}
            onPress={() => setPhotoCategory(c.value)}
          >
            <Text style={[styles.chipText, photoCategory === c.value && styles.chipTextSelected]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
        {photos.map((photo, i) => (
          <View key={i} style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photoThumb} />
            <Text style={styles.photoCategoryLabel}>{photo.category}</Text>
            <TouchableOpacity style={styles.removePhoto} onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}>
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity style={styles.addPhotoButton} onPress={addPhoto}>
          <Ionicons name="camera-outline" size={28} color={ACCENT} />
          <Text style={styles.addPhotoText}>Add</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  const renderRoomsStep = () => (
    <>
      <Text style={styles.stepTitle}>Room configurations</Text>
      <Text style={styles.stepSubtitle}>Define each room type with bed layout and at least one amenity.</Text>
      {roomTypes.map((room, index) => (
        <View key={index} style={styles.roomCard}>
          <View style={styles.roomCardHeader}>
            <Text style={styles.roomCardTitle}>Room Type {index + 1}</Text>
            {roomTypes.length > 1 && (
              <TouchableOpacity onPress={() => setRoomTypes((r) => r.filter((_, i) => i !== index))}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.label}>Room Name *</Text>
          <TextInput style={styles.input} value={room.name} onChangeText={(v) => updateRoom(index, { name: v })} placeholder="e.g. Deluxe Double" />
          <Text style={styles.label}>Bed Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
            {BED_TYPES.map((bed) => (
              <TouchableOpacity
                key={bed}
                style={[styles.chip, room.bedType === bed && styles.chipSelected]}
                onPress={() => updateRoom(index, { bedType: bed })}
              >
                <Text style={[styles.chipText, room.bedType === bed && styles.chipTextSelected]}>{bed}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Text style={styles.label}>Layout *</Text>
          <TextInput style={styles.input} value={room.layout} onChangeText={(v) => updateRoom(index, { layout: v })} placeholder="e.g. 1 double bed, ensuite bathroom" />
          <Text style={styles.label}>Nightly Price (optional)</Text>
          <TextInput style={styles.input} value={room.pricePerNight} onChangeText={(v) => updateRoom(index, { pricePerNight: v })} keyboardType="decimal-pad" />
          <Text style={styles.label}>Amenities * (select at least one)</Text>
          <View style={styles.chipRow}>
            {ROOM_AMENITIES.map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.chip, room.amenities.includes(a) && styles.chipSelected]}
                onPress={() => toggleRoomAmenity(index, a)}
              >
                <Text style={[styles.chipText, room.amenities.includes(a) && styles.chipTextSelected]}>{a}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
      <TouchableOpacity style={styles.addRoomButton} onPress={() => setRoomTypes((r) => [...r, emptyRoom()])}>
        <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
        <Text style={styles.addRoomText}>Add Another Room Type</Text>
      </TouchableOpacity>
    </>
  );

  const renderStepContent = () => {
    if (stayListing) {
      switch (step) {
        case 1:
          return (
            <>
              <Text style={styles.stepTitle}>Property details</Text>
              <Text style={styles.label}>Title *</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Hotel name" />
              <Text style={styles.label}>Description</Text>
              <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" />
              <Text style={styles.label}>Listing Type *</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(!showTypePicker)}>
                <Text style={styles.pickerText}>{LISTING_TYPES.find((t) => t.value === listingType)?.label}</Text>
                <Ionicons name={showTypePicker ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
              </TouchableOpacity>
              {showTypePicker && LISTING_TYPES.map((t) => (
                <TouchableOpacity key={t.value} style={styles.pickerOption} onPress={() => { setListingType(t.value); setShowTypePicker(false); setStep(1); }}>
                  <Text style={styles.pickerOptionText}>{t.label}</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.label}>Base Price *</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              <LocationPickerField
                value={location}
                onChange={setLocation}
                label="Property Location"
                accent={ACCENT}
              />
            </>
          );
        case 2: return renderPhotosStep();
        case 3:
          return (
            <>
              <Text style={styles.stepTitle}>Review & submit</Text>
              <Text style={styles.stepSubtitle}>After submission, add room types and availability from your dashboard.</Text>
              <View style={styles.reviewCard}>
                <Text style={styles.reviewTitle}>{title}</Text>
                <Text style={styles.reviewLine}>{location?.address}, {location?.city}</Text>
                <Text style={styles.reviewPrice}>From {price}</Text>
                <Text style={styles.reviewLine}>{photos.length} photos</Text>
              </View>
            </>
          );
        default: return null;
      }
    }

    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.stepTitle}>Property details</Text>
            <Text style={styles.label}>Title *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top" />
            <Text style={styles.label}>Listing Type *</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(!showTypePicker)}>
              <Text style={styles.pickerText}>{LISTING_TYPES.find((t) => t.value === listingType)?.label}</Text>
            </TouchableOpacity>
            {showTypePicker && LISTING_TYPES.map((t) => (
              <TouchableOpacity key={t.value} style={styles.pickerOption} onPress={() => { setListingType(t.value); setShowTypePicker(false); }}>
                <Text style={styles.pickerOptionText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.stepTitle}>Location & price</Text>
            <Text style={styles.label}>Price *</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <LocationPickerField
              value={location}
              onChange={setLocation}
              label="Property Location"
              accent={ACCENT}
            />
          </>
        );
      case 3: return renderPhotosStep();
      case 4:
        return (
          <>
            <Text style={styles.stepTitle}>Review</Text>
            <View style={styles.reviewCard}>
              <Text style={styles.reviewTitle}>{title}</Text>
              <Text style={styles.reviewLine}>{location?.address}, {location?.city}</Text>
              <Text style={styles.reviewPrice}>{price}</Text>
              <Text style={styles.reviewLine}>{photos.length} photos</Text>
            </View>
          </>
        );
      default: return null;
    }
  };

  if (checkingAgent) {
    return <View style={styles.container}><ActivityIndicator size="large" color={ACCENT} style={{ marginTop: 80 }} /></View>;
  }

  if (!isApprovedAgent) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>List Property</Text>
          </View>
          <View style={styles.notApproved}>
            <Ionicons name="lock-closed-outline" size={48} color="#D1D5DB" />
            <Text style={styles.notApprovedTitle}>Approval required</Text>
            <Text style={styles.notApprovedSubtitle}>Complete your property agent application before listing.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FormScreenLayout
        header={
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>List Property</Text>
          </View>
        }
        footer={
          <View style={styles.footer}>
            {step < TOTAL_STEPS ? (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.nextButton, submitting && styles.submitDisabled]} onPress={handleSubmit} disabled={submitting || uploading}>
                {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.nextButtonText}>Submit Listing</Text>}
              </TouchableOpacity>
            )}
          </View>
        }
      >
        <FormStepIndicator currentStep={step} totalSteps={TOTAL_STEPS} labels={STEPS} accentColor={ACCENT} />
        {(uploading || submitting) && <ActivityIndicator color={ACCENT} style={{ marginBottom: 12 }} />}
        {renderStepContent()}
      </FormScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backButton: { padding: 4, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  stepTitle: { fontSize: 20, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 12, lineHeight: 20 },
  photoCount: { fontSize: 14, fontWeight: '600', color: ACCENT, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: { padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', fontSize: 15, color: '#1F2937' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  picker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  pickerText: { fontSize: 15, color: '#1F2937' },
  pickerOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  pickerOptionText: { fontSize: 14, color: '#374151' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' },
  chipSelected: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '500' },
  photoRow: { marginVertical: 12 },
  photoWrap: { marginRight: 10, alignItems: 'center' },
  photoThumb: { width: 90, height: 68, borderRadius: 8 },
  photoCategoryLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  removePhoto: { position: 'absolute', top: -4, right: -4 },
  addPhotoButton: { width: 90, height: 68, borderRadius: 8, borderWidth: 2, borderColor: '#DDD6FE', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  addPhotoText: { fontSize: 11, color: ACCENT },
  roomCard: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12 },
  roomCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomCardTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  addRoomButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginBottom: 16 },
  addRoomText: { fontSize: 14, fontWeight: '500', color: ACCENT },
  reviewCard: { backgroundColor: '#F5F3FF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#DDD6FE' },
  reviewTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  reviewLine: { fontSize: 14, color: '#4B5563', marginTop: 6 },
  reviewPrice: { fontSize: 16, fontWeight: '700', color: ACCENT, marginTop: 8 },
  footer: { padding: 16 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: ACCENT, borderRadius: 12, paddingVertical: 14 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  submitDisabled: { opacity: 0.7 },
  notApproved: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  notApprovedTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  notApprovedSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center', lineHeight: 20 },
});
