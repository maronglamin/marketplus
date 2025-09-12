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

    // Get aggregated data using the same relationship logic as recent activity
    // Products and orders are linked by sellerId = rep.userId (not salesRepId)
    const repUserIds = salesReps.map(rep => rep.userId)
    
    const [
      totalStats,
      salesRepsStats
    ] = await Promise.all([
      // Total aggregated stats using sellerId = rep.userId
      Promise.all([
        prisma.product.count({
          where: { 
            sellerId: { in: repUserIds },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.product.count({
          where: { 
            sellerId: { in: repUserIds },
            status: 'ACTIVE',
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.count({
          where: { 
            sellerId: { in: repUserIds },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.count({
          where: { 
            sellerId: { in: repUserIds },
            status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] },
            createdAt: { gte: dateFrom, lte: dateTo }
          }
        }),
        prisma.orders.aggregate({
          where: { 
            sellerId: { in: repUserIds },
            status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] },
            createdAt: { gte: dateFrom, lte: dateTo }
          },
          _sum: {
            totalAmount: true
          }
        })
      ]),
      // Individual sales rep stats using sellerId = rep.userId
      Promise.all(salesReps.map(async (rep) => {
        const [totalProducts, activeProducts, totalOrders, completedOrders, totalRevenue] = await Promise.all([
          prisma.product.count({
            where: { 
              sellerId: rep.userId,
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.product.count({
            where: { 
              sellerId: rep.userId,
              status: 'ACTIVE',
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.count({
            where: { 
              sellerId: rep.userId,
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.count({
            where: { 
              sellerId: rep.userId,
              status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] },
              createdAt: { gte: dateFrom, lte: dateTo }
            }
          }),
          prisma.orders.aggregate({
            where: { 
              sellerId: rep.userId,
              status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] },
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

    // Compute revenue breakdown by currency and select primary currency (most used by count)
    const revenueByCurrency = await prisma.orders.groupBy({
      by: ['currencyCode'],
      where: {
        sellerId: { in: repUserIds },
        status: { in: ['COMPLETED', 'DELIVERED', 'CONFIRMED'] },
        createdAt: { gte: dateFrom, lte: dateTo }
      },
      _sum: { totalAmount: true },
      _count: { _all: true }
    })

    let primaryCurrencyCode: string | null = null
    let primaryCurrencyTotal = 0 as any
    if (revenueByCurrency.length > 0) {
      revenueByCurrency.sort((a, b) => (b._count._all || 0) - (a._count._all || 0))
      const primary = revenueByCurrency[0]
      primaryCurrencyCode = primary.currencyCode || 'USD'
      primaryCurrencyTotal = primary._sum.totalAmount || 0
    }
    const otherCurrencyCodes = revenueByCurrency
      .filter(rc => rc.currencyCode !== primaryCurrencyCode)
      .map(rc => rc.currencyCode)

    const analytics = {
      totalStats: {
        totalProducts,
        activeProducts,
        totalSales: totalOrders,
        totalRevenue: primaryCurrencyTotal || 0,
        revenueCurrency: primaryCurrencyCode || 'USD',
        pendingOrders: totalOrders - completedOrders,
        completedOrders,
        averageRating: 0,
        ratingCount: 0
      },
      currencyBreakdown: {
        primaryCurrencyCode: primaryCurrencyCode || 'USD',
        primaryCurrencyTotal: primaryCurrencyTotal || 0,
        otherCurrencyCodes,
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
          totalRevenue: primaryCurrencyTotal || 0,
          revenueCurrency: primaryCurrencyCode || 'USD',
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

// Get recent activity across all sales reps under the authenticated parent seller
// Combines products (by sellerId = rep.userId) and orders (by sellerId = rep.userId)
// Supports cursor pagination using createdAt ISO string
export const getParentSellerRecentActivity = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parentSellerId = req.user?.id
    if (!parentSellerId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const limit = Math.min(parseInt((req.query.limit as string) || '20', 10), 50)
    const cursor = (req.query.cursor as string) || undefined
    const typeFilter = (req.query.type as string) || undefined // 'product' | 'order'

    // Get all reps for this seller
    const reps = await prisma.salesRep.findMany({
      where: { parentSellerId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      }
    })

    if (reps.length === 0) {
      return res.json({ items: [], nextCursor: null })
    }

    const repUserIds = reps.map(r => r.userId)
    const repByUserId = new Map(reps.map(r => [r.userId, r]))

    const createdBefore = cursor ? new Date(cursor) : undefined

    // Fetch a bit more than limit from each source to merge properly
    const fetchLimit = limit * 2

    const fetchProducts = async () => {
      if (typeFilter && typeFilter !== 'product') return [] as any[]
      return prisma.product.findMany({
        where: {
          sellerId: { in: repUserIds },
          ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
        },
        select: {
          id: true,
          sellerId: true,
          title: true,
          price: true,
          currencyCode: true,
          quantity: true,
          status: true,
          createdAt: true,
          images: {
            where: { isPrimary: true },
            select: { imageUrl: true },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
      })
    }

    const fetchOrders = async () => {
      if (typeFilter && typeFilter !== 'order') return [] as any[]
      return prisma.orders.findMany({
        where: {
          sellerId: { in: repUserIds },
          ...(createdBefore ? { createdAt: { lt: createdBefore } } : {}),
        },
        select: {
          id: true,
          sellerId: true,
          orderNumber: true,
          totalAmount: true,
          currencyCode: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit,
      })
    }

    const [products, orders] = await Promise.all([fetchProducts(), fetchOrders()])

    // Fetch first product title and image per order to enrich order activities
    let orderIdToProductTitle: Map<string, string> = new Map()
    let orderIdToProductImage: Map<string, string> = new Map()
    if (orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id)
      const orderItems = await prisma.orderItem.findMany({
        where: { orderId: { in: orderIds } },
        select: {
          orderId: true,
          productSnapshot: true,
          product: { 
            select: { 
              title: true,
              images: {
                where: { isPrimary: true },
                select: { imageUrl: true },
                take: 1
              }
            } 
          }
        },
        orderBy: { createdAt: 'asc' },
      })

      for (const item of orderItems) {
        if (!orderIdToProductTitle.has(item.orderId)) {
          const snapshotTitle = (item.productSnapshot as any)?.title
          const title = snapshotTitle || item.product?.title || 'Product'
          orderIdToProductTitle.set(item.orderId, title)
          
          // Get product image from either snapshot or current product
          const snapshotImage = (item.productSnapshot as any)?.imageUrl
          const productImage = item.product?.images?.[0]?.imageUrl
          const imageUrl = snapshotImage || productImage || null
          if (imageUrl) {
            orderIdToProductImage.set(item.orderId, imageUrl)
          }
        }
      }
    }

    // Normalize and merge
    const productActivities = products.map((p: any) => {
      const rep = repByUserId.get(p.sellerId)
      return {
        id: `product:${p.id}`,
        type: 'product' as const,
        createdAt: p.createdAt,
        rep: rep ? { id: rep.id, userId: rep.userId, name: `${rep.user.firstName} ${rep.user.lastName}` } : null,
        data: {
          productId: p.id,
          title: p.title,
          amount: p.price,
          currencyCode: p.currencyCode,
          quantity: p.quantity,
          status: p.status,
          productImage: p.images?.[0]?.imageUrl || null,
        }
      }
    })

    const orderActivities = orders.map((o: any) => {
      const rep = repByUserId.get(o.sellerId)
      return {
        id: `order:${o.id}`,
        type: 'order' as const,
        createdAt: o.createdAt,
        rep: rep ? { id: rep.id, userId: rep.userId, name: `${rep.user.firstName} ${rep.user.lastName}` } : null,
        data: {
          orderId: o.id,
          orderNumber: o.orderNumber,
          productTitle: orderIdToProductTitle.get(o.id) || undefined,
          productImage: orderIdToProductImage.get(o.id) || null,
          amount: o.totalAmount,
          currencyCode: o.currencyCode,
          status: o.status,
        }
      }
    })

    const merged = [...productActivities, ...orderActivities]
      .sort((a, b) => (b.createdAt as any) - (a.createdAt as any))

    const sliced = merged.slice(0, limit)
    const last = sliced[sliced.length - 1]
    const nextCursor = last ? new Date(last.createdAt).toISOString() : null

    res.json({ items: sliced, nextCursor })
  } catch (error) {
    logger.error('Error fetching parent seller recent activity:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
