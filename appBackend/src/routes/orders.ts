import express from 'express';
import { logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Extend Express Request to include user
interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    phoneNumber: string;
  };
}

// Test route
router.get('/test', (req, res) => {
  logger.info('Orders test route hit');
  res.json({ message: 'Orders routes working!' });
});

// Create a new order
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, quantity, deliveryOptionId, totalAmount, currencyCode, deliveryCurrency, shippingAddress } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Creating order:', {
      userId,
      productId,
      quantity,
      deliveryOptionId,
      totalAmount,
      currencyCode,
      deliveryCurrency,
      shippingAddress
    });

    // Validate required fields
    if (!productId || !quantity || !totalAmount || !currencyCode) {
      return res.status(400).json({
        message: 'Missing required fields: productId, quantity, totalAmount, currencyCode'
      });
    }

    // Check if product exists and has sufficient quantity
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: true
      }
    });

    if (!product) {
      return res.status(404).json({
        message: 'Product not found'
      });
    }

    if (product.quantity < quantity) {
      return res.status(400).json({
        message: `Insufficient quantity. Available: ${product.quantity}, Requested: ${quantity}`
      });
    }

    // Check if user already has an active order for this product
    const existingOrder = await prisma.order.findFirst({
      where: {
        userId,
        orderItems: {
          some: { productId }
        },
        status: {
          notIn: ['CANCELLED', 'REFUNDED']
        }
      }
    });
    if (existingOrder) {
      return res.status(409).json({ message: 'Order already exist' });
    }

    // Get delivery option if provided
    let deliveryOption = null;
    let shippingAmount = 0;
    let deliveryCurrencyCode = currencyCode;

    if (deliveryOptionId) {
      deliveryOption = await prisma.productDeliveryOption.findUnique({
        where: { id: deliveryOptionId }
      });

      if (deliveryOption) {
        shippingAmount = Number(deliveryOption.price);
        deliveryCurrencyCode = deliveryOption.currencyCode;
      }
    }

    // Get customer (buyer) information
    const customer = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        phoneNumber: true
      }
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    // Calculate subtotal (product price * quantity)
    const subtotal = Number(product.price) * quantity;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create order and order items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          userId,
          sellerId: product.sellerId,
          status: 'PENDING',
          subtotal,
          taxAmount: 0,
          shippingAmount,
          discountAmount: 0,
          totalAmount,
          currencyCode,
          deliveryCurrency: deliveryCurrencyCode !== currencyCode ? deliveryCurrencyCode : null,
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phoneNumber,
          shippingAddress: shippingAddress || 'To be provided',
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
          shippingMethod: deliveryOption?.name || 'STANDARD'
        }
      });

      // Create order item
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          productSnapshot: {
            title: product.title,
            price: product.price,
            currencyCode: product.currencyCode,
            condition: product.condition
          },
          quantity,
          unitPrice: product.price,
          totalPrice: subtotal,
          status: 'PENDING'
        }
      });

      // Update product quantity
      await tx.product.update({
        where: { id: productId },
        data: { quantity: product.quantity - quantity }
      });

      return { order, orderItem };
    });

    logger.info('Order created successfully:', {
      orderId: result.order.id,
      userId,
      productId,
      deliveryCurrency: result.order.deliveryCurrency
    });

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        totalAmount: result.order.totalAmount,
        currencyCode: result.order.currencyCode,
        deliveryCurrency: result.order.deliveryCurrency,
        status: result.order.status
      }
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      message: 'Failed to create order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user's orders
router.get('/my-orders', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build where clause
    const whereClause: any = { userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  seller: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1
                  }
                }
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
      prisma.order.count({
        where: whereClause
      })
    ]);

    const hasMore = skip + limit < total;

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currencyCode: order.currencyCode,
        deliveryCurrency: order.deliveryCurrency,
        status: order.status,
        shippingMethod: order.shippingMethod,
        createdAt: order.createdAt,
        items: order.orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            images: item.product.images.map(img => img.imageUrl),
            seller: {
              id: item.product.seller.id,
              name: `${item.product.seller.firstName} ${item.product.seller.lastName}`
            }
          }
        }))
      })),
      hasMore,
      total,
      page,
      limit
    });

  } catch (error) {
    logger.error('Error fetching user orders:', error);
    res.status(500).json({
      message: 'Failed to fetch orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get customer orders (orders where user is the seller)
router.get('/customer-orders', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 6;
    const skip = (page - 1) * limit;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build where clause - user is the seller
    const whereClause: any = { sellerId: userId };

    // Add date range filtering if provided
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  seller: true,
                  images: {
                    where: { isPrimary: true },
                    take: 1
                  }
                }
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
      prisma.order.count({
        where: whereClause
      })
    ]);

    const hasMore = skip + limit < total;

    res.json({
      orders: orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        currencyCode: order.currencyCode,
        deliveryCurrency: order.deliveryCurrency,
        status: order.status,
        shippingMethod: order.shippingMethod,
        createdAt: order.createdAt,
        customer: {
          id: order.user.id,
          name: `${order.user.firstName} ${order.user.lastName}`,
          phone: order.user.phoneNumber
        },
        items: order.orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            images: item.product.images.map(img => img.imageUrl),
            seller: {
              id: item.product.seller.id,
              name: `${item.product.seller.firstName} ${item.product.seller.lastName}`
            }
          }
        }))
      })),
      hasMore,
      total,
      page,
      limit
    });

  } catch (error) {
    logger.error('Error fetching customer orders:', error);
    res.status(500).json({
      message: 'Failed to fetch customer orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get order details (seller or buyer)
router.get('/:orderId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                seller: true,
                images: {
                  where: { isPrimary: true },
                  take: 1
                },
                deliveryOptions: {
                  where: { isActive: true },
                  orderBy: [
                    { isDefault: 'desc' },
                    { createdAt: 'asc' }
                  ]
                }
              }
            }
          }
        },
        user: true,
        seller: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only allow seller or buyer to view
    if (order.userId !== userId && order.sellerId !== userId) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    // Transform order items, handling cases where product might not exist
    const transformedItems = order.orderItems.map((item: any) => {
      // Check if product exists and is accessible
      if (!item.product) {
        // Product was deleted, return basic item info
        return {
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: 'deleted',
            title: 'Product No Longer Available',
            images: [],
            seller: {
              id: 'unknown',
              name: 'Unknown Seller'
            },
            deliveryOptions: []
          }
        };
      }

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        product: {
          id: item.product.id,
          title: item.product.title,
          images: item.product.images.map((img: any) => img.imageUrl),
          seller: {
            id: item.product.seller.id,
            name: `${item.product.seller.firstName} ${item.product.seller.lastName}`
          },
          deliveryOptions: item.product.deliveryOptions || []
        }
      };
    });

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      currencyCode: order.currencyCode,
      deliveryCurrency: order.deliveryCurrency,
      shippingAmount: order.shippingAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      sellerId: order.sellerId,
      customer: {
        id: order.user.id,
        name: `${order.user.firstName} ${order.user.lastName}`,
        phone: order.user.phoneNumber
      },
      seller: {
        id: order.seller.id,
        name: `${order.seller.firstName} ${order.seller.lastName}`,
        phone: order.seller.phoneNumber
      },
      items: transformedItems,
      shippingMethod: order.shippingMethod,
      shippingAddress: (() => {
        if (!order.shippingAddress) return null;
        try {
          return JSON.parse(order.shippingAddress);
        } catch (e) {
          // If it's not valid JSON, return it as a simple string
          return { address: order.shippingAddress };
        }
      })()
    });
  } catch (error) {
    logger.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Failed to fetch order details', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update order status (seller only)
router.patch('/:orderId/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { status } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!status) {
      return res.status(400).json({ message: 'Missing status' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.sellerId !== userId) {
      return res.status(403).json({ message: 'Only the seller can update order status' });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
    res.json({ message: 'Order status updated', status: updated.status });
  } catch (error) {
    logger.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Update delivery pricing for an order (seller only)
router.patch('/:orderId/delivery-pricing', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { deliveryOptionId, customPrice, customCurrency, deliveryType, shippingMethod } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                deliveryOptions: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.sellerId !== userId) {
      return res.status(403).json({ message: 'Only the seller can update delivery pricing' });
    }

    // Validate delivery option exists and belongs to the product
    let deliveryOption = null;
    if (deliveryOptionId) {
      deliveryOption = await prisma.productDeliveryOption.findFirst({
        where: {
          id: deliveryOptionId,
          productId: order.orderItems[0]?.productId
        }
      });

      if (!deliveryOption) {
        return res.status(404).json({ message: 'Delivery option not found' });
      }
    }

    // Calculate new shipping amount
    let shippingAmount = 0;
    let deliveryCurrencyCode = order.currencyCode;

    if (customPrice !== undefined && customPrice !== null) {
      shippingAmount = Number(customPrice);
      deliveryCurrencyCode = customCurrency || order.currencyCode;
    } else if (deliveryOption) {
      shippingAmount = Number(deliveryOption.price);
      deliveryCurrencyCode = deliveryOption.currencyCode;
    }

    // Recalculate total amount
    const subtotal = Number(order.subtotal);
    const newTotalAmount = subtotal + shippingAmount;

    // Determine the shipping method to use
    let finalShippingMethod = order.shippingMethod; // Keep existing if no new one provided
    
    if (shippingMethod) {
      // Use the shipping method provided by frontend
      finalShippingMethod = shippingMethod;
    } else if (deliveryOption) {
      // Use delivery option name if no shipping method provided
      finalShippingMethod = deliveryOption.name;
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        shippingAmount,
        deliveryCurrency: deliveryCurrencyCode !== order.currencyCode ? deliveryCurrencyCode : null,
        totalAmount: newTotalAmount,
        shippingMethod: finalShippingMethod,
        updatedAt: new Date()
      }
    });

    logger.info('Delivery pricing updated:', {
      orderId,
      sellerId: userId,
      shippingAmount,
      deliveryCurrency: deliveryCurrencyCode,
      totalAmount: newTotalAmount,
      shippingMethod: finalShippingMethod,
      deliveryType
    });

    res.json({
      message: 'Delivery pricing updated successfully',
      order: {
        id: updatedOrder.id,
        shippingAmount: updatedOrder.shippingAmount,
        deliveryCurrency: updatedOrder.deliveryCurrency,
        totalAmount: updatedOrder.totalAmount,
        shippingMethod: updatedOrder.shippingMethod
      }
    });

  } catch (error) {
    logger.error('Error updating delivery pricing:', error);
    res.status(500).json({ 
      message: 'Failed to update delivery pricing', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Buyer authorization endpoint (buyer only)
router.patch('/:orderId/authorize', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { orderId } = req.params;
    const { action } = req.body; // 'authorize' or 'cancel'

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    if (!action || !['authorize', 'cancel'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "authorize" or "cancel"' });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Only the buyer (userId) can authorize/cancel the order
    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Only the buyer can authorize or cancel this order' });
    }

    // Validate status transitions
    const allowedStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'AUTHORIZED'];
    if (!allowedStatuses.includes(order.status)) {
      return res.status(400).json({ 
        message: `Cannot ${action} order with status: ${order.status}` 
      });
    }

    const newStatus = action === 'authorize' ? 'AUTHORIZED' : 'CANCELLED';

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        updatedAt: new Date()
      }
    });

    logger.info('Order authorization updated:', {
      orderId,
      buyerId: userId,
      action,
      oldStatus: order.status,
      newStatus: updated.status
    });

    res.json({ 
      message: `Order ${action}d successfully`, 
      status: updated.status 
    });
  } catch (error) {
    logger.error('Error updating order authorization:', error);
    res.status(500).json({ 
      message: 'Failed to update order authorization', 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get order count for a specific product (for seller)
router.get('/product/:productId/count', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const { productId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching order count for product:', { 
      userId,
      productId
    });

    // First verify the product belongs to the seller
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        sellerId: userId
      }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or access denied' });
    }

    // Count orders that contain this product
    const orderCount = await prisma.orderItem.count({
      where: {
        productId: productId,
        order: {
          status: {
            notIn: ['CANCELLED', 'REFUNDED']
          }
        }
      }
    });

    logger.info('Order count fetched successfully:', { 
      userId,
      productId,
      orderCount
    });

    res.json({
      productId,
      orderCount
    });

  } catch (error) {
    logger.error('Error fetching order count:', error);
    res.status(500).json({ 
      message: 'Failed to fetch order count',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 