import { api } from '../api/api';

export interface Transaction {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  currency: string;
  currencySymbol: string;
  buyerName: string;
  transactionDate: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  orderNumber: string;
}

export interface TransactionHistoryResponse {
  transactions: Transaction[];
  totalRevenue: number;
  totalCount: number;
  refundedCount: number;
  currentPage: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TransactionDetail {
  id: string;
  productTitle: string;
  productDescription: string;
  productImage: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  serviceFeeAmount: number;
  totalAmount: number;
  currencySymbol: string;
  currencyCode: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  transactionDate: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentReference?: string;
  paymentGatewayProvider?: string | null;
  shippingAddress: string;
  billingAddress?: string;
  trackingNumber?: string;
  shippedAt?: string;
  deliveredAt?: string;
  notes?: string;
  sellerNotes?: string;
  shippingMethod?: string;
}

export const transactionService = {
  async getTransactionsByCurrency(
    currency: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<TransactionHistoryResponse> {
    const response = await api.get(`/api/orders/seller/transactions/${currency}`, {
      params: { page, limit }
    });
    return response.data;
  },

  async getTransactionDetail(transactionId: string): Promise<TransactionDetail> {
    const response = await api.get(`/api/orders/seller/transaction/${transactionId}`);
    return response.data;
  },
}; 