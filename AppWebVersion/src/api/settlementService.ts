import { getApi } from './config';

const api = getApi();

export type SettlementChannel = 'ECOMMERCE' | 'RIDES' | 'RENTALS' | 'REAL_ESTATE' | 'HOME_SERVICES';

export interface BankAccount {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  walletType: 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET';
  walletAddress: string;
  account: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementRequest {
  id: string;
  amount: number;
  currency: string;
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  channel?: SettlementChannel;
  reference: string;
  bankAccount?: BankAccount;
  wallet?: Wallet;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  metadata?: any;
}

export interface AvailableRevenue {
  currency: string;
  amount: number;
  currencySymbol: string;
  orderCount: number;
}

export interface SalesRepRevenue {
  salesRepId: string;
  name: string;
  revenues: AvailableRevenue[];
}

export interface AvailableRevenueResponse {
  parentRevenue: {
    revenues: AvailableRevenue[];
  };
  salesRepRevenue: {
    salesReps: SalesRepRevenue[];
  };
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

export interface SettlementHistoryResponse {
  settlements: SettlementRequest[];
  hasMore: boolean;
  page: number;
  total: number;
}

export interface IncludedOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
}

export interface IncludedPropertyBooking {
  id: string;
  bookingRef: string;
  createdAt: string;
  totalPrice: number;
  currency: string;
  title?: string;
}

export interface SettlementDetailsResponse {
  settlement: SettlementRequest;
  includedOrders: IncludedOrder[];
  includedPropertyBookings?: IncludedPropertyBooking[];
  includedServiceBookings?: IncludedPropertyBooking[];
}

export interface CreateSettlementRequest {
  amount: number;
  currency: string;
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  channel?: SettlementChannel;
  bankAccountId?: string;
  walletId?: string;
  includedPropertyBookingIds?: string[];
  totalPropertyBookingsCount?: number;
  includedServiceBookingIds?: string[];
  totalServiceBookingsCount?: number;
}

export interface CreateBankAccountRequest {
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode?: string;
  branchCode?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  isDefault?: boolean;
}

export interface CreateWalletRequest {
  walletType: 'CRYPTO' | 'MOBILE_MONEY' | 'DIGITAL_WALLET';
  walletAddress: string;
  account: string;
  currency: string;
  isDefault?: boolean;
}

function asArray<T>(data: any, keys: string[]): T[] {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (data && Array.isArray(data[key])) return data[key];
  }
  return [];
}

export class SettlementService {
  async getAvailableRevenue(): Promise<AvailableRevenueResponse> {
    const res = await api.get('/settlements/available-revenue');
    return res.data;
  }

  async getAvailableRealEstateEarnings(): Promise<AvailableRealEstateEarnings[]> {
    const res = await api.get('/settlements/available-real-estate-earnings');
    return res.data?.earnings ?? [];
  }

  async getAvailableHomeServiceEarnings(): Promise<AvailableHomeServiceEarnings[]> {
    const res = await api.get('/settlements/available-home-service-earnings');
    return res.data?.earnings ?? [];
  }

  async getSettlementHistory(
    page: number = 1,
    limit: number = 20,
    channel?: SettlementChannel,
  ): Promise<SettlementHistoryResponse> {
    const params = new URLSearchParams();
    params.append('page', String(page));
    params.append('limit', String(limit));
    if (channel) params.append('channel', channel);
    const res = await api.get(`/settlements/history?${params.toString()}`);
    return res.data;
  }

  async getSettlementDetails(settlementId: string): Promise<SettlementDetailsResponse> {
    const res = await api.get(`/settlements/${settlementId}`);
    return res.data;
  }

  async createSettlementRequest(data: CreateSettlementRequest): Promise<SettlementRequest> {
    const res = await api.post('/settlements/request', data);
    return res.data?.settlement ?? res.data;
  }

  async createSalesRepSettlementRequest(salesRepId: string, data: CreateSettlementRequest): Promise<SettlementRequest> {
    const res = await api.post(`/settlements/request/sales-rep/${salesRepId}`, data);
    return res.data?.settlement ?? res.data;
  }

  async getBankAccounts(): Promise<BankAccount[]> {
    const res = await api.get('/settlements/bank-accounts');
    return asArray<BankAccount>(res.data, ['bankAccounts', 'accounts', 'data']);
  }

  async addBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const res = await api.post('/settlements/bank-accounts', data);
    return res.data?.bankAccount ?? res.data;
  }

  async getWallets(): Promise<Wallet[]> {
    const res = await api.get('/settlements/wallets');
    return asArray<Wallet>(res.data, ['wallets', 'accounts', 'data']);
  }

  async addWallet(data: CreateWalletRequest): Promise<Wallet> {
    const res = await api.post('/settlements/wallets', data);
    return res.data?.wallet ?? res.data;
  }
}

export const settlementService = new SettlementService();
