import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { uploadService } from '../services/uploadService';

export async function pickAndUploadDocument(label = 'document'): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', `Please allow photo library access to upload your ${label}.`);
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.9,
  });

  if (result.canceled || !result.assets[0]) return null;

  try {
    return await uploadService.uploadImage(result.assets[0].uri);
  } catch {
    Alert.alert('Upload Failed', `Could not upload ${label}. Please try again.`);
    return null;
  }
}

export async function pickListingPhoto(): Promise<ImagePicker.ImagePickerAsset | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please allow photo library access to add property photos.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 1,
  });

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

export const MIN_HOTEL_PHOTOS = 5;
export const MIN_PHOTO_WIDTH = 1024;
export const MIN_PHOTO_HEIGHT = 683;

export const ID_TYPES = [
  { value: 'PASSPORT', label: "Passport" },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
] as const;

export const BED_TYPES = ['Single', 'Double', 'Queen', 'King', 'Twin', 'Bunk', 'Sofa Bed'];

export const ROOM_AMENITIES = [
  'Wi-Fi', 'AC', 'Flat-screen TV', 'Mini-bar', 'Safe', 'Desk',
  'Balcony', 'Kitchenette', 'Hair dryer', 'Coffee maker', 'Bathtub', 'Shower',
];

export function isAddressProofRecent(dateStr: string): boolean {
  if (!dateStr) return false;
  const proofDate = new Date(dateStr);
  if (Number.isNaN(proofDate.getTime())) return false;
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return proofDate >= sixMonthsAgo;
}

export interface RoomTypeConfig {
  name: string;
  bedType: string;
  layout: string;
  amenities: string[];
  pricePerNight?: string;
}

export interface ListingPhoto {
  uri: string;
  category: 'EXTERIOR' | 'ROOM' | 'BATHROOM' | 'OTHER';
  width?: number;
  height?: number;
}
