import { ENV_CONFIG } from '../config/env';
import { getAuthToken } from '../api/auth';

export interface CreateRentalPayload {
  customerId: string;
  rideServiceId: string;
  driverId?: string;
  riderApplicationId?: string;
  pickupAddress: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  startDate: string; // ISO
  endDate: string;   // ISO
  notes?: string;
}

class RentalApi {
  private baseUrl = ENV_CONFIG.API_BASE_URL;

  async createRental(payload: CreateRentalPayload) {
    const token = await getAuthToken();
    const res = await fetch(`${this.baseUrl}/api/rentals`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to create rental');
    }
    const data = await res.json();
    return data.data;
  }

  async getMyRentals(customerId: string, status: string = 'ALL', page: number = 1, limit: number = 10) {
    const token = await getAuthToken();
    const url = new URL(`${this.baseUrl}/api/rentals/customer/${customerId}`);
    if (status) url.searchParams.set('status', status);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', String(limit));

    console.log('RentalApi: Fetching rentals for customer:', customerId, 'status:', status, 'page:', page, 'limit:', limit);
    console.log('RentalApi: URL:', url.toString());

    const res = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    console.log('RentalApi: Response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('RentalApi: Error response:', errorText);
      throw new Error(`Failed to fetch rentals: ${res.status}`);
    }

    const data = await res.json();
    console.log('RentalApi: Response data:', data);
    // data.data = { items, total, page, limit, hasMore }
    return data.data as { items: any[]; total: number; page: number; limit: number; hasMore: boolean };
  }

  async getRentalById(rentalId: string) {
    const token = await getAuthToken();
    
    console.log('RentalApi: Fetching rental details for ID:', rentalId);
    
    const res = await fetch(`${this.baseUrl}/api/rentals/${rentalId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    console.log('RentalApi: Rental details response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('RentalApi: Rental details error response:', errorText);
      throw new Error(`Failed to fetch rental details: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('RentalApi: Rental details response:', data);
    return data.data;
  }

  async getRentalMessages(rentalId: string) {
    const token = await getAuthToken();
    const res = await fetch(`${this.baseUrl}/api/rental-messages/${rentalId}/messages`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch rental messages');
    const data = await res.json();
    return data.data;
  }

  async sendRentalMessage(rentalId: string, content: string) {
    const token = await getAuthToken();
    const res = await fetch(`${this.baseUrl}/api/rental-messages/${rentalId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error('Failed to send rental message');
    const data = await res.json();
    return data.data;
  }

  async getAllNotifications() {
    const token = await getAuthToken();
    const res = await fetch(`${this.baseUrl}/api/rental-messages/notifications/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const data = await res.json();
    return data.data;
  }

  async markRentalMessagesAsRead(rentalId: string) {
    const token = await getAuthToken();
    const res = await fetch(`${this.baseUrl}/api/rental-messages/${rentalId}/messages/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to mark messages as read');
    return res.json();
  }
}

export const rentalApi = new RentalApi();


