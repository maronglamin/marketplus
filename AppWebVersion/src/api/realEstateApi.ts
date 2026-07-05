import { getApi } from './config';

export type PropertyListingType = 'HOTEL' | 'APARTMENT_RENTAL' | 'HOME_SALE' | 'LAND_SALE';
export type PropertyTourType = 'MATTERPORT' | 'YOUTUBE' | 'EXTERNAL_URL' | 'IMAGE_GALLERY';
export type PropertyImageCategory = 'EXTERIOR' | 'ROOM' | 'BATHROOM' | 'OTHER';

export interface PropertyAgentApplicationPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  companyName?: string;
  licenseNumber?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  specializationTypes: PropertyListingType[];
  bio?: string;
  idType: string;
  idNumber: string;
  idDocumentUrl: string;
  businessRegistrationNumber: string;
  businessRegistrationDocUrl: string;
  taxIdentificationNumber?: string;
  addressProofUrl: string;
  addressProofDate: string;
  bankingInfo: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    bankBranch?: string;
  };
}

export interface PropertyListingPayload {
  title: string;
  description?: string;
  listingType: PropertyListingType;
  price: number | string;
  currency?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  amenities?: string[];
  images?: Array<{ url: string; category?: string; width?: number; height?: number }>;
  virtualTours?: Array<{ tourType: string; tourUrl: string; title?: string }>;
}

export interface StaySummary {
  checkIn: string;
  checkOut: string;
  nights: number;
  availableRoomTypes: number;
  nightSlots: { date: string; available: boolean }[];
}

export interface PropertyRoomType {
  id: string;
  listingId: string;
  name: string;
  description?: string;
  bedType?: string;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  unitsAvailable: number;
  pricePerNight: number;
  amenities?: string[];
  photos?: string[];
  sortOrder: number;
  isActive: boolean;
  unitsLeft?: number;
  available?: boolean;
}

export interface PropertyImage {
  id: string;
  url: string;
  sortOrder: number;
  category?: PropertyImageCategory;
  width?: number;
  height?: number;
}

export interface PropertyVirtualTour {
  id: string;
  tourType: PropertyTourType;
  tourUrl: string;
  title?: string;
}

export interface PropertyListing {
  id: string;
  title: string;
  description?: string;
  listingType: PropertyListingType;
  price: number;
  currency: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  areaSqm?: number;
  amenities?: string[];
  roomTypes?: Array<{ name: string; bedType: string; layout: string; amenities: string[]; pricePerNight?: number }>;
  roomTypesRel?: PropertyRoomType[];
  status: string;
  images: PropertyImage[];
  virtualTours: PropertyVirtualTour[];
  fromPrice?: number;
  agent?: { displayName: string; companyName?: string; user?: { phoneNumber: string } };
  _count?: { bookings: number };
}

export interface GuestSelection {
  adults: number;
  children: number;
  childAges: number[];
}

export interface PropertyBookingPayload {
  listingId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  childAges?: number[];
  roomTypeId?: string;
  roomsBooked?: number;
  notes?: string;
}

export interface PropertyBooking {
  id: string;
  bookingRef: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  adults: number;
  children: number;
  childAges?: number[];
  roomsBooked: number;
  nights: number;
  totalPrice: number;
  currency: string;
  status: string;
  paymentStatus: string;
  listing: PropertyListing;
  roomType?: PropertyRoomType;
  customer?: { firstName: string; lastName: string; phoneNumber?: string };
  createdAt: string;
}

export interface PropertyInquiry {
  id: string;
  message: string;
  preferredDate?: string;
  status: string;
  listing: PropertyListing;
  customer?: { firstName: string; lastName: string; phoneNumber?: string };
  createdAt: string;
}

