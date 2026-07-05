import { uploadService } from '../api/upload';

export const MIN_HOTEL_PHOTOS = 5;
export const MIN_PHOTO_WIDTH = 1024;
export const MIN_PHOTO_HEIGHT = 683;

export const ID_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
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
  file?: File;
  url?: string;
  category: 'EXTERIOR' | 'ROOM' | 'BATHROOM' | 'OTHER';
  width?: number;
  height?: number;
}

export async function uploadDocumentFile(file: File): Promise<string> {
  return uploadService.uploadImage(file);
}

export function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}
