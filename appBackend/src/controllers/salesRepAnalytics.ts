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

// Get sales rep analytics with date filters
export const getSalesRepAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { salesRepId } = req.params
    const { period, startDate, endDate } = req.query
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly']
    if (!period || !validPeriods.includes(period as string)) {
      return res.status(400).json({ 
        error: 'Invalid period. Must be one of: daily, weekly, monthly, yearly' 
      })
    }

    logger.info('Fetching sales rep analytics:', { 
      salesRepId, 
      period, 
      startDate, 
      endDate, 
      parentSellerId 
    })

    // Verify sales rep belongs to parent seller
    const salesRep = await prisma.salesRep.findFirst({
      where: {
        id: salesRepId,
        parentSellerId
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!salesRep) {
      return res.status(404).json({ error: 'Sales rep not found' })
    }

    // Calculate date range based on period
    const now = new Date()
    let dateFrom: Date
    let dateTo: Date = now

    if (startDate && endDate) {
      dateFrom = new Date(startDate as string)
      dateTo = new Date(endDate as string)
    } else {
      // Default date ranges based on period
      switch (period) {
        case 'daily':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'weekly':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'yearly':
          dateFrom = new Date(now.getFullYear(), 0, 1)
          break
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default to 30 days
      }
    }

    // Get analytics data
    const [
      totalProducts,
      activeProducts,
      totalOrders,
      completedOrders,
      totalRevenue,
      products,
      orders,
      sales
    ] = await Promise.all([
      // Total products count
      prisma.product.count({
        where: { 
          salesRepId,
          createdAt: { gte: dateFrom, lte: dateTo }
        }
      }),
      // Active products count
      prisma.product.count({
        where: { 
          salesRepId,
          status: 'ACTIVE',
          createdAt: { gte: dateFrom, lte: dateTo }
        }
      }),
      // Total orders count
      prisma.orders.count({
        where: { 
          salesRepId,
          createdAt: { gte: dateFrom, lte: dateTo }
        }
      }),
      // Completed orders count
      prisma.orders.count({
        where: { 
          salesRepId,
          status: 'COMPLETED',
          createdAt: { gte: dateFrom, lte: dateTo }
        }
      }),
      // Total revenue
      prisma.orders.aggregate({
        where: { 
          salesRepId,
          status: 'COMPLETED',
          createdAt: { gte: dateFrom, lte: dateTo }
        },
        _sum: {
          totalAmount: true
        }
      }),
      // Products with details
      prisma.product.findMany({
        where: { 
          salesRepId,
          createdAt: { gte: dateFrom, lte: dateTo }
        },
        select: {
          id: true,
          title: true,
          price: true,
          currencyCode: true,
          quantity: true,
          views: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Orders with details
      prisma.orders.findMany({
        where: { 
          salesRepId,
          createdAt: { gte: dateFrom, lte: dateTo }
        },
        select: {
          id: true,
          orderNumber: true,
          customerName: true,
          totalAmount: true,
          currencyCode: true,
          status: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      // Sales data (from order items)
      prisma.orderItem.findMany({
        where: {
          order: {
            salesRepId,
            status: 'COMPLETED',
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        },
        select: {
          id: true,
          productId: true,
          productSnapshot: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          order: {
            select: {
              currencyCode: true,
              createdAt: true
            }
          }
        },
        orderBy: { order: { createdAt: 'desc' } }
      })
    ])

    // Calculate average rating (placeholder - would need review system)
    const averageRating = 0
    const ratingCount = 0

    // Transform products data
    const transformedProducts = products.map(product => ({
      id: product.id,
      title: product.title,
      price: product.price,
      currencyCode: product.currencyCode,
      quantity: product.quantity,
      views: product.views,
      sales: 0, // Would need to calculate from order items
      status: product.status,
      createdAt: product.createdAt
    }))

    // Transform sales data
    const transformedSales = sales.map(sale => ({
      id: sale.id,
      productId: sale.productId,
      productTitle: (sale.productSnapshot as any)?.title || 'Unknown Product',
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalPrice: sale.totalPrice,
      currencyCode: sale.order.currencyCode,
      orderDate: sale.order.createdAt
    }))

    const analytics = {
      salesRepId,
      salesRepName: `${salesRep.user.firstName} ${salesRep.user.lastName}`,
      period,
      startDate: dateFrom.toISOString(),
      endDate: dateTo.toISOString(),
      stats: {
        totalProducts,
        activeProducts,
        totalSales: completedOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        revenueCurrency: 'USD', // Default currency
        pendingOrders: totalOrders - completedOrders,
        completedOrders,
        averageRating,
        ratingCount
      },
      products: transformedProducts,
      orders,
      sales: transformedSales
    }

    logger.info('Sales rep analytics fetched successfully:', { 
      salesRepId, 
      period,
      stats: analytics.stats 
    })

    res.json(analytics)
  } catch (error) {
    logger.error('Error fetching sales rep analytics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Get parent seller analytics (aggregated data from all sales reps)
export const getParentSellerAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { period, startDate, endDate } = req.query
    const parentSellerId = req.user?.id

    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Validate period
    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly']
    if (!period || !validPeriods.includes(period as string)) {
      return res.status(400).json({ 
        error: 'Invalid period. Must be one of: daily, weekly, monthly, yearly' 
      })
    }

    logger.info('Fetching parent seller analytics:', { 
      period, 
      startDate, 
      endDate, 
      parentSellerId 
    })

    // Calculate date range
    const now = new Date()
    let dateFrom: Date
    let dateTo: Date = now

    if (startDate && endDate) {
      dateFrom = new Date(startDate as string)
      dateTo = new Date(endDate as string)
    } else {
      switch (period) {
        case 'daily':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'weekly':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'monthly':
          dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'yearly':
          dateFrom = new Date(now.getFullYear(), 0, 1)
          break
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // Get all sales reps for this parent seller
    const salesReps = await prisma.salesRep.findMany({
      where: { parentSellerId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const salesRepIds = salesReps.map(rep => rep.id)

    // Get aggregated data
    const [
      totalStats,
      salesRepsStats
    ] = await Promise.all([
      // Total aggregated stats
      Promise.all([
        prisma.product.count({
          where: { 
            salesRepId: { in: salesRepIds },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.product.count({
          where: { 
            salesRepId: { in: salesRepIds },
            status: 'ACTIVE',
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.count({
          where: { 
            salesRepId: { in: salesRepIds },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.count({
          where: { 
            salesRepId: { in: salesRepIds },
            status: 'COMPLETED',
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.aggregate({
          where: { 
            salesRepId: { in: salesRepIds },
            status: 'COMPLETED',
            createdAt: { gte: dateFrom, lte: dateTo }
          },
          _sum: {
            totalAmount: true
          }
        })
      ]),
      // Individual sales rep stats
      Promise.all(salesReps.map(async (rep) => {
        const [totalProducts, activeProducts, totalOrders, completedOrders, totalRevenue] = await Promise.all([
          prisma.product.count({
            where: { 
              salesRepId: rep.id,
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.product.count({
            where: { 
              salesRepId: rep.id,
              status: 'ACTIVE',
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.count({
            where: { 
              salesRepId: rep.id,
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.count({
            where: { 
              salesRepId: rep.id,
              status: 'COMPLETED',
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.aggregate({
            where: { 
              salesRepId: rep.id,
              status: 'COMPLETED',
              createdAt: { gte: dateFrom, lte: dateTo }
            },
            _sum: {
              totalAmount: true
            }
          })
        ])

        return {
          salesRepId: rep.id,
          salesRepName: `${rep.user.firstName} ${rep.user.lastName}`,
          stats: {
            totalProducts,
            activeProducts,
            totalSales: completedOrders,
            totalRevenue: totalRevenue._sum.totalAmount || 0,
            revenueCurrency: 'USD',
            pendingOrders: totalOrders - completedOrders,
            completedOrders,
            averageRating: 0,
            ratingCount: 0
          }
        }
      }))
    ])

    const [totalProducts, activeProducts, totalOrders, completedOrders, totalRevenue] = totalStats

    const analytics = {
      totalStats: {
        totalProducts,
        activeProducts,
        totalSales: completedOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        revenueCurrency: 'USD',
        pendingOrders: totalOrders - completedOrders,
        completedOrders,
        averageRating: 0,
        ratingCount: 0
      },
      salesReps: salesRepsStats,
      aggregatedData: {
        salesRepId: 'all',
        salesRepName: 'All Sales Reps',
        period,
        startDate: dateFrom.toISOString(),
        endDate: dateTo.toISOString(),
        stats: {
          totalProducts,
          activeProducts,
          totalSales: completedOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          revenueCurrency: 'USD',
          pendingOrders: totalOrders - completedOrders,
          completedOrders,
          averageRating: 0,
          ratingCount: 0
        },
        products: [], // Would need to aggregate all products
        orders: [], // Would need to aggregate all orders
        sales: [] // Would need to aggregate all sales
      }
    }

    logger.info('Parent seller analytics fetched successfully:', { 
      parentSellerId, 
      period,
      totalStats: analytics.totalStats 
    })

    res.json(analytics)
  } catch (error) {
    logger.error('Error fetching parent seller analytics:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
