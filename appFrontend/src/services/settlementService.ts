import { api } from '../api/api';

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  walletType: 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET';
  walletAddress: string;
  account: string; // Phone number of the seller (wallet number)
  currency: string;
  isDefault: boolean;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'BLOCKED';
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRequest {
  id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  channel: 'ECOMMERCE' | 'RIDES';
  reference: string;
  bankAccountId?: string;
  walletId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
  wallet?: Wallet;
  includedOrderIds?: string[];
  includedRideIds?: string[];
  includedRentalIds?: string[];
  totalOrdersCount?: number;
  totalRidesCount?: number;
  totalRentalsCount?: number;
  serviceFeesDeducted?: number;
  netAmountBeforeFees?: number;
  metadata?: any;
}

export interface IncludedOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: number;
  currencyCode: string;
}

export interface IncludedRide {
  id: string;
  rideId: string;
  createdAt: string;
  driverEarnings: number;
  totalFare: number;
  currency: string;
}

export interface IncludedPropertyBooking {
  id: string;
  bookingRef: string;
  createdAt: string;
  totalPrice: number;
  currency: string;
  title?: string;
}

export interface SettlementDetails {
  settlement: SettlementRequest;
  includedOrders: IncludedOrder[];
  includedRides: IncludedRide[];
  includedPropertyBookings?: IncludedPropertyBooking[];
  includedServiceBookings?: IncludedPropertyBooking[];
  includedRentals?: Array<{
    id: string;
    createdAt: string;
    totalAmount: number;
    currency: string;
  }>;
}

export interface AvailableRevenue {
  currency: string;
  amount: number;
  currencySymbol: string;
}

export interface SalesRepRevenue {
  salesRepId: string;
  userId: string;
  name: string;
  revenues: AvailableRevenue[];
  totalAmount: number;
}

export interface AvailableRevenueResponse {
  parentRevenue: {
    revenues: AvailableRevenue[];
    count: number;
  };
  salesRepRevenue: {
    salesReps: SalesRepRevenue[];
    count: number;
  };
}

export interface RideDetail {
  id: string;
  rideId: string;
  requestId?: string;
  driverEarnings: number;
  totalFare: number;
  platformFee: number;
  createdAt: string;
  completedAt: string;
}

export interface AvailableRideEarnings {
  currency: string;
  amount: number;
  currencySymbol: string;
  ridesCount: number;
  rides: RideDetail[];
}

export interface RentalDetail {
  id: string;
  requestId?: string;
  earnings: number;
  createdAt: string;
}

export interface AvailableRentalEarnings {
  currency: string;
  amount: number;
  currencySymbol: string;
  rentalsCount: number;
  rentals: RentalDetail[];
}

export interface PropertyBookingDetail {
  id: string;
  bookingRef?: string;
  title?: string;
  earnings: number;
  createdAt: string;
}

export interface AvailableRealEstateEarnings {
  currency: string;
  amount: number;
  currencySymbol: string;
  bookingsCount: number;
  bookings: PropertyBookingDetail[];
}

export interface ServiceBookingDetail {
  id: string;
  bookingRef?: string;
  title?: string;
  earnings: number;
  createdAt: string;
}

export interface AvailableHomeServiceEarnings {
  currency: string;
  amount: number;
  currencySymbol: string;
  bookingsCount: number;
  bookings: ServiceBookingDetail[];
}

export interface SettlementRequestData {
  amount: number;
  currency: string;
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  channel?: 'ECOMMERCE' | 'RIDES' | 'RENTALS' | 'REAL_ESTATE' | 'HOME_SERVICES';
  bankAccountId?: string;
  walletId?: string;
  includedRideIds?: string[];
  totalRidesCount?: number;
  includedRentalIds?: string[];
  totalRentalsCount?: number;
  includedPropertyBookingIds?: string[];
  totalPropertyBookingsCount?: number;
  includedServiceBookingIds?: string[];
  totalServiceBookingsCount?: number;
}

