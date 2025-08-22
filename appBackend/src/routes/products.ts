import express from 'express';
import { logger } from '../utils/logger';
import { PrismaClient, ProductCondition, ProductStatus, TransactionType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { notificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();

interface AuthRequest extends express.Request {
  user?: {
    id: string;
    deviceId: string;
  };
}

// List available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        parentId: true
      }
    });

    res.json(categories);
  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create a new product
router.post('/', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info('Creating new product:', req.body);

    const {
      title,
      description,
      price,
      currencyCode,
      quantity,
      categoryId,
      condition,
      locationId,
      status,
      images,
      attributes,
      metadata
    } = req.body;

    // Create the product
    const product = await prisma.product.create({
      data: {
        title,
        description,
        price,
        currencyCode,
        quantity,
        categoryId: categoryId || null, // Allow null for uncategorized products
        condition: condition as ProductCondition,
        locationId: locationId || 'default-location',
        status: status as ProductStatus,
        sellerId: req.user.id,
        images: {
          create: images.map((image: any) => ({
            imageUrl: image.imageUrl,
            isPrimary: image.isPrimary,
            width: image.width,
            height: image.height,
            size: image.size,
            format: image.format
          }))
        },
        attributes: {
          create: attributes.map((attr: any) => ({
            key: attr.key,
            value: attr.value,
            unit: attr.unit,
            isFilterable: attr.isFilterable
          }))
        },
        metadata: metadata || {}
      },
      include: {
        images: true,
        attributes: true
      }
    });

    logger.info('Product created successfully:', product);
    res.status(201).json(product);
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({ 
      error: 'Failed to create product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get seller's products with pagination
router.get('/seller', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    logger.info('Fetching seller products:', { 
      userId: req.user.id,
      page,
      limit
    });

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          sellerId: req.user.id
        },
        include: {
          images: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.product.count({
        where: {
          sellerId: req.user.id
        }
      })
    ]);

    // Calculate view counts and order counts for each product
    const productsWithCounts = await Promise.all(
      products.map(async (product) => {
        const [viewCount, orderCount] = await Promise.all([
          prisma.productView.count({
            where: {
              productId: product.id
            }
          }),
          prisma.orderItem.count({
            where: {
              productId: product.id,
              order: {
                status: {
                  notIn: ['CANCELLED', 'REFUNDED']
                }
              }
            }
          })
        ]);
        
        return {
          ...product,
          views: viewCount,
          orderCount: orderCount
        };
      })
    );

    logger.info('Products fetched successfully:', { 
      userId: req.user.id,
      count: productsWithCounts.length,
      total
    });

    res.json({
      products: productsWithCounts,
      total,
      page,
      limit,
      hasMore: skip + productsWithCounts.length < total
    });
  } catch (error) {
    logger.error('Error fetching seller products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all products for customers (excluding current user's products)
router.get('/customer', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const categoryId = req.query.categoryId as string;
    const search = req.query.search as string;

    logger.info('Fetching customer products:', { 
      userId: req.user.id,
      page,
      limit,
      categoryId,
      search
    });

    // Build where clause
    const whereClause: any = {
      sellerId: {
        not: req.user.id // Exclude current user's products
      },
      status: 'ACTIVE', // Only show active products
      deletedAt: null // Exclude deleted products
    };

    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              sellerKyc: {
                select: {
                  businessName: true,
                  status: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { isFeatured: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.product.count({
        where: whereClause
      })
    ]);

    // Transform the data for frontend consumption and filter out products with invalid categories
    const transformedProducts = products
      .filter(product => product.seller) // Ensure seller exists
      .map(product => ({
        id: product.id,
        name: product.title,
        price: parseFloat(product.price.toString()),
        currencyCode: product.currencyCode,
        image: product.images[0]?.imageUrl || null,
        seller: product.seller.sellerKyc?.businessName || `${product.seller.firstName} ${product.seller.lastName}`,
        stock: product.quantity,
        views: product.views,
        rating: product.rating ? parseFloat(product.rating.toString()) : null,
        ratingCount: product.ratingCount,
        condition: product.condition,
        category: product.category?.name || 'Uncategorized',
        description: product.description,
        createdAt: product.createdAt,
        isFeatured: product.isFeatured
      }));

    logger.info('Customer products fetched successfully:', { 
      userId: req.user.id,
      count: transformedProducts.length,
      total
    });

    res.json({
      products: transformedProducts,
      total,
      page,
      limit,
      hasMore: skip + transformedProducts.length < total
    });
  } catch (error) {
    logger.error('Error fetching customer products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get featured products for customers (excluding current user's products)
router.get('/featured', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 4;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    logger.info('Fetching featured products:', { 
      userId: req.user.id,
      limit,
      page
    });

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          sellerId: {
            not: req.user.id // Exclude current user's products
          },
          status: 'ACTIVE',
          deletedAt: null,
          isFeatured: true
        },
        include: {
          images: {
            where: { isPrimary: true },
            take: 1
          },
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              sellerKyc: {
                select: {
                  businessName: true,
                  status: true
                }
              }
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true
            }
          }
        },
        orderBy: [
          { featuredUntil: 'desc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limit
      }),
      prisma.product.count({
        where: {
          sellerId: {
            not: req.user.id // Exclude current user's products
          },
          status: 'ACTIVE',
          deletedAt: null,
          isFeatured: true
        }
      })
    ]);

    // Transform the data for frontend consumption and filter out products with invalid sellers
    const transformedProducts = products
      .filter(product => product.seller) // Ensure seller exists
      .map(product => ({
        id: product.id,
        name: product.title,
        price: parseFloat(product.price.toString()),
        currencyCode: product.currencyCode,
        image: product.images[0]?.imageUrl || null,
        seller: product.seller.sellerKyc?.businessName || `${product.seller.firstName} ${product.seller.lastName}`,
        stock: product.quantity,
        views: product.views,
        rating: product.rating ? parseFloat(product.rating.toString()) : null,
        ratingCount: product.ratingCount,
        condition: product.condition,
        category: product.category?.name || 'Uncategorized',
        description: product.description,
        createdAt: product.createdAt,
        isFeatured: product.isFeatured
      }));

    logger.info('Featured products fetched successfully:', { 
      userId: req.user.id,
      count: transformedProducts.length,
      total,
      page,
      limit
    });

    res.json({
      products: transformedProducts,
      total,
      page,
      limit,
      hasMore: skip + transformedProducts.length < total
    });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({ 
      error: 'Failed to fetch featured products',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test route
router.get('/test', (req, res) => {
  logger.info('Products test route hit');
  res.json({ message: 'Products routes working!' });
});

// Track a product view (unique per user) - MUST BE BEFORE /:productId route
router.post('/:productId/view', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const { deviceId, ipAddress } = req.body;

    logger.info('Tracking product view:', { 
      userId: req.user.id,
      productId,
      deviceId,
      ipAddress
    });

    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Try to create a unique view record
    try {
      await prisma.productView.create({
        data: {
          productId,
          userId: req.user.id,
          deviceId: deviceId || null,
          ipAddress: ipAddress || null
        }
      });

      logger.info('Product view tracked successfully:', { 
        userId: req.user.id,
        productId
      });

      res.status(201).json({ 
        message: 'View tracked successfully',
        productId,
        userId: req.user.id
      });
    } catch (error: any) {
      // If it's a unique constraint violation, the view was already tracked
      if (error.code === 'P2002') {
        logger.info('Product view already tracked for this user:', { 
          userId: req.user.id,
          productId
        });
        res.status(200).json({ 
          message: 'View already tracked',
          productId,
          userId: req.user.id
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Error tracking product view:', error);
    res.status(500).json({ 
      error: 'Failed to track product view',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get seller dashboard statistics
router.get('/seller/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      logger.error('No user in request for seller stats')
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info('Fetching seller dashboard stats:', { 
      userId: req.user.id
    });

    // Get product counts
    const [totalProducts, activeProducts] = await Promise.all([
      prisma.product.count({
        where: {
          sellerId: req.user.id,
          deletedAt: null
        }
      }),
      prisma.product.count({
        where: {
          sellerId: req.user.id,
          status: 'ACTIVE',
          deletedAt: null
        }
      })
    ]);

    logger.info('Product counts calculated:', { totalProducts, activeProducts });

    // Get order statistics and revenue
    const [totalSales, pendingOrders, paidOrders] = await Promise.all([
      // Total sales: orders with PAID payment status
      prisma.orders.count({
        where: {
          sellerId: req.user.id,
          paymentStatus: 'PAID'
        }
      }),
      // Pending orders: orders not in CONFIRMED or AUTHORIZED status
      prisma.orders.count({
        where: {
          sellerId: req.user.id,
          status: {
            notIn: ['CONFIRMED', 'AUTHORIZED', 'CANCELLED']
          }
        }
      }),
      // Get all paid orders for revenue calculation
      prisma.orders.findMany({
        where: {
          sellerId: req.user.id,
          paymentStatus: 'PAID'
        },
        select: {
          totalAmount: true,
          currencyCode: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    ]);

    // Calculate revenue based on latest paid order currency
    let totalRevenue = 0;
    let revenueCurrency = 'USD'; // Default currency
    let hasOtherCurrencies = false;

    if (paidOrders.length > 0) {
      // Get the currency of the latest paid order
      revenueCurrency = paidOrders[0].currencyCode;
      
      // Sum all paid orders in the same currency
      const grossRevenue = paidOrders
        .filter(order => order.currencyCode === revenueCurrency)
        .reduce((sum, order) => sum + parseFloat(order.totalAmount.toString()), 0);
      
      // Get service fees for this currency from ExternalTransaction table
      const serviceFeesResult = await prisma.externalTransaction.aggregate({
        where: {
          sellerId: req.user.id,
          currencyCode: revenueCurrency,
          transactionType: TransactionType.SERVICE_FEE,
          status: 'SUCCESS'
        },
        _sum: {
          amount: true
        }
      });

      const totalServiceFees = serviceFeesResult._sum?.amount
        ? parseFloat(serviceFeesResult._sum.amount.toString())
        : 0;

      // Calculate net revenue after deducting service fees
      totalRevenue = Math.max(0, grossRevenue - totalServiceFees);
      
      // Check if there are orders in other currencies
      const uniqueCurrencies = [...new Set(paidOrders.map(order => order.currencyCode))];
      hasOtherCurrencies = uniqueCurrencies.length > 1;
    }

    logger.info('Order counts and revenue calculated:', { 
      totalSales, 
      pendingOrders, 
      totalRevenue, 
      revenueCurrency, 
      hasOtherCurrencies 
    });

    const stats = {
      totalProducts,
      activeProducts,
      totalSales,
      pendingOrders,
      totalRevenue,
      revenueCurrency,
      hasOtherCurrencies
    };

    logger.info('Seller dashboard stats fetched successfully:', { 
      userId: req.user.id,
      stats
    });

    res.json(stats);
  } catch (error) {
    logger.error('Error fetching seller dashboard stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get seller revenue breakdown by currency
router.get('/seller/revenue', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      logger.error('No user in request for seller revenue')
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info('Fetching seller revenue breakdown:', { 
      userId: req.user.id
    });

    // Get all paid orders grouped by currency
    const paidOrders = await prisma.orders.findMany({
      where: {
        sellerId: req.user.id,
        paymentStatus: 'PAID'
      },
      select: {
        totalAmount: true,
        currencyCode: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get service fees from ExternalTransaction table
    const serviceFees = await prisma.externalTransaction.findMany({
      where: {
        sellerId: req.user.id,
        transactionType: TransactionType.SERVICE_FEE,
        status: 'SUCCESS'
      },
      select: {
        amount: true,
        currencyCode: true
      }
    });

    // Group orders by currency and calculate totals
    const revenueByCurrency = new Map<string, number>();
    
    paidOrders.forEach(order => {
      const currency = order.currencyCode;
      const amount = parseFloat(order.totalAmount.toString());
      revenueByCurrency.set(currency, (revenueByCurrency.get(currency) || 0) + amount);
    });

    // Subtract service fees from revenue by currency
    serviceFees.forEach(fee => {
      const currency = fee.currencyCode;
      const feeAmount = parseFloat(fee.amount.toString());
      const currentRevenue = revenueByCurrency.get(currency) || 0;
      revenueByCurrency.set(currency, Math.max(0, currentRevenue - feeAmount)); // Ensure revenue doesn't go negative
    });

    // Calculate total revenue across all currencies
    const totalRevenue = Array.from(revenueByCurrency.values()).reduce((sum, amount) => sum + amount, 0);

    // Convert to array format for frontend
    const revenueData = Array.from(revenueByCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
      percentage: totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0
    }));

    // Sort by amount (highest first)
    revenueData.sort((a, b) => b.amount - a.amount);

    logger.info('Seller revenue breakdown calculated:', { 
      userId: req.user.id,
      totalRevenue,
      currencyCount: revenueData.length,
      currencies: revenueData.map(item => item.currency),
      serviceFeesCount: serviceFees.length
    });

    res.json({
      totalRevenue,
      revenueByCurrency: revenueData
    });
  } catch (error) {
    logger.error('Error fetching seller revenue breakdown:', error);
    res.status(500).json({ 
      error: 'Failed to fetch revenue breakdown',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a single product by ID for sellers (their own products)
router.get('/seller/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;

    logger.info('Fetching seller product details:', { 
      userId: req.user.id,
      productId
    });

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: req.user.id // Only allow sellers to view their own products
      },
      include: {
        images: {
          orderBy: { isPrimary: 'desc' }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Calculate view count from ProductView table (unique users)
    const viewCount = await prisma.productView.count({
      where: {
        productId: productId
      }
    });

    // Transform the data for frontend consumption
    const transformedProduct = {
      id: product.id,
      title: product.title,
      description: product.description || '',
      price: parseFloat(product.price.toString()),
      currencyCode: product.currencyCode,
      quantity: product.quantity,
      condition: product.condition,
      status: product.status,
      categoryId: product.categoryId,
      category: product.category,
      images: product.images.map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary
      })),
      views: viewCount,
      favorites: product.favorites,
      rating: product.rating ? parseFloat(product.rating.toString()) : null,
      ratingCount: product.ratingCount,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    logger.info('Seller product details fetched successfully:', { 
      userId: req.user.id,
      productId
    });

    res.json(transformedProduct);
  } catch (error) {
    logger.error('Error fetching seller product details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get a single product by ID
router.get('/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const { context, allowOwn } = req.query; // Add allowOwn parameter to allow sellers to view their own products

    logger.info('Fetching product details:', { 
      userId: req.user.id,
      productId,
      context,
      allowOwn
    });

    // Build where clause
    const whereClause: any = {
      id: productId,
      status: 'ACTIVE',
      deletedAt: null
    };

    // If allowOwn is not 'true' and context is not 'seller', exclude current user's products (for customer view)
    if (allowOwn !== 'true' && context !== 'seller') {
      whereClause.sellerId = {
        not: req.user.id
      };
    }

    const product = await prisma.product.findFirst({
      where: whereClause,
      include: {
        images: {
          orderBy: { isPrimary: 'desc' }
        },
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            sellerKyc: {
              select: {
                businessName: true,
                status: true
              }
            }
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Get seller's product count
    const sellerProductCount = await prisma.product.count({
      where: {
        sellerId: product.seller.id,
        status: 'ACTIVE',
        deletedAt: null
      }
    });

    // Calculate view count from ProductView table (unique users)
    const viewCount = await prisma.productView.count({
      where: {
        productId: productId
      }
    });

    // Transform the data for frontend consumption
    const transformedProduct = {
      id: product.id,
      name: product.title,
      price: parseFloat(product.price.toString()),
      currencyCode: product.currencyCode,
      rating: product.rating ? parseFloat(product.rating.toString()) : null,
      ratingCount: product.ratingCount,
      description: `Experience premium quality with this ${product.title}. Perfect for your needs.\n\n${product.description || ''}`,
      images: product.images.length > 0 
        ? product.images.map(img => `http://192.168.0.200:3000${img.imageUrl}`)
        : ['https://via.placeholder.com/400x300?text=No+Image'],
      seller: {
        name: product.seller.sellerKyc?.businessName || `${product.seller.firstName} ${product.seller.lastName}`,
        rating: product.rating ? parseFloat(product.rating.toString()) : null,
        products: sellerProductCount,
        image: null
      },
      stock: product.quantity,
      condition: product.condition,
      category: product.category?.name || 'Uncategorized',
      views: viewCount,
      isFeatured: product.isFeatured,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };

    logger.info('Product details fetched successfully:', { 
      userId: req.user.id,
      productId
    });

    res.json(transformedProduct);
  } catch (error) {
    logger.error('Error fetching product details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update a product
router.patch('/:productId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const updateData = req.body;

    logger.info('Updating product:', { productId, updateData, userId: req.user.id });

    // First check if the product exists and belongs to the user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: req.user.id
      }
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: {
        id: productId
      },
      data: updateData,
      include: {
        images: true,
        attributes: true
      }
    });

    logger.info('Product updated successfully:', updatedProduct);
    res.json(updatedProduct);
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({ 
      error: 'Failed to update product',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create product order interest
router.post('/:productId/interest', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const {
      quantity = 1,
      notes,
      preferredDeliveryDate,
      deliveryAddress,
      contactPhone,
      paymentMethod
    } = req.body;

    logger.info('Creating product order interest:', { 
      userId: req.user.id,
      productId,
      quantity
    });

    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: 'ACTIVE',
        deletedAt: null,
        sellerId: {
          not: req.user.id // User can't show interest in their own product
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or not available' });
    }

    // Check if user already has a pending interest for this product
    const existingInterest = await prisma.productOrderInterest.findFirst({
      where: {
        productId,
        userId: req.user.id,
        status: {
          in: ['PENDING', 'CONFIRMED', 'NEGOTIATING', 'ACCEPTED']
        }
      }
    });

    if (existingInterest) {
      return res.status(400).json({ 
        error: 'You already have a pending interest for this product',
        interestId: existingInterest.id
      });
    }

    // Calculate total amount (using original price for now, discount can be applied later)
    const originalPrice = parseFloat(product.price.toString());
    const totalAmount = originalPrice * quantity;

    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: { firstName: true, lastName: true, phoneNumber: true }
    });

    // Create the product order interest
    const productInterest = await prisma.productOrderInterest.create({
      data: {
        productId,
        userId: req.user.id,
        quantity,
        originalPrice,
        currencyCode: product.currencyCode,
        totalAmount,
        notes,
        preferredDeliveryDate: preferredDeliveryDate ? new Date(preferredDeliveryDate) : null,
        deliveryAddress,
        contactPhone,
        paymentMethod,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            currencyCode: true,
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    logger.info('Product order interest created successfully:', { 
      userId: req.user.id,
      productId,
      interestId: productInterest.id
    });

    res.status(201).json({
      message: 'Interest expressed successfully',
      interest: {
        id: productInterest.id,
        productId: productInterest.productId,
        quantity: productInterest.quantity,
        originalPrice: parseFloat(productInterest.originalPrice.toString()),
        totalAmount: parseFloat(productInterest.totalAmount.toString()),
        currencyCode: productInterest.currencyCode,
        status: productInterest.status,
        notes: productInterest.notes,
        preferredDeliveryDate: productInterest.preferredDeliveryDate,
        createdAt: productInterest.createdAt,
        expiresAt: productInterest.expiresAt,
        product: {
          id: productInterest.product.id,
          title: productInterest.product.title,
          price: parseFloat(productInterest.product.price.toString()),
          currencyCode: productInterest.product.currencyCode,
          image: productInterest.product.images[0]?.imageUrl || null
        }
      }
    });
  } catch (error) {
    logger.error('Error creating product order interest:', error);
    res.status(500).json({ 
      error: 'Failed to create product order interest',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's product order interests
router.get('/interests/user', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    logger.info('Fetching user product interests:', { 
      userId: req.user.id,
      page,
      limit,
      startDate,
      endDate
    });

    // Build where clause
    const whereClause: any = {
      userId: req.user.id
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [interests, total] = await Promise.all([
      prisma.productOrderInterest.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              currencyCode: true,
              images: {
                where: { isPrimary: true },
                take: 1
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.productOrderInterest.count({
        where: whereClause
      })
    ]);

    const transformedInterests = interests.map(interest => ({
      id: interest.id,
      productId: interest.productId,
      quantity: interest.quantity,
      originalPrice: parseFloat(interest.originalPrice.toString()),
      discountPrice: interest.discountPrice ? parseFloat(interest.discountPrice.toString()) : null,
      totalAmount: parseFloat(interest.totalAmount.toString()),
      currencyCode: interest.currencyCode,
      status: interest.status,
      preferredDeliveryDate: interest.preferredDeliveryDate,
      deliveryAddress: interest.deliveryAddress,
      contactPhone: interest.contactPhone,
      paymentMethod: interest.paymentMethod,
      paymentStatus: interest.paymentStatus,
      createdAt: interest.createdAt,
      expiresAt: interest.expiresAt,
      product: {
        id: interest.product.id,
        title: interest.product.title,
        price: parseFloat(interest.product.price.toString()),
        currencyCode: interest.product.currencyCode,
        image: interest.product.images[0]?.imageUrl || null
      }
    }));

    logger.info('User product interests fetched successfully:', { 
      userId: req.user.id,
      count: transformedInterests.length,
      total
    });

    res.json({
      interests: transformedInterests,
      total,
      page,
      limit,
      hasMore: skip + transformedInterests.length < total
    });
  } catch (error) {
    logger.error('Error fetching user product interests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product interests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all interests for chat list (with seller information)
router.get('/interests/chat-list', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    logger.info('Fetching interests for chat list:', { 
      userId: req.user.id,
      page,
      limit
    });

    const [interests, total] = await Promise.all([
      prisma.productOrderInterest.findMany({
        where: {
          userId: req.user.id
        },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              currencyCode: true,
              images: {
                where: { isPrimary: true },
                take: 1
              },
                              seller: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    sellerKyc: {
                      select: {
                        businessName: true
                      }
                    }
                  }
                }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.productOrderInterest.count({
        where: {
          userId: req.user.id
        }
      })
    ]);

    const transformedInterests = interests.map(interest => ({
      id: interest.id,
      productId: interest.productId,
      quantity: interest.quantity,
      originalPrice: parseFloat(interest.originalPrice.toString()),
      discountPrice: interest.discountPrice ? parseFloat(interest.discountPrice.toString()) : null,
      totalAmount: parseFloat(interest.totalAmount.toString()),
      currencyCode: interest.currencyCode,
      status: interest.status,
      preferredDeliveryDate: interest.preferredDeliveryDate,
      deliveryAddress: interest.deliveryAddress,
      contactPhone: interest.contactPhone,
      paymentMethod: interest.paymentMethod,
      paymentStatus: interest.paymentStatus,
      createdAt: interest.createdAt,
      updatedAt: interest.updatedAt,
      expiresAt: interest.expiresAt,
      product: {
        id: interest.product.id,
        title: interest.product.title,
        price: parseFloat(interest.product.price.toString()),
        currencyCode: interest.product.currencyCode,
        image: interest.product.images[0]?.imageUrl || null,
        seller: interest.product.seller ? {
          id: interest.product.seller.id,
          name: `${interest.product.seller.firstName} ${interest.product.seller.lastName}`,
          businessName: interest.product.seller.sellerKyc?.businessName || `${interest.product.seller.firstName} ${interest.product.seller.lastName}`,
          image: null // No profile image field in User model
        } : null
      }
    }));

    logger.info('Chat list interests fetched successfully:', { 
      userId: req.user.id,
      count: transformedInterests.length,
      total
    });

    res.json({
      interests: transformedInterests,
      total,
      page,
      limit,
      hasMore: skip + transformedInterests.length < total
    });
  } catch (error) {
    logger.error('Error fetching chat list interests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch chat list interests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get customer interests (interests where user is the seller)
router.get('/interests/customer', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    logger.info('Fetching customer product interests:', { 
      userId: req.user.id,
      page,
      limit,
      startDate,
      endDate
    });

    // Build where clause - user is the seller
    const whereClause: any = {
      product: {
        sellerId: req.user.id
      }
    };

    // Add date range filtering if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [interests, total] = await Promise.all([
      prisma.productOrderInterest.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              currencyCode: true,
              images: {
                where: { isPrimary: true },
                take: 1
              }
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.productOrderInterest.count({
        where: whereClause
      })
    ]);

    const transformedInterests = interests.map(interest => ({
      id: interest.id,
      productId: interest.productId,
      quantity: interest.quantity,
      originalPrice: parseFloat(interest.originalPrice.toString()),
      discountPrice: interest.discountPrice ? parseFloat(interest.discountPrice.toString()) : null,
      totalAmount: parseFloat(interest.totalAmount.toString()),
      currencyCode: interest.currencyCode,
      status: interest.status,
      preferredDeliveryDate: interest.preferredDeliveryDate,
      deliveryAddress: interest.deliveryAddress,
      contactPhone: interest.contactPhone,
      paymentMethod: interest.paymentMethod,
      paymentStatus: interest.paymentStatus,
      createdAt: interest.createdAt,
      expiresAt: interest.expiresAt,
      customer: {
        id: interest.user.id,
        name: `${interest.user.firstName} ${interest.user.lastName}`,
        phone: interest.user.phoneNumber
      },
      product: {
        id: interest.product.id,
        title: interest.product.title,
        price: parseFloat(interest.product.price.toString()),
        currencyCode: interest.product.currencyCode,
        image: interest.product.images[0]?.imageUrl || null
      }
    }));

    logger.info('Customer product interests fetched successfully:', { 
      userId: req.user.id,
      count: transformedInterests.length,
      total
    });

    res.json({
      interests: transformedInterests,
      total,
      page,
      limit,
      hasMore: skip + transformedInterests.length < total
    });
  } catch (error) {
    logger.error('Error fetching customer product interests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch customer product interests',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create order for a product
router.post('/:productId/order', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const {
      quantity = 1,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes
    } = req.body;

    logger.info('Creating order for product:', { 
      userId: req.user.id,
      productId,
      quantity
    });

    // Check if product exists and is active
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: 'ACTIVE',
        deletedAt: null,
        sellerId: {
          not: req.user.id // User can't order their own product
        }
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or not available' });
    }

    // Check if product has enough stock
    if (product.quantity < quantity) {
      return res.status(400).json({ 
        error: `Only ${product.quantity} items available in stock`,
        availableStock: product.quantity
      });
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate order totals
    const unitPrice = parseFloat(product.price.toString());
    const subtotal = unitPrice * quantity;
    const totalAmount = subtotal; // Add tax, shipping, discounts as needed

    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: (req as any).user.id },
      select: { firstName: true, lastName: true, phoneNumber: true }
    });

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: (req as any).user.id,
          sellerId: product.seller.id,
          status: 'PENDING',
          subtotal,
          totalAmount,
          currencyCode: product.currencyCode,
          customerName: customerName || `${userDetails?.firstName || ''} ${userDetails?.lastName || ''}`.trim() || 'Unknown Customer',
          customerEmail,
          customerPhone: customerPhone || userDetails?.phoneNumber || '',
          shippingAddress,
          billingAddress: billingAddress || shippingAddress,
          paymentMethod,
          notes
        }
      });

      // Create order item
      await tx.orderItem.create({
        data: {
          orderId: newOrder.id,
          productId: product.id,
          productSnapshot: {
            id: product.id,
            title: product.title,
            description: product.description,
            price: product.price,
            currencyCode: product.currencyCode,
            condition: product.condition,
            images: await tx.productImage.findMany({
              where: { productId: product.id },
              select: { imageUrl: true, isPrimary: true }
            })
          },
          quantity,
          unitPrice,
          totalPrice: subtotal
        }
      });

      // Update product stock
      await tx.product.update({
        where: { id: product.id },
        data: { quantity: product.quantity - quantity }
      });

      return newOrder;
    });

    logger.info('Order created successfully:', { 
      userId: (req as any).user.id,
      productId,
      orderId: order.id,
      orderNumber: order.orderNumber
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: parseFloat(order.totalAmount.toString()),
        currencyCode: order.currencyCode,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({ 
      error: 'Failed to create order',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get product delivery options
router.get('/:productId/delivery-options', async (req, res) => {
  try {
    const { productId } = req.params;

    const deliveryOptions = await prisma.productDeliveryOption.findMany({
      where: {
        productId,
        isActive: true
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    res.json(deliveryOptions);
  } catch (error) {
    logger.error('Error fetching delivery options:', error);
    res.status(500).json({ 
      error: 'Failed to fetch delivery options',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create or update product delivery options
router.post('/:productId/delivery-options', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;
    const { deliveryOptions } = req.body;

    // Verify the product belongs to the authenticated user
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: req.user.id
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Validate delivery options
    if (!Array.isArray(deliveryOptions) || deliveryOptions.length === 0) {
      return res.status(400).json({ error: 'At least one delivery option is required' });
    }

    const hasDefault = deliveryOptions.some((option: any) => option.isDefault);
    if (!hasDefault) {
      return res.status(400).json({ error: 'At least one delivery option must be set as default' });
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing delivery options for this product
      await tx.productDeliveryOption.deleteMany({
        where: { productId }
      });

      // Create new delivery options
      const createdOptions = await Promise.all(
        deliveryOptions.map((option: any) =>
          tx.productDeliveryOption.create({
            data: {
              productId,
              deliveryType: option.deliveryType,
              name: option.name,
              description: option.description,
              price: option.price,
              currencyCode: option.currencyCode,
              estimatedDays: option.estimatedDays,
              isDefault: option.isDefault,
              isActive: option.isActive
            }
          })
        )
      );

      return createdOptions;
    });

    logger.info('Delivery options updated successfully:', { productId, count: result.length });
    res.json(result);
  } catch (error) {
    logger.error('Error updating delivery options:', error);
    res.status(500).json({ 
      error: 'Failed to update delivery options',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete a specific delivery option
router.delete('/:productId/delivery-options/:optionId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId, optionId } = req.params;

    // Verify the product belongs to the authenticated user
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: req.user.id
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }

    // Check if this is the only delivery option
    const optionCount = await prisma.productDeliveryOption.count({
      where: { productId }
    });

    if (optionCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the only delivery option' });
    }

    // Delete the delivery option
    await prisma.productDeliveryOption.delete({
      where: { id: optionId }
    });

    logger.info('Delivery option deleted successfully:', { productId, optionId });
    res.json({ message: 'Delivery option deleted successfully' });
  } catch (error) {
    logger.error('Error deleting delivery option:', error);
    res.status(500).json({ 
      error: 'Failed to delete delivery option',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Check if user has interest in a product
router.get('/:productId/interest/check', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { productId } = req.params;

    logger.info('Checking interest existence:', { 
      userId: req.user.id,
      productId
    });

    const interest = await prisma.productOrderInterest.findFirst({
      where: {
        productId,
        userId: req.user.id,
        status: {
          in: ['PENDING', 'ACCEPTED', 'NEGOTIATING']
        }
      }
    });

    res.json({
      exists: !!interest,
      interest: interest ? {
        id: interest.id,
        status: interest.status,
        createdAt: interest.createdAt
      } : null
    });
  } catch (error) {
    logger.error('Error checking interest:', error);
    res.status(500).json({ 
      error: 'Failed to check interest',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get interest details (for seller or buyer)
router.get('/interests/:interestId', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { interestId } = req.params;

    const interest = await prisma.productOrderInterest.findUnique({
      where: { id: interestId },
      include: {
        product: {
          include: {
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            },
            images: {
              where: { isPrimary: true },
              take: 1
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    if (!interest) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    // Only allow seller or buyer to view
    if (interest.userId !== req.user.id && interest.product.seller.id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this interest' });
    }

    // Parse messages from notes if they exist
    let messages: any[] = [];
    if (interest.notes) {
      try {
        const notesData = JSON.parse(interest.notes);
        if (typeof notesData === 'object' && notesData !== null) {
          messages = Object.entries(notesData).map(([key, value]: [string, any]) => {
            const keyParts = key.split('_');
            const senderId = keyParts[0];
            const senderName = keyParts.slice(1, -1).join('_'); // Join all parts except first and last
            const timestamp = keyParts[keyParts.length - 1];
            
            return {
              id: key,
              content: value,
              senderId: senderId,
              senderName: senderName || 'Unknown',
              createdAt: new Date(parseInt(timestamp)).toISOString()
            };
          });
        }
      } catch (e) {
        // If notes is not valid JSON, treat it as a single message
        if (interest.notes.trim()) {
          messages = [{
            id: 'legacy_1',
            content: interest.notes,
            senderId: interest.userId,
            senderName: `${interest.user.firstName} ${interest.user.lastName}`,
            createdAt: interest.createdAt.toISOString()
          }];
        }
      }
    }

    res.json({
      id: interest.id,
      productId: interest.productId,
      customerId: interest.userId,
      quantity: interest.quantity,
      totalAmount: parseFloat(interest.totalAmount.toString()),
      currencyCode: interest.currencyCode,
      status: interest.status,
      createdAt: interest.createdAt,
      updatedAt: interest.updatedAt,
      product: {
        id: interest.product.id,
        title: interest.product.title,
        image: interest.product.images[0]?.imageUrl || null,
        price: parseFloat(interest.product.price.toString())
      },
      customer: {
        id: interest.user.id,
        name: `${interest.user.firstName} ${interest.user.lastName}`,
        email: interest.user.phoneNumber // Using phone as email for now
      },
      messages
    });
  } catch (error) {
    logger.error('Error fetching interest details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch interest details',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update interest status (seller only)
router.patch('/interests/:interestId/status', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { interestId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const interest = await prisma.productOrderInterest.findUnique({
      where: { id: interestId },
      include: {
        product: {
          select: { 
            sellerId: true,
            title: true
          }
        }
      }
    });

    if (!interest) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    if (interest.product.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the seller can update interest status' });
    }

    const updated = await prisma.productOrderInterest.update({
      where: { id: interestId },
      data: { status }
    });

    logger.info('Interest status updated:', { interestId, status: updated.status });
    res.json({ message: 'Interest status updated', status: updated.status });
  } catch (error) {
    logger.error('Error updating interest status:', error);
    res.status(500).json({ 
      error: 'Failed to update interest status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add message to interest
router.post('/interests/:interestId/messages', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { interestId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const interest = await prisma.productOrderInterest.findUnique({
      where: { id: interestId },
      include: {
        product: {
          select: { 
            sellerId: true,
            title: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!interest) {
      return res.status(404).json({ error: 'Interest not found' });
    }

    // Only allow seller or buyer to add messages
    if (interest.userId !== req.user.id && interest.product.sellerId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add messages to this interest' });
    }

    // Get sender details
    const sender = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        firstName: true,
        lastName: true
      }
    });

    const senderName = `${sender?.firstName || ''} ${sender?.lastName || ''}`.trim();
    const timestamp = Date.now();
    const messageKey = `${req.user.id}_${senderName}_${timestamp}`;
    const messageContent = content.trim();

    // Parse existing notes or create new object
    let notesData: any = {};
    if (interest.notes) {
      try {
        notesData = JSON.parse(interest.notes);
      } catch (e) {
        // If notes is not valid JSON, start fresh
        notesData = {};
      }
    }

    // Add new message
    notesData[messageKey] = messageContent;

    // Update interest with new message
    const updated = await prisma.productOrderInterest.update({
      where: { id: interestId },
      data: { 
        notes: JSON.stringify(notesData),
        updatedAt: new Date()
      }
    });

    const newMessage = {
      id: messageKey,
      content: messageContent,
      senderId: req.user.id,
      senderName,
      createdAt: new Date().toISOString()
    };

    // Send notification to the other party (seller if buyer sent message, buyer if seller sent message)
    try {
      if (req.user.id === interest.userId) {
        // Buyer sent message, notify seller
        await notificationService.sendMessageNotificationToSeller(
          interest.product.sellerId,
          senderName,
          interest.product.title,
          messageContent,
          interestId
        );
      } else {
        // Seller sent message, notify buyer
        await notificationService.sendMessageNotificationToBuyer(
          interest.userId,
          interest.product.title,
          messageContent,
          interestId
        );
      }
    } catch (notificationError) {
      logger.error('Error sending notification:', notificationError);
      // Don't fail the request if notification fails
    }

    logger.info('Message added to interest:', { interestId, senderId: req.user.id });
    res.json(newMessage);
  } catch (error) {
    logger.error('Error adding message to interest:', error);
    res.status(500).json({ 
      error: 'Failed to add message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 