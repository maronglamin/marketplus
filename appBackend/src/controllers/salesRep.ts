import { Request, Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { logger } from '../utils/logger'
import { hashPin } from '../utils/pin'

const prisma = new PrismaClient()

interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    phoneNumber: string
  }
}

// Get all sales reps for the authenticated parent seller
export const getSalesReps = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching sales reps for parent seller:', { parentSellerId })

    // First, let's check if there are any sales reps in the database at all
    const allSalesReps = await prisma.salesRep.findMany({
      select: {
        id: true,
        userId: true,
        parentSellerId: true,
        status: true
      }
    })
    
    logger.info('All sales reps in database:', { 
      totalCount: allSalesReps.length,
      salesReps: allSalesReps.map(rep => ({
        id: rep.id,
        userId: rep.userId,
        parentSellerId: rep.parentSellerId,
        status: rep.status
      }))
    })

    const salesReps = await prisma.salesRep.findMany({
      where: { parentSellerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    logger.info('Sales reps found for parent seller:', { 
      parentSellerId, 
      count: salesReps.length,
      salesReps: salesReps.map(rep => ({
        id: rep.id,
        userId: rep.userId,
        firstName: rep.user.firstName,
        lastName: rep.user.lastName,
        branchName: rep.branch.name
      }))
    })

    // Transform the data to include user info in the response
    const transformedSalesReps = salesReps.map(rep => ({
      id: rep.id,
      userId: rep.userId,
      parentSellerId: rep.parentSellerId,  // ✅ Add missing parentSellerId field
      firstName: rep.user.firstName,
      lastName: rep.user.lastName,
      phoneNumber: rep.user.phoneNumber,
      branchName: rep.branch.name,
      branchId: rep.branch.id,
      branchLocation: `${rep.branch.city || ''}${rep.branch.city && rep.branch.state ? ', ' : ''}${rep.branch.state || ''}`,
      status: rep.status,
      createdAt: rep.createdAt,
      updatedAt: rep.updatedAt,
      // Inherited KYC details from parent seller
      inheritedKyc: {
        businessName: '', // Will be populated from parent seller's KYC
        businessType: '',
        address: '',
        city: '',
        state: '',
        country: [],
        postalCode: ''
      }
    }))

    // Get parent seller's KYC details to include in response
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: {
        businessName: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true
      }
    })

    // Add inherited KYC details to each sales rep
    if (parentKyc) {
      transformedSalesReps.forEach(rep => {
        rep.inheritedKyc = {
          businessName: parentKyc.businessName,
          businessType: parentKyc.businessType,
          address: parentKyc.address,
          city: parentKyc.city,
          state: parentKyc.state,
          country: Array.isArray(parentKyc.country) ? parentKyc.country : [parentKyc.country],
          postalCode: parentKyc.postalCode
        }
      })
    }

    logger.info('Sales reps fetched successfully:', { count: transformedSalesReps.length })
    res.json(transformedSalesReps)
  } catch (error) {
    logger.error('Error fetching sales reps:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get a specific sales rep
export const getSalesRep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { salesRepId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching sales rep:', { salesRepId, parentSellerId })

    const salesRep = await prisma.salesRep.findFirst({
      where: {
        id: salesRepId,
        parentSellerId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    })

    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Get parent seller's KYC details
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: {
        businessName: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true
      }
    })

    const transformedSalesRep = {
      id: salesRep.id,
      userId: salesRep.userId,
      parentSellerId: salesRep.parentSellerId,
      firstName: salesRep.user.firstName,
      lastName: salesRep.user.lastName,
      phoneNumber: salesRep.user.phoneNumber,
      branchName: salesRep.branch.name,
      branchId: salesRep.branch.id,
      branchLocation: `${salesRep.branch.city || ''}${salesRep.branch.city && salesRep.branch.state ? ', ' : ''}${salesRep.branch.state || ''}`,
      status: salesRep.status,
      createdAt: salesRep.createdAt,
      updatedAt: salesRep.updatedAt,
      inheritedKyc: parentKyc ? {
        businessName: parentKyc.businessName,
        businessType: parentKyc.businessType,
        address: parentKyc.address,
        city: parentKyc.city,
        state: parentKyc.state,
        country: Array.isArray(parentKyc.country) ? parentKyc.country : [parentKyc.country],
        postalCode: parentKyc.postalCode
      } : null
    }

    logger.info('Sales rep fetched successfully:', { salesRepId })
    res.json(transformedSalesRep)
  } catch (error) {
    logger.error('Error fetching sales rep:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get sales rep by user ID (for checking if current user is a sales rep)
export const getSalesRepByUserId = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching sales rep by user ID:', { userId })

    const salesRep = await prisma.salesRep.findFirst({
      where: {
        userId: userId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    })

    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Get parent seller's KYC details
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: salesRep.parentSellerId },
      select: {
        businessName: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true
      }
    })

    // Transform the data to include user info in the response
    const transformedSalesRep = {
      id: salesRep.id,
      userId: salesRep.userId,
      parentSellerId: salesRep.parentSellerId,
      firstName: salesRep.user.firstName,
      lastName: salesRep.user.lastName,
      phoneNumber: salesRep.user.phoneNumber,
      branchName: salesRep.branch.name,
      branchId: salesRep.branch.id,
      branchLocation: `${salesRep.branch.city || ''}${salesRep.branch.city && salesRep.branch.state ? ', ' : ''}${salesRep.branch.state || ''}`,
      status: salesRep.status,
      createdAt: salesRep.createdAt,
      updatedAt: salesRep.updatedAt,
      // Inherited KYC details from parent seller
      inheritedKyc: parentKyc ? {
        businessName: parentKyc.businessName,
        businessType: parentKyc.businessType,
        address: parentKyc.address,
        city: parentKyc.city,
        state: parentKyc.state,
        country: Array.isArray(parentKyc.country) ? parentKyc.country : [parentKyc.country],
        postalCode: parentKyc.postalCode
      } : null
    }

    logger.info('Sales rep fetched successfully by user ID:', { userId })
    res.json(transformedSalesRep)
  } catch (error) {
    logger.error('Error fetching sales rep by user ID:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Create a new sales rep
export const createSalesRep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { firstName, lastName, phoneNumber, email, branchId, pin } = req.body

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !branchId || !pin) {
      return res.status(400).json({ 
        error: 'Missing required fields: firstName, lastName, phoneNumber, branchId, pin' 
      })
    }

    // Validate PIN format (4 digits only)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ 
        error: 'PIN must be exactly 4 digits' 
      })
    }

    logger.info('Creating sales rep:', { 
      parentSellerId, 
      firstName, 
      lastName, 
      phoneNumber, 
      branchId 
    })

    // Check if parent seller has approved KYC
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: { status: true }
    })

    if (!parentKyc || parentKyc.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Parent seller must have approved KYC to create sales reps' 
      })
    }

    // Check if branch belongs to parent seller
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        parentSellerId,
        isActive: true
      }
    })

    if (!branch) {
      return res.status(400).json({ 
        error: 'Branch not found or does not belong to parent seller' 
      })
    }

    // Check if user with this phone number already exists
    const existingUser = await prisma.user.findUnique({
      where: { phoneNumber }
    })

    let userId: string

    if (existingUser) {
      // Check if this user is already a sales rep for any seller
      const existingSalesRep = await prisma.salesRep.findUnique({
        where: { userId: existingUser.id }
      })

      if (existingSalesRep) {
        return res.status(400).json({ 
          error: 'User is already a sales representative for another seller' 
        })
      }

      // Check if this user is already a parent seller (has Seller KYC)
      const existingSellerKyc = await prisma.sellerKyc.findUnique({
        where: { userId: existingUser.id }
      })

      if (existingSellerKyc) {
        return res.status(400).json({
          error: 'User already has Seller KYC and cannot be added as a sales representative'
        })
      }

      userId = existingUser.id
    } else {
      // Hash the PIN before storing
      const hashedPin = await hashPin(pin)
      
      // Create new user for the sales rep
      const newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          phoneNumber,
          pin: hashedPin, // Hashed PIN for security
        }
      })
      userId = newUser.id
    }

    // Create sales rep record
    const salesRep = await prisma.salesRep.create({
      data: {
        userId,
        parentSellerId,
        branchId,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    })

    // Get parent seller's KYC details for response
    const parentKycDetails = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: {
        businessName: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true
      }
    })

    const transformedSalesRep = {
      id: salesRep.id,
      userId: salesRep.userId,
      firstName: salesRep.user.firstName,
      lastName: salesRep.user.lastName,
      phoneNumber: salesRep.user.phoneNumber,
      branchName: salesRep.branch.name,
      branchId: salesRep.branch.id,
      branchLocation: `${salesRep.branch.city || ''}${salesRep.branch.city && salesRep.branch.state ? ', ' : ''}${salesRep.branch.state || ''}`,
      status: salesRep.status,
      createdAt: salesRep.createdAt,
      updatedAt: salesRep.updatedAt,
      inheritedKyc: parentKycDetails ? {
        businessName: parentKycDetails.businessName,
        businessType: parentKycDetails.businessType,
        address: parentKycDetails.address,
        city: parentKycDetails.city,
        state: parentKycDetails.state,
        country: parentKycDetails.country,
        postalCode: parentKycDetails.postalCode
      } : null
    }

    logger.info('Sales rep created successfully:', { 
      salesRepId: salesRep.id, 
      userId: salesRep.userId 
    })

    res.status(201).json(transformedSalesRep)
  } catch (error) {
    logger.error('Error creating sales rep:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Update a sales rep
export const updateSalesRep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { salesRepId } = req.params
    const parentSellerId = req.user?.id
    const { branchName, branchId, status } = req.body

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Updating sales rep:', { salesRepId, parentSellerId, updates: req.body })

    // Check if sales rep exists and belongs to the parent seller
    const existingSalesRep = await prisma.salesRep.findFirst({
      where: {
        id: salesRepId,
        parentSellerId
      }
    })

    if (!existingSalesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Update sales rep
    const updatedSalesRep = await prisma.salesRep.update({
      where: { id: salesRepId },
      data: {
        ...(branchName && { branchName }),
        ...(branchId && { branchId }),
        ...(status && { status })
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true
          }
        }
      }
    })

    // Get parent seller's KYC details
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: {
        businessName: true,
        businessType: true,
        address: true,
        city: true,
        state: true,
        country: true,
        postalCode: true
      }
    })

    const transformedSalesRep = {
      id: updatedSalesRep.id,
      userId: updatedSalesRep.userId,
      firstName: updatedSalesRep.user.firstName,
      lastName: updatedSalesRep.user.lastName,
      phoneNumber: updatedSalesRep.user.phoneNumber,
      branchName: updatedSalesRep.branch.name,
      branchId: updatedSalesRep.branch.id,
      branchLocation: `${updatedSalesRep.branch.city || ''}${updatedSalesRep.branch.city && updatedSalesRep.branch.state ? ', ' : ''}${updatedSalesRep.branch.state || ''}`,
      status: updatedSalesRep.status,
      createdAt: updatedSalesRep.createdAt,
      updatedAt: updatedSalesRep.updatedAt,
      inheritedKyc: parentKyc ? {
        businessName: parentKyc.businessName,
        businessType: parentKyc.businessType,
        address: parentKyc.address,
        city: parentKyc.city,
        state: parentKyc.state,
        country: Array.isArray(parentKyc.country) ? parentKyc.country : [parentKyc.country],
        postalCode: parentKyc.postalCode
      } : null
    }

    logger.info('Sales rep updated successfully:', { salesRepId })
    res.json(transformedSalesRep)
  } catch (error) {
    logger.error('Error updating sales rep:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Delete a sales rep
export const deleteSalesRep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { salesRepId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Deleting sales rep:', { salesRepId, parentSellerId })

    // Check if sales rep exists and belongs to the parent seller
    const existingSalesRep = await prisma.salesRep.findFirst({
      where: {
        id: salesRepId,
        parentSellerId
      }
    })

    if (!existingSalesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Delete sales rep (this will cascade to related records)
    await prisma.salesRep.delete({
      where: { id: salesRepId }
    })

    logger.info('Sales rep deleted successfully:', { salesRepId })
    res.status(204).send()
  } catch (error) {
    logger.error('Error deleting sales rep:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get sales rep statistics
export const getSalesRepStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { salesRepId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching sales rep stats:', { salesRepId, parentSellerId })

    // Verify sales rep belongs to parent seller
    const salesRep = await prisma.salesRep.findFirst({
      where: {
        id: salesRepId,
        parentSellerId
      }
    })

    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Get statistics
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      totalRevenue
    ] = await Promise.all([
      prisma.product.count({
        where: { salesRepId }
      }),
      prisma.product.count({
        where: { 
          salesRepId,
          status: 'ACTIVE'
        }
      }),
      prisma.orders.count({
        where: { salesRepId }
      }),
      prisma.orders.count({
        where: { 
          salesRepId,
          status: 'COMPLETED'
        }
      }),
      prisma.orders.aggregate({
        where: { 
          salesRepId,
          status: 'COMPLETED'
        },
        _sum: {
          totalAmount: true
        }
      })
    ])

    const stats = {
      totalProducts,
      activeProducts,
      totalSales: completedOrders,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      revenueCurrency: 'USD', // Default currency
      pendingOrders: totalOrders - completedOrders,
      completedOrders,
      averageRating: 0, // Will be calculated from reviews
      ratingCount: 0
    }

    logger.info('Sales rep stats fetched successfully:', { salesRepId, stats })
    res.json(stats)
  } catch (error) {
    logger.error('Error fetching sales rep stats:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
