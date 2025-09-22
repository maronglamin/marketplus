import { getApi } from './config';
import { CurrencyRevenue } from '../types/transaction';

const api = getApi();

export interface Transaction {
  id: string;
  orderNumber: string;
  productTitle: string;
  productImage?: string;
  buyerName: string;
  totalAmount: number;
  unitPrice: number;
  quantity: number;
  currency: string;
  currencySymbol: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  transactionDate: string;
  // Optional fields that might not be in the basic response
  buyerEmail?: string;
  buyerPhone?: string;
  paymentMethod?: string;
  paymentReference?: string;
  shippingAddress?: string;
  shippingMethod?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface TransactionDetail extends Transaction {
  productDescription: string;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  serviceFeeAmount: number;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  totalRevenue: number;
  hasMore: boolean;
  currentPage: number;
  totalPages: number;
  totalCount: number;
  refundedCount: number;
}

export interface TransactionDetailResponse {
  transaction: TransactionDetail;
}


export class TransactionService {

  /**
   * Get transactions by currency
   */
  async getTransactionsByCurrency(currency: string, page: number = 1, limit: number = 20): Promise<TransactionsResponse> {
    const url = `/orders/seller/transactions/${currency}`;
    console.log('Making API call to:', url);
    const res = await api.get(url, {
      params: { page, limit }
    });
    return res.data;
  }

  /**
   * Get all transactions for seller
   */
  async getSellerTransactions(page: number = 1, limit: number = 20): Promise<TransactionsResponse> {
    const res = await api.get(`/transactions/seller?page=${page}&limit=${limit}`);
    return res.data;
  }

  /**
   * Get transaction details by ID
   */
  async getTransactionDetail(transactionId: string): Promise<TransactionDetail> {
    const res = await api.get(`/orders/seller/transaction/${transactionId}`);
    return res.data;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(): Promise<{
    totalTransactions: number;
    totalRevenue: number;
    revenueByCurrency: Array<{
      currency: string;
      amount: number;
      percentage: number;
    }>;
  }> {
    const res = await api.get('/transactions/stats');
    return res.data;
  }
}

// Transaction service instance
export const transactionService = new TransactionService();
