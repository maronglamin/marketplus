import { getApi } from './config';

const api = getApi();

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

export interface SettlementHistoryResponse {
  settlements: SettlementRequest[];
  hasMore: boolean;
  page: number;
  total: number;
}

export interface SettlementDetailsResponse {
  settlement: SettlementRequest;
  includedOrders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: number;
    currencyCode: string;
    createdAt: string;
  }>;
}

export interface CreateSettlementRequest {
  amount: number;
  currency: string;
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  bankAccountId?: string;
  walletId?: string;
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

export interface IncludedOrder {
  id: string;
  orderNumber: string;
  totalAmount: number;
  currencyCode: string;
  createdAt: string;
}

export class SettlementService {
  /**
   * Get available revenue for settlement
   */
  async getAvailableRevenue(): Promise<AvailableRevenueResponse> {
    const res = await api.get('/settlements/available-revenue');
    return res.data;
  }

  /**
   * Get settlement history
   */
  async getSettlementHistory(page: number = 1, limit: number = 20): Promise<SettlementHistoryResponse> {
    const res = await api.get(`/settlements/history?page=${page}&limit=${limit}`);
    return res.data;
  }

  /**
   * Get settlement details
   */
  async getSettlementDetails(settlementId: string): Promise<SettlementDetailsResponse> {
    const res = await api.get(`/settlements/${settlementId}`);
    return res.data;
  }

  /**
   * Create settlement request
   */
  async createSettlementRequest(data: CreateSettlementRequest): Promise<SettlementRequest> {
    const res = await api.post('/settlements/request', data);
    return res.data;
  }

  /**
   * Create sales rep settlement request
   */
  async createSalesRepSettlementRequest(salesRepId: string, data: CreateSettlementRequest): Promise<SettlementRequest> {
    const res = await api.post(`/settlements/request/sales-rep/${salesRepId}`, data);
    return res.data;
  }

  /**
   * Get bank accounts
   */
  async getBankAccounts(): Promise<BankAccount[]> {
    const res = await api.get('/settlements/bank-accounts');
    return res.data;
  }

  /**
   * Add bank account
   */
  async addBankAccount(data: CreateBankAccountRequest): Promise<BankAccount> {
    const res = await api.post('/settlements/bank-accounts', data);
    return res.data;
  }

  /**
   * Get wallets
   */
  async getWallets(): Promise<Wallet[]> {
    const res = await api.get('/settlements/wallets');
    return res.data;
  }

  /**
   * Add wallet
   */
  async addWallet(data: CreateWalletRequest): Promise<Wallet> {
    const res = await api.post('/settlements/wallets', data);
    return res.data;
  }
}

export const settlementService = new SettlementService();
