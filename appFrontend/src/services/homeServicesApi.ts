import { api } from './api';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface ServiceOffering {
  id: string;
  providerId: string;
  categoryId: string;
  name: string;
  description?: string;
  durationMinutes: number;
  basePrice?: number;
  isActive: boolean;
  sortOrder: number;
  category?: ServiceCategory;
}

export interface WeeklyScheduleEntry {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isEnabled: boolean;
}

export interface AvailableSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface ServiceProvider {
  id: string;
  displayName: string;
  bio?: string;
  serviceDescription?: string;
  profileImageUrl?: string;
  portfolioImages?: string[];
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  rating: number;
  reviewCount: number;
  categories: { category: ServiceCategory }[];
  offerings?: ServiceOffering[];
  user?: { firstName: string; lastName: string; phoneNumber: string };
  application?: {
    experience?: string;
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phoneNumber?: string;
    email?: string;
  };
}

export interface ServiceProviderApplicationPayload {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  bio?: string;
  experience?: string;
}

export interface ServiceBookingPayload {
  providerId: string;
  offeringId: string;
  slotStart: string;
  serviceAddress: string;
  serviceLatitude: number;
  serviceLongitude: number;
  notes?: string;
  categoryId?: string;
  scheduledAt?: string;
}

export interface ServiceBooking {
  id: string;
  bookingRef: string;
  status: string;
  paymentStatus: string;
  slotStatus?: string;
  serviceAddress: string;
  serviceLatitude?: number;
  serviceLongitude?: number;
  scheduledAt?: string;
  slotStart?: string;
  slotEnd?: string;
  notes?: string;
  proposedPrice?: number;
  agreedPrice?: number;
  currency: string;
  category: ServiceCategory;
  offering?: ServiceOffering;
  provider?: ServiceProvider;
  customer?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface ServiceBookingMessage {
  id: string;
  content: string;
  senderType: string;
  senderId: string;
  createdAt: string;
  sender?: { firstName: string; lastName: string };
}

export const homeServicesApi = {
  getCategories: async (): Promise<ServiceCategory[]> => {
    const res = await api.get('/api/service-bookings/categories');
    return res.data?.data ?? [];
  },

  getProviders: async (categoryId?: string): Promise<ServiceProvider[]> => {
    const res = await api.get('/api/service-providers', { params: { categoryId } });
    return res.data?.data ?? [];
  },

  getProvider: async (id: string): Promise<ServiceProvider> => {
    const res = await api.get(`/api/service-providers/${id}`);
    return res.data?.data;
  },

  getAvailableSlots: async (providerId: string, offeringId: string, from: string, to: string): Promise<AvailableSlot[]> => {
    const res = await api.get(`/api/service-providers/${providerId}/available-slots`, {
      params: { offeringId, from, to },
    });
    return res.data?.data ?? [];
  },

  applyAsProvider: async (data: ServiceProviderApplicationPayload) => {
    const res = await api.post('/api/service-providers/apply', data);
    return res.data;
  },

  getMyApplication: async () => {
    const res = await api.get('/api/service-providers/application/me');
    return res.data?.data;
  },

  getMyOfferings: async (): Promise<ServiceOffering[]> => {
    const res = await api.get('/api/service-providers/offerings/mine');
    return res.data?.data ?? [];
  },

  createOffering: async (data: Partial<ServiceOffering>) => {
    const res = await api.post('/api/service-providers/offerings', data);
    return res.data?.data;
  },

  updateOffering: async (id: string, data: Partial<ServiceOffering>) => {
    const res = await api.patch(`/api/service-providers/offerings/${id}`, data);
    return res.data?.data;
  },

  deleteOffering: async (id: string) => {
    await api.delete(`/api/service-providers/offerings/${id}`);
  },

  getMySchedule: async (): Promise<WeeklyScheduleEntry[]> => {
    const res = await api.get('/api/service-providers/schedule/mine');
    return res.data?.data ?? [];
  },

  updateSchedule: async (schedule: WeeklyScheduleEntry[]) => {
    const res = await api.put('/api/service-providers/schedule', { schedule });
    return res.data?.data;
  },

  getBlockedSlots: async () => {
    const res = await api.get('/api/service-providers/blocked-slots/mine');
    return res.data?.data ?? [];
  },

  addBlockedSlot: async (data: { startAt: string; endAt: string; reason?: string }) => {
    const res = await api.post('/api/service-providers/blocked-slots', data);
    return res.data?.data;
  },

  deleteBlockedSlot: async (id: string) => {
    await api.delete(`/api/service-providers/blocked-slots/${id}`);
  },

  createBooking: async (data: ServiceBookingPayload) => {
    const res = await api.post('/api/service-bookings', data);
    return res.data?.data;
  },

  getMyBookings: async (): Promise<ServiceBooking[]> => {
    const res = await api.get('/api/service-bookings/mine');
    return res.data?.data ?? [];
  },

  getBooking: async (id: string): Promise<ServiceBooking> => {
    const res = await api.get(`/api/service-bookings/${id}`);
    return res.data?.data;
  },

  quoteBooking: async (id: string, proposedPrice: number) => {
    const res = await api.patch(`/api/service-bookings/${id}/quote`, { proposedPrice });
    return res.data?.data;
  },

  acceptBooking: async (id: string) => {
    const res = await api.patch(`/api/service-bookings/${id}/accept`);
    return res.data?.data;
  },

  rejectBooking: async (id: string) => {
    const res = await api.patch(`/api/service-bookings/${id}/reject`);
    return res.data?.data;
  },

  completeBooking: async (id: string) => {
    const res = await api.patch(`/api/service-bookings/${id}/complete`);
    return res.data?.data;
  },

  processPayment: async (id: string, paymentMethodId: string, paymentIntentId?: string) => {
    const res = await api.post(`/api/service-bookings/${id}/payment`, { paymentMethodId, paymentIntentId });
    return res.data;
  },

  getMessages: async (bookingId: string): Promise<ServiceBookingMessage[]> => {
    const res = await api.get(`/api/service-bookings/${bookingId}/messages`);
    return res.data?.data ?? [];
  },

  sendMessage: async (bookingId: string, content: string) => {
    const res = await api.post(`/api/service-bookings/${bookingId}/messages`, { content });
    return res.data?.data;
  },

  getProviderDashboard: async (): Promise<ServiceBooking[]> => {
    const res = await api.get('/api/service-bookings/provider/mine');
    return res.data?.data ?? [];
  },

  updateProviderProfile: async (data: {
    bio?: string;
    serviceDescription?: string;
    profileImageUrl?: string;
    portfolioImages?: string[];
    address?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    const res = await api.patch('/api/service-providers/profile', data);
    return res.data?.data;
  },
};
