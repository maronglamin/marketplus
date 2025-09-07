import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'

const prisma = new PrismaClient()

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    phoneNumber: string
  }
}

// Get all branches for the authenticated parent seller
export const getBranches = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching branches for parent seller:', { parentSellerId })

    const branches = await prisma.branch.findMany({
      where: { 
        parentSellerId,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    })

    logger.info('Branches fetched successfully:', { count: branches.length })
    res.json(branches)
  } catch (error) {
    logger.error('Error fetching branches:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get a specific branch
export const getBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching branch:', { branchId, parentSellerId })

    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        parentSellerId
      }
    })

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' })
    }

    logger.info('Branch fetched successfully:', { branchId })
    res.json(branch)
  } catch (error) {
    logger.error('Error fetching branch:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create a new branch
export const createBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    const { name, address, city, state, country, postalCode, phoneNumber, email } = req.body

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        error: 'Missing required field: name' 
      })
    }

    logger.info('Creating branch:', { 
      parentSellerId, 
      name, 
      city, 
      state 
    })

    // Check if parent seller has approved KYC
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: { status: true }
    })

    if (!parentKyc || parentKyc.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Parent seller must have approved KYC to create branches' 
      })
    }

    // Create branch
    const branch = await prisma.branch.create({
      data: {
        parentSellerId,
        name,
        address,
        city,
        state,
        country,
        postalCode,
        phoneNumber,
        email,
        isActive: true
      }
    })

    logger.info('Branch created successfully:', { 
      branchId: branch.id, 
      parentSellerId 
    })

    res.status(201).json(branch)
  } catch (error) {
    logger.error('Error creating branch:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update a branch
export const updateBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.params
    const parentSellerId = req.user?.id
    const { name, address, city, state, country, postalCode, phoneNumber, email, isActive } = req.body

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Updating branch:', { branchId, parentSellerId, updates: req.body })

    // Check if branch exists and belongs to the parent seller
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        parentSellerId
      }
    })

    if (!existingBranch) {
      return res.status(404).json({ error: 'Branch not found' })
    }

    // Update branch
    const updatedBranch = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
        ...(postalCode !== undefined && { postalCode }),
        ...(phoneNumber !== undefined && { phoneNumber }),
        ...(email !== undefined && { email }),
        ...(isActive !== undefined && { isActive })
      }
    })

    logger.info('Branch updated successfully:', { branchId })
    res.json(updatedBranch)
  } catch (error) {
    logger.error('Error updating branch:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete a branch (soft delete by setting isActive to false)
export const deleteBranch = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Deleting branch:', { branchId, parentSellerId })

    // Check if branch exists and belongs to the parent seller
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        parentSellerId
      }
    })

    if (!existingBranch) {
      return res.status(404).json({ error: 'Branch not found' })
    }

    // Check if branch has active sales reps
    const activeSalesReps = await prisma.salesRep.count({
      where: {
        branchId,
        status: 'ACTIVE'
      }
    })

    if (activeSalesReps > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete branch with active sales representatives. Please reassign or deactivate them first.' 
      })
    }

    // Soft delete branch
    await prisma.branch.update({
      where: { id: branchId },
      data: { isActive: false }
    })

    logger.info('Branch deleted successfully:', { branchId })
    res.status(204).send()
  } catch (error) {
    logger.error('Error deleting branch:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get branch statistics
export const getBranchStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { branchId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching branch stats:', { branchId, parentSellerId })

    // Verify branch belongs to parent seller
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        parentSellerId
      }
    })

    if (!branch) {
      return res.status(404).json({ error: 'Branch not found' })
    }

    // Get statistics
    const [
      totalSalesReps,
      activeSalesReps,
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      totalRevenue
    ] = await Promise.all([
      prisma.salesRep.count({
        where: { branchId }
      }),
      prisma.salesRep.count({
        where: { 
          branchId,
          status: 'ACTIVE'
        }
      }),
      prisma.product.count({
        where: { branchId }
      }),
      prisma.product.count({
        where: { 
          branchId,
          status: 'ACTIVE'
        }
      }),
      prisma.orders.count({
        where: { branchId }
      }),
      prisma.orders.count({
        where: { 
          branchId,
          status: 'COMPLETED'
        }
      }),
      prisma.orders.aggregate({
        where: { 
          branchId,
          status: 'COMPLETED'
        },
        _sum: {
          totalAmount: true
        }
      })
    ])

    const stats = {
      totalSalesReps,
      activeSalesReps,
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      revenueCurrency: 'USD' // Default currency
    }

    logger.info('Branch stats fetched successfully:', { branchId, stats })
    res.json(stats)
  } catch (error) {
    logger.error('Error fetching branch stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
