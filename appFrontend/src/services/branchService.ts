import { api } from '../api/api'

export interface Branch {
  id: string
  parentSellerId: string
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  phoneNumber?: string
  email?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateBranchRequest {
  name: string
  address?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
  phoneNumber?: string
  email?: string
}

export interface BranchStats {
  totalSalesReps: number
  activeSalesReps: number
  totalProducts: number
  activeProducts: number
  totalOrders: number
  completedOrders: number
  totalRevenue: number
  revenueCurrency: string
}

class BranchService {
  private baseUrl = '/api/branches'

  async getBranches(): Promise<Branch[]> {
    try {
      const response = await api.get(`${this.baseUrl}`)
      return response.data
    } catch (error) {
      console.error('Error fetching branches:', error)
      throw error
    }
  }

  async getBranch(branchId: string): Promise<Branch> {
    try {
      const response = await api.get(`${this.baseUrl}/${branchId}`)
      return response.data
    } catch (error) {
      console.error('Error fetching branch:', error)
      throw error
    }
  }

  async createBranch(data: CreateBranchRequest): Promise<Branch> {
    try {
      const response = await api.post(`${this.baseUrl}`, data)
      return response.data
    } catch (error) {
      console.error('Error creating branch:', error)
      throw error
    }
  }

  async updateBranch(branchId: string, data: Partial<CreateBranchRequest>): Promise<Branch> {
    try {
      const response = await api.put(`${this.baseUrl}/${branchId}`, data)
      return response.data
    } catch (error) {
      console.error('Error updating branch:', error)
      throw error
    }
  }

  async deleteBranch(branchId: string): Promise<void> {
    try {
      await api.delete(`${this.baseUrl}/${branchId}`)
    } catch (error) {
      console.error('Error deleting branch:', error)
      throw error
    }
  }

  async getBranchStats(branchId: string): Promise<BranchStats> {
    try {
      const response = await api.get(`${this.baseUrl}/${branchId}/stats`)
      return response.data
    } catch (error) {
      console.error('Error fetching branch stats:', error)
      throw error
    }
  }
}

export const branchService = new BranchService()
