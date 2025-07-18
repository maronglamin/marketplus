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
  reference: string;
  bankAccountId?: string;
  walletId?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
  bankAccount?: BankAccount;
  wallet?: Wallet;
  includedOrderIds?: string[];
  totalOrdersCount?: number;
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

export interface SettlementDetails {
  settlement: SettlementRequest;
  includedOrders: IncludedOrder[];
}

export interface AvailableRevenue {
  currency: string;
  amount: number;
  currencySymbol: string;
}

export interface SettlementRequestData {
  amount: number;
  currency: string;
  type: 'BANK_TRANSFER' | 'WALLET_TRANSFER';
  bankAccountId?: string;
  walletId?: string;
}

class SettlementService {
  // Get available revenue for settlement
  async getAvailableRevenue(): Promise<AvailableRevenue[]> {
    try {
      const response = await api.get('/api/settlements/available-revenue');
      return response.data.revenues;
    } catch (error: any) {
      console.error('Error fetching available revenue:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else {
        throw new Error('Failed to fetch available revenue');
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

  // Get settlement history
  async getSettlementHistory(page: number = 1, limit: number = 20): Promise<{
    settlements: SettlementRequest[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    try {
      const response = await api.get(`/api/settlements/history?page=${page}&limit=${limit}`);
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