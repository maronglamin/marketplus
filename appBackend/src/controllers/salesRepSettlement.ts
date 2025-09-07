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

// Request settlement for parent seller
export const requestSettlement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    const { amount, currencyCode, description } = req.body

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate required fields
    if (!amount || !currencyCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: amount, currencyCode' 
      })
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({ 
        error: 'Amount must be greater than 0' 
      })
    }

    logger.info('Processing settlement request:', { 
      parentSellerId, 
      amount, 
      currencyCode, 
      description 
    })

    // Check if parent seller has approved KYC
    const parentKyc = await prisma.sellerKyc.findUnique({
      where: { userId: parentSellerId },
      select: { 
        status: true,
        businessName: true
      }
    })

    if (!parentKyc || parentKyc.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Parent seller must have approved KYC to request settlement' 
      })
    }

    // Calculate total available amount from all sales reps
    const salesReps = await prisma.salesRep.findMany({
      where: { parentSellerId },
      select: { id: true }
    })

    const salesRepIds = salesReps.map(rep => rep.id)

    // Get total revenue from completed orders
    const totalRevenue = await prisma.orders.aggregate({
      where: { 
        salesRepId: { in: salesRepIds },
        status: 'COMPLETED'
      },
      _sum: {
        totalAmount: true
      }
    })

    const availableAmount = totalRevenue._sum.totalAmount || 0

    // Check if requested amount is available
    if (amount > availableAmount) {
      return res.status(400).json({ 
        error: `Insufficient funds. Available: ${availableAmount}, Requested: ${amount}` 
      })
    }

    // Create settlement request
    const settlement = await prisma.salesRepSettlement.create({
      data: {
        parentSellerId,
        amount,
        currencyCode,
        description: description || `Settlement request for ${parentKyc.businessName}`,
        status: 'PENDING'
      }
    })

    logger.info('Settlement request created successfully:', { 
      settlementId: settlement.id,
      parentSellerId,
      amount 
    })

    res.status(201).json({
      settlementId: settlement.id,
      status: settlement.status,
      requestedAmount: settlement.amount,
      currencyCode: settlement.currencyCode,
      createdAt: settlement.createdAt
    })
  } catch (error) {
    logger.error('Error creating settlement request:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get settlement history for parent seller
export const getSettlementHistory = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching settlement history:', { parentSellerId })

    const settlements = await prisma.salesRepSettlement.findMany({
      where: { parentSellerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        description: true,
        requestedAt: true,
        processedAt: true,
        notes: true
      }
    })

    const transformedSettlements = settlements.map(settlement => ({
      id: settlement.id,
      amount: settlement.amount,
      currencyCode: settlement.currencyCode,
      status: settlement.status,
      requestedAt: settlement.requestedAt,
      processedAt: settlement.processedAt,
      description: settlement.description,
      notes: settlement.notes
    }))

    logger.info('Settlement history fetched successfully:', { 
      parentSellerId, 
      count: transformedSettlements.length 
    })

    res.json(transformedSettlements)
  } catch (error) {
    logger.error('Error fetching settlement history:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get settlement details
export const getSettlementDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settlementId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Fetching settlement details:', { settlementId, parentSellerId })

    const settlement = await prisma.salesRepSettlement.findFirst({
      where: {
        id: settlementId,
        parentSellerId
      },
      include: {
        salesRep: {
          select: {
            id: true,
            branchName: true,
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' })
    }

    const transformedSettlement = {
      id: settlement.id,
      amount: settlement.amount,
      currencyCode: settlement.currencyCode,
      status: settlement.status,
      description: settlement.description,
      requestedAt: settlement.requestedAt,
      processedAt: settlement.processedAt,
      processedBy: settlement.processedBy,
      notes: settlement.notes,
      salesRep: settlement.salesRep ? {
        id: settlement.salesRep.id,
        name: `${settlement.salesRep.user.firstName} ${settlement.salesRep.user.lastName}`,
        branchName: settlement.salesRep.branchName
      } : null
    }

    logger.info('Settlement details fetched successfully:', { settlementId })
    res.json(transformedSettlement)
  } catch (error) {
    logger.error('Error fetching settlement details:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Cancel settlement request (only if pending)
export const cancelSettlement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settlementId } = req.params
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    logger.info('Cancelling settlement request:', { settlementId, parentSellerId })

    // Check if settlement exists and belongs to parent seller
    const settlement = await prisma.salesRepSettlement.findFirst({
      where: {
        id: settlementId,
        parentSellerId
      }
    })

    if (!settlement) {
      return res.status(404).json({ error: 'Settlement not found' })
    }

    // Check if settlement can be cancelled
    if (settlement.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Only pending settlements can be cancelled' 
      })
    }

    // Update settlement status to cancelled
    const updatedSettlement = await prisma.salesRepSettlement.update({
      where: { id: settlementId },
      data: { 
        status: 'CANCELLED',
        notes: 'Cancelled by parent seller'
      }
    })

    logger.info('Settlement cancelled successfully:', { settlementId })
    res.json({
      id: updatedSettlement.id,
      status: updatedSettlement.status,
      message: 'Settlement request cancelled successfully'
    })
  } catch (error) {
    logger.error('Error cancelling settlement:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
