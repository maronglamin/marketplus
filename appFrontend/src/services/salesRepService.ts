import { api } from '../api/api'
import { salesRepCache } from '../utils/salesRepCache'

export interface SalesRep {
  id: string
  userId: string
  firstName: string
  lastName: string
  phoneNumber: string
  branchName: string
  branchId: string
  branchLocation?: string
  parentSellerId: string
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
  createdAt: string
  updatedAt: string
  // Inherited KYC details
  inheritedKyc?: {
    businessName: string
    businessType: string
    address: string
    city: string
    state: string
    country: string[]
    postalCode: string
  }
}

export interface CreateSalesRepRequest {
  firstName: string
  lastName: string
  phoneNumber: string
  branchId: string
}

export interface SalesRepStats {
  totalProducts: number
  activeProducts: number
  totalSales: number
  totalRevenue: number
  revenueCurrency: string
  pendingOrders: number
  completedOrders: number
  averageRating: number
  ratingCount: number
}

export interface SalesRepAnalytics {
  salesRepId: string
  salesRepName: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  stats: SalesRepStats
  products: Array<{
    id: string
    title: string
    price: number
    currencyCode: string
    quantity: number
    views: number
    sales: number
  }>
  orders: Array<{
    id: string
    orderNumber: string
    customerName: string
    totalAmount: number
    currencyCode: string
    status: string
    createdAt: string
  }>
  sales: Array<{
    id: string
    productId: string
    productTitle: string
    quantity: number
    unitPrice: number
    totalPrice: number
    currencyCode: string
    orderDate: string
  }>
}

class SalesRepService {
  private baseUrl = '/api/sales-reps'

  async getSalesReps(): Promise<SalesRep[]> {
    try {
      const response = await api.get(`${this.baseUrl}`)
      return response.data
    } catch (error) {
      console.error('Error fetching sales reps:', error)
      throw error
    }
  }

  async getSalesRep(salesRepId: string): Promise<SalesRep> {
    try {
      const response = await api.get(`${this.baseUrl}/${salesRepId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching sales rep:', error)
      throw error
    }
  }

  async getSalesRepByUserId(): Promise<SalesRep> {
    try {
      const response = await api.get(`${this.baseUrl}/by-user`)
      return response.data
    } catch (error) {
      console.error('Error fetching sales rep by user ID:', error)
      throw error
    }
  }

  async getSalesRepStatusCached(userId: string): Promise<{ isSalesRep: boolean; salesRepData: SalesRep | null }> {
    try {
      // Check cache first
      const cachedStatus = await salesRepCache.getSalesRepStatus(userId);
      if (cachedStatus) {
        return cachedStatus;
      }

      // If not in cache, make API call
      try {
        const salesRep = await this.getSalesRepByUserId();
        await salesRepCache.setSalesRepStatus(userId, true, salesRep);
        return { isSalesRep: true, salesRepData: salesRep };
      } catch (error: any) {
        if (error.response?.status === 404) {
          // User is not a sales rep
          await salesRepCache.setSalesRepStatus(userId, false, null);
          return { isSalesRep: false, salesRepData: null };
        }
        throw error;
      }
    } catch (error) {
      console.error('Error getting cached sales rep status:', error);
      // Return default values on error
      return { isSalesRep: false, salesRepData: null };
    }
  }

  async createSalesRep(data: CreateSalesRepRequest): Promise<SalesRep> {
    try {
      const response = await api.post(`${this.baseUrl}`, data)
      return response.data
    } catch (error) {
      console.error('Error creating sales rep:', error)
      throw error
    }
  }

  async updateSalesRep(salesRepId: string, data: Partial<CreateSalesRepRequest>): Promise<SalesRep> {
    try {
      const response = await api.put(`${this.baseUrl}/${salesRepId}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating sales rep:', error)
      throw error
    }
  }

  async deleteSalesRep(salesRepId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${salesRepId}`)
    } catch (error) {
      console.error('Error deleting sales rep:', error)
      throw error
    }
  }

  async getSalesRepStats(salesRepId: string): Promise<SalesRepStats> {
    try {
      const response = await api.get(`${this.baseUrl}/${salesRepId}/stats`)
      return response.data
    } catch (error) {
      console.error('Error fetching sales rep stats:', error)
      throw error
    }
  }

  async getSalesRepAnalytics(
    salesRepId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string
  ): Promise<SalesRepAnalytics> {
    try {
      const params = new URLSearchParams({
        period,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      
      const response = await api.get(`${this.baseUrl}/${salesRepId}/analytics?${params}`)
      return response.data
    } catch (error) {
      console.error('Error fetching sales rep analytics:', error)
      throw error
    }
  }

  async getParentSellerAnalytics(
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalStats: SalesRepStats
    salesReps: Array<{
      salesRepId: string
      salesRepName: string
      stats: SalesRepStats
    }>
    aggregatedData: SalesRepAnalytics
  }> {
    try {
      const params = new URLSearchParams({
        period,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      })
      
      const response = await api.get(`${this.baseUrl}/analytics/parent?${params}`)
      return response.data
    } catch (error) {
      console.error('Error fetching parent seller analytics:', error)
      throw error
    }
  }

  async requestSettlement(amount: number, currencyCode: string, description?: string): Promise<{
    settlementId: string
    status: string
    requestedAmount: number
    currencyCode: string
    createdAt: string
  }> {
    try {
      const response = await api.post(`${this.baseUrl}/settlement/request`, {
        amount,
        currencyCode,
        description,
      })
      return response.data
    } catch (error) {
      console.error('Error requesting settlement:', error)
      throw error
    }
  }

  async getSettlementHistory(): Promise<Array<{
    id: string
    amount: number
    currencyCode: string
    status: string
    requestedAt: string
    processedAt?: string
    description?: string
    notes?: string
  }>> {
    try {
      const response = await api.get(`${this.baseUrl}/settlement/history`)
      return response.data
    } catch (error) {
      console.error('Error fetching settlement history:', error)
      throw error
    }
  }

  async getSettlementDetails(settlementId: string): Promise<{
    id: string
    amount: number
    currencyCode: string
    status: string
    description: string
    requestedAt: string
    processedAt?: string
    processedBy?: string
    notes?: string
    salesRep?: {
      id: string
      name: string
      branchName: string
    }
  }> {
    try {
      const response = await api.get(`${this.baseUrl}/settlement/${settlementId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching settlement details:', error)
      throw error
    }
  }

  async cancelSettlement(settlementId: string): Promise<{
    id: string
    status: string
    message: string
  }> {
    try {
      const response = await api.put(`${this.baseUrl}/settlement/${settlementId}/cancel`)
      return response.data
    } catch (error) {
      console.error('Error cancelling settlement:', error)
      throw error
    }
  }
}

export const salesRepService = new SalesRepService()