export interface PropertyBlockedDate {
  id: string;
  listingId: string;
  roomTypeId?: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export const realEstateApi = {
  getListings: async (params?: {
    listingType?: PropertyListingType;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }): Promise<PropertyListing[]> => {
    const res = await getApi().get('/property-listings', { params });
    return res.data?.data ?? [];
  },

  searchListings: async (params: {
    listingType?: PropertyListingType;
    city?: string;
    checkIn?: string;
    checkOut?: string;
    adults?: number;
    children?: number;
  }): Promise<PropertyListing[]> => {
    const res = await getApi().get('/property-listings/search', { params });
    return res.data?.data ?? [];
  },

  getFeatured: async (limit = 6): Promise<PropertyListing[]> => {
    const res = await getApi().get('/property-listings/featured', { params: { limit } });
    return res.data?.data ?? [];
  },

  getListing: async (id: string): Promise<PropertyListing> => {
    const res = await getApi().get(`/property-listings/${id}`);
    return res.data?.data;
  },

  getAvailability: async (listingId: string, params: {
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
  }) => {
    const res = await getApi().get(`/property-listings/${listingId}/availability`, { params });
    return res.data?.data as { listing: PropertyListing; roomTypes: PropertyRoomType[]; staySummary?: StaySummary };
  },

  applyAsAgent: async (data: PropertyAgentApplicationPayload) => {
    const res = await getApi().post('/property-agents/apply', data);
    return res.data;
  },

  getMyApplication: async () => {
    const res = await getApi().get('/property-agents/application/me');
    return res.data?.data;
  },

  createListing: async (data: PropertyListingPayload) => {
    const res = await getApi().post('/property-listings', data);
    return res.data?.data;
  },

  updateListing: async (id: string, data: Partial<PropertyListingPayload & { status: string }>) => {
    const res = await getApi().patch(`/property-listings/${id}`, data);
    return res.data?.data;
  },

  publishListing: async (id: string): Promise<PropertyListing> => {
    const res = await getApi().post(`/property-listings/${id}/publish`);
    return res.data?.data;
  },

  deactivateListing: async (id: string) => {
    await getApi().delete(`/property-listings/${id}`);
  },

  getMyListings: async (): Promise<PropertyListing[]> => {
    const res = await getApi().get('/property-listings/agent/mine');
    return res.data?.data ?? [];
  },

  getRoomTypes: async (listingId: string): Promise<PropertyRoomType[]> => {
    const res = await getApi().get(`/property-listings/${listingId}/room-types`);
    return res.data?.data ?? [];
  },

  createRoomType: async (listingId: string, data: Partial<PropertyRoomType>) => {
    const res = await getApi().post(`/property-listings/${listingId}/room-types`, data);
    return res.data?.data;
  },

  updateRoomType: async (listingId: string, roomTypeId: string, data: Partial<PropertyRoomType>) => {
    const res = await getApi().patch(`/property-listings/${listingId}/room-types/${roomTypeId}`, data);
    return res.data?.data;
  },

  deleteRoomType: async (listingId: string, roomTypeId: string) => {
    await getApi().delete(`/property-listings/${listingId}/room-types/${roomTypeId}`);
  },

  getBlockedDates: async (listingId: string): Promise<PropertyBlockedDate[]> => {
    const res = await getApi().get(`/property-listings/${listingId}/blocked-dates`);
    return res.data?.data ?? [];
  },

  addBlockedDate: async (listingId: string, data: { startDate: string; endDate: string; roomTypeId?: string; reason?: string }) => {
    const res = await getApi().post(`/property-listings/${listingId}/blocked-dates`, data);
    return res.data?.data;
  },

  deleteBlockedDate: async (listingId: string, blockId: string) => {
    await getApi().delete(`/property-listings/${listingId}/blocked-dates/${blockId}`);
  },

  createBooking: async (data: PropertyBookingPayload) => {
    const res = await getApi().post('/property-bookings', data);
    return res.data?.data;
  },

  createInquiry: async (data: Record<string, unknown>) => {
    const res = await getApi().post('/property-bookings/inquiries', data);
    return res.data?.data;
  },

  getMyBookings: async (): Promise<PropertyBooking[]> => {
    const res = await getApi().get('/property-bookings/mine');
    return res.data?.data ?? [];
  },

  getAgentInbox: async (): Promise<{ bookings: PropertyBooking[]; inquiries: PropertyInquiry[] }> => {
    const res = await getApi().get('/property-bookings/agent/mine');
    return res.data?.data;
  },

  updateBookingStatus: async (id: string, status: string) => {
    const res = await getApi().patch(`/property-bookings/${id}/status`, { status });
    return res.data?.data;
  },

  getMyInquiries: async (): Promise<PropertyInquiry[]> => {
    const res = await getApi().get('/property-bookings/inquiries/mine');
    return res.data?.data ?? [];
  },

  getBooking: async (id: string): Promise<PropertyBooking> => {
    const res = await getApi().get(`/property-bookings/${id}`);
    return res.data?.data;
  },

  processPayment: async (id: string, paymentMethodId: string, paymentIntentId?: string) => {
    const res = await getApi().post(`/property-bookings/${id}/payment`, { paymentMethodId, paymentIntentId });
    return res.data;
  },
};