class SettlementService {
  // Get available revenue for settlement (ecommerce)
  async getAvailableRevenue(): Promise<AvailableRevenueResponse> {
    try {
      const response = await api.get('/api/settlements/available-revenue');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching available revenue:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available revenue');
      }
    }
  }

  // Get available ride earnings for settlement (rides)
  async getAvailableRideEarnings(): Promise<AvailableRideEarnings[]> {
    try {
      const response = await api.get('/api/settlements/available-ride-earnings');
      return response.data.earnings;
    } catch (error: any) {
      console.error('Error fetching available ride earnings:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available ride earnings');
      }
    }
  }

  // Get available rental earnings for settlement (rentals)
  async getAvailableRentalEarnings(): Promise<AvailableRentalEarnings[]> {
    try {
      const response = await api.get('/api/settlements/available-rental-earnings');
      return response.data.earnings;
    } catch (error: any) {
      console.error('Error fetching available rental earnings:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available rental earnings');
      }
    }
  }

  // Get available real estate earnings for settlement (property agents)
  async getAvailableRealEstateEarnings(): Promise<AvailableRealEstateEarnings[]> {
    try {
      const response = await api.get('/api/settlements/available-real-estate-earnings');
      return response.data.earnings ?? [];
    } catch (error: any) {
      console.error('Error fetching available real estate earnings:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available real estate earnings');
      }
    }
  }

  // Get available home service earnings for settlement (service providers)
  async getAvailableHomeServiceEarnings(): Promise<AvailableHomeServiceEarnings[]> {
    try {
      const response = await api.get('/api/settlements/available-home-service-earnings');
      return response.data.earnings ?? [];
    } catch (error: any) {
      console.error('Error fetching available home service earnings:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available home service earnings');
      }
    }
  }

  // Get seller's bank accounts
  async getBankAccounts(): Promise<BankAccount[]> {
    try {
      const response = await api.get('/api/settlements/bank-accounts');
      return response.data.bankAccounts;
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch bank accounts');
      }
    }
  }

  // Get seller's wallets
  async getWallets(): Promise<Wallet[]> {
    try {
      const response = await api.get('/api/settlements/wallets');
      return response.data.wallets;
    } catch (error: any) {
      console.error('Error fetching wallets:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch wallets');
      }
    }
  }

  // Create bank account
  async addBankAccount(bankAccountData: {
    accountName: string;
    accountNumber: string;
    bankName: string;
    bankCode?: string;
    branchCode?: string;
    swiftCode?: string;
    iban?: string;
    currency: string;
    isDefault?: boolean;
  }): Promise<BankAccount> {
    try {
      const response = await api.post('/api/settlements/bank-accounts', bankAccountData);
      return response.data.bankAccount;
    } catch (error: any) {
      console.error('Error adding bank account:', error);
      throw new Error(error.response?.data?.message || 'Failed to add bank account');
    }
  }

  // Create wallet
  async addWallet(walletData: {
    walletType: 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET';
    walletAddress: string;
    account: string; // Phone number of the seller (wallet number)
    currency: string;
    isDefault?: boolean;
  }): Promise<Wallet> {
    try {
      const response = await api.post('/api/settlements/wallets', walletData);
      return response.data.wallet;
    } catch (error: any) {
      console.error('Error adding wallet:', error);
      throw new Error(error.response?.data?.message || 'Failed to add wallet');
    }
  }

  // Create settlement request
  async createSettlementRequest(data: SettlementRequestData): Promise<SettlementRequest> {
    try {
      const response = await api.post('/api/settlements/request', data);
      return response.data.settlement;
    } catch (error: any) {
      console.error('Error creating settlement request:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to create settlement request');
      }
    }
  }

  // Create settlement request for specific sales rep
  async createSalesRepSettlementRequest(salesRepId: string, data: SettlementRequestData): Promise<SettlementRequest> {
    try {
      const response = await api.post(`/api/settlements/request/sales-rep/${salesRepId}`, data);
      return response.data.settlement;
    } catch (error: any) {
      console.error('Error creating sales rep settlement request:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to create sales rep settlement request');
      }
    }
  }

  // Get settlement history
  async getSettlementHistory(page: number = 1, limit: number = 20, channel?: 'ECOMMERCE' | 'RIDES' | 'RENTALS' | 'REAL_ESTATE' | 'HOME_SERVICES', period?: 'today' | 'week' | 'month' | 'all'): Promise<{
    settlements: SettlementRequest[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (channel) {
        params.append('channel', channel);
      }
      if (period) {
        params.append('period', period);
      }
      
      const response = await api.get(`/api/settlements/history?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching settlement history:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch settlement history');
      }
    }
  }

  // Get settlement details with included orders
  async getSettlementDetails(settlementId: string): Promise<SettlementDetails> {
    try {
      const response = await api.get(`/api/settlements/${settlementId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching settlement details:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch settlement details');
      }
    }
  }
}

export const settlementService = new SettlementService(); 