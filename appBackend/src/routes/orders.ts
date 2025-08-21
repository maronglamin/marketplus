import express from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../utils/logger';
import { PrismaClient, TransactionType } from '@prisma/client';
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
    const existingOrder = await prisma.orders.findFirst({
      where: {
        userId,
        items: {
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
      const order = await tx.orders.create({
        data: {
          id: randomUUID(),
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
          paymentMethod: null,
          paymentStatus: 'PENDING',
          shippingMethod: deliveryOption?.name || 'STANDARD',
          updatedAt: new Date()
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
    const limit = parseInt(req.query.limit as string) || 20;
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
      prisma.orders.findMany({
        where: whereClause,
        include: {
          items: {
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
      prisma.orders.count({
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
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        createdAt: order.createdAt,
        // Payment information
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        items: order.items.map(item => ({
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
    const limit = parseInt(req.query.limit as string) || 20;
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
      prisma.orders.findMany({
        where: whereClause,
        include: {
          items: {
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
          User_orders_userIdToUser: {
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
      prisma.orders.count({
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
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        createdAt: order.createdAt,
        // Payment information
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
        customer: {
          id: order.User_orders_userIdToUser.id,
          name: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
          phone: order.User_orders_userIdToUser.phoneNumber
        },
        items: order.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            images: item.product.images.map((img: any) => img.imageUrl),
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

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        items: {
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
        User_orders_userIdToUser: true,
        User_orders_sellerIdToUser: true
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
    const transformedItems = order.items.map((item: any) => {
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
      discountAmount: order.discountAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      sellerId: order.sellerId,
      customer: order.User_orders_userIdToUser ? {
        id: order.User_orders_userIdToUser.id,
        name: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
        phone: order.User_orders_userIdToUser.phoneNumber
      } : null,
      seller: order.User_orders_sellerIdToUser ? {
        id: order.User_orders_sellerIdToUser.id,
        name: `${order.User_orders_sellerIdToUser.firstName} ${order.User_orders_sellerIdToUser.lastName}`,
        phone: order.User_orders_sellerIdToUser.phoneNumber
      } : null,
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
      })(),
      // Payment information
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentReference: order.paymentReference,
      paidAt: order.paidAt
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

    const order = await prisma.orders.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.sellerId !== userId) {
      return res.status(403).json({ message: 'Only the seller can update order status' });
    }

    const updated = await prisma.orders.update({
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

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        items: {
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
          productId: order.items[0]?.productId
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
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        shippingAmount,
        deliveryCurrency: deliveryCurrencyCode !== order.currencyCode ? deliveryCurrencyCode : null,
        totalAmount: newTotalAmount,
        shippingMethod: finalShippingMethod
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

    const order = await prisma.orders.findUnique({ where: { id: orderId } });
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

    const updated = await prisma.orders.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        // Let Prisma update the timestamp automatically
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

// Get detailed transaction information
router.get('/seller/transaction/:transactionId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { transactionId } = req.params;

    logger.info('Fetching detailed transaction:', { 
      userId: req.user.id,
      transactionId
    });

    // Parse the transaction ID to get order ID and item ID
    // Transaction ID format: orderId-itemId (both are UUIDs)
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters)
    const uuidLength = 36;
    const expectedLength = uuidLength + 1 + uuidLength; // orderId + dash + itemId
    
    if (transactionId.length !== expectedLength) {
      logger.error('Invalid transaction ID length:', { 
        transactionId, 
        actualLength: transactionId.length, 
        expectedLength 
      });
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }
    
    const orderId = transactionId.substring(0, uuidLength);
    const itemId = transactionId.substring(uuidLength + 1);
    
    logger.info('Parsed transaction ID:', { orderId, itemId, transactionId });
    
    if (!orderId || !itemId) {
      logger.error('Invalid transaction ID format - missing orderId or itemId:', { transactionId, orderId, itemId });
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    // First, let's check if the order exists
    const orderExists = await prisma.orders.findFirst({
      where: {
        id: orderId,
        sellerId: req.user.id
      }
    });

    if (!orderExists) {
      logger.error('Order not found:', { orderId, userId: req.user.id });
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if the order item exists
    const orderItemExists = await prisma.orderItem.findFirst({
      where: {
        id: itemId,
        orderId: orderId
      }
    });

    if (!orderItemExists) {
      logger.error('Order item not found:', { itemId, orderId });
      return res.status(404).json({ error: 'Order item not found' });
    }

    // Get the order with all details
    const order = await prisma.orders.findFirst({
      where: {
        id: orderId,
        sellerId: req.user.id
      },
      include: {
        items: {
          where: {
            id: itemId
          },
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        },
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true
          }
        }
      }
    });

    if (!order || order.items.length === 0) {
      logger.error('Order or order items not found after include:', { orderId, itemId });
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const orderItem = order.items[0];
    const product = orderItem.product;

    // Get the actual amounts from the database - no calculations needed
    const itemSubtotal = parseFloat(orderItem.totalPrice.toString());
    const itemTax = parseFloat(order.taxAmount.toString());
    const itemShipping = parseFloat(order.shippingAmount.toString());
    const itemDiscount = parseFloat(order.discountAmount.toString());

    // Get service fee for this order from ExternalTransaction table
    const serviceFeeTransaction = await prisma.externalTransaction.findFirst({
      where: {
        orderId: order.id,
        transactionType: 'SERVICE_FEE' as TransactionType,
        status: 'SUCCESS'
      },
      select: {
        amount: true
      }
    });

    const serviceFeeAmount = serviceFeeTransaction 
      ? parseFloat(serviceFeeTransaction.amount.toString()) 
      : 0;

    // Get item details
    const itemUnitPrice = parseFloat(orderItem.unitPrice.toString());
    const itemQuantity = orderItem.quantity;

    // Helper function to format address
    const formatAddress = (address: string | null): string => {
      if (!address) return 'No address provided';
      
      try {
        // Try to parse as JSON first
        const addressObj = JSON.parse(address);
        if (typeof addressObj === 'object' && addressObj !== null) {
          // Format JSON address object
          const parts = [];
          if (addressObj.street) parts.push(addressObj.street);
          if (addressObj.city) parts.push(addressObj.city);
          if (addressObj.state) parts.push(addressObj.state);
          if (addressObj.postalCode) parts.push(addressObj.postalCode);
          if (addressObj.country) parts.push(addressObj.country);
          return parts.join(', ');
        }
      } catch (e) {
        // If not JSON, return as is
      }
      
      return address;
    };

    const transactionDetail = {
      id: transactionId,
      productTitle: product.title,
      productDescription: product.description || 'No description available',
      productImage: product.images[0]?.imageUrl || null,
      unitPrice: itemUnitPrice,
      quantity: itemQuantity,
      subtotal: itemSubtotal,
      taxAmount: itemTax,
      shippingAmount: itemShipping,
      discountAmount: itemDiscount,
      serviceFeeAmount: serviceFeeAmount,
      totalAmount: itemSubtotal + itemTax + itemShipping - itemDiscount - serviceFeeAmount,
      currencySymbol: getCurrencySymbol(order.currencyCode),
      currencyCode: order.currencyCode,
      buyerName: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
      buyerEmail: order.customerEmail || 'No email provided',
      buyerPhone: order.User_orders_userIdToUser.phoneNumber,
      transactionDate: order.createdAt.toISOString(),
      status: getPaymentStatus(order.paymentStatus),
      orderNumber: order.orderNumber || `ORD-${order.id.slice(-8).toUpperCase()}`,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      paymentReference: order.paymentReference || null,
      shippingMethod: order.shippingMethod,
      shippingAddress: formatAddress(order.shippingAddress),
      billingAddress: order.billingAddress ? formatAddress(order.billingAddress) : null,
      trackingNumber: order.trackingNumber,
      shippedAt: order.shippedAt?.toISOString(),
      deliveredAt: order.deliveredAt?.toISOString(),
      notes: order.notes,
      sellerNotes: order.sellerNotes
    };

    logger.info('Transaction detail fetched successfully:', { 
      userId: req.user.id,
      transactionId,
      orderNumber: transactionDetail.orderNumber
    });

    res.json(transactionDetail);
  } catch (error) {
    logger.error('Error fetching transaction detail:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transaction detail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get seller transactions by currency
router.get('/seller/transactions/:currency', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { currency } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    logger.info('Fetching seller transactions by currency:', { 
      userId: req.user.id,
      currency,
      page,
      limit
    });

    // Get orders for the seller in the specified currency (include all payment statuses for now)
    const orders = await prisma.orders.findMany({
      where: {
        sellerId: req.user.id,
        currencyCode: currency
        // Temporarily remove paymentStatus filter to see all orders
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: true
              }
            }
          }
        },
        User_orders_userIdToUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Transform orders to match the frontend Transaction interface
    const transactions = orders.flatMap(order => 
      order.items.map((item: any) => {
        const transactionId = `${order.id}-${item.id}`;
        const paymentStatus = order.paymentStatus;
        const transactionStatus = getPaymentStatus(paymentStatus);
        
        logger.info('Generated transaction:', { 
          orderId: order.id, 
          itemId: item.id, 
          transactionId,
          productTitle: item.product.title,
          paymentStatus,
          transactionStatus
        });
        
        return {
          id: transactionId,
          productId: item.productId,
          productTitle: item.product.title,
          productImage: item.product.images[0]?.imageUrl || null,
          unitPrice: parseFloat(item.unitPrice.toString()),
          quantity: item.quantity,
          totalAmount: parseFloat(item.totalPrice.toString()),
          currency: order.currencyCode,
          currencySymbol: getCurrencySymbol(order.currencyCode),
          buyerName: `${order.User_orders_userIdToUser.firstName} ${order.User_orders_userIdToUser.lastName}`,
          transactionDate: order.createdAt.toISOString(),
          status: transactionStatus,
          orderNumber: order.orderNumber || `ORD-${order.id.slice(-8).toUpperCase()}`
        };
      })
    );

    // Get total count for pagination
    const totalCount = await prisma.orders.count({
      where: {
        sellerId: req.user.id,
        currencyCode: currency
        // Temporarily remove paymentStatus filter
      }
    });

    // Calculate total revenue for this currency from ALL paid orders (not just paginated)
    // Exclude refunded orders from revenue calculation
    const totalRevenueResult = await prisma.orders.aggregate({
      where: {
        sellerId: req.user.id,
        currencyCode: currency,
        paymentStatus: 'PAID' // Only count paid orders
      },
      _sum: {
        totalAmount: true
      }
    });

    // Get service fees for this currency from ExternalTransaction table
    const serviceFeesResult = await prisma.externalTransaction.aggregate({
      where: {
        sellerId: req.user.id,
        currencyCode: currency,
        transactionType: 'SERVICE_FEE' as TransactionType,
        status: 'SUCCESS'
      },
      _sum: {
        amount: true
      }
    });

    const grossRevenue = totalRevenueResult._sum?.totalAmount 
      ? parseFloat(totalRevenueResult._sum.totalAmount.toString()) 
      : 0;
    
    const totalServiceFees = serviceFeesResult._sum?.amount
      ? parseFloat(serviceFeesResult._sum.amount.toString())
      : 0;

    const totalRevenue = Math.max(0, grossRevenue - totalServiceFees);

    // Count refunded transactions for this currency
    const refundedCount = await prisma.orders.count({
      where: {
        sellerId: req.user.id,
        currencyCode: currency,
        paymentStatus: 'REFUNDED'
      }
    });

    // Log payment statuses for debugging
    const paymentStatuses = orders.map(order => ({
      orderId: order.id,
      paymentStatus: order.paymentStatus,
      status: order.status,
      totalAmount: order.totalAmount
    }));

    logger.info('Seller transactions fetched successfully:', { 
      userId: req.user.id,
      currency,
      transactionCount: transactions.length,
      totalRevenue,
      totalCount,
      refundedCount,
      paymentStatuses
    });

    res.json({
      transactions,
      totalRevenue,
      totalCount,
      refundedCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    });
  } catch (error) {
    logger.error('Error fetching seller transactions by currency:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test endpoint to check seller orders
router.get('/seller/test-orders', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    logger.info('Testing seller orders:', { userId: req.user.id });

    // Get all orders for the seller
    const allOrders = await prisma.orders.findMany({
      where: {
        sellerId: req.user.id
      },
      include: {
        items: true
      }
    });

    // Get paid orders
    const paidOrders = await prisma.orders.findMany({
      where: {
        sellerId: req.user.id,
        paymentStatus: 'PAID'
      },
      include: {
        items: true
      }
    });

    logger.info('Test results:', { 
      userId: req.user.id,
      totalOrders: allOrders.length,
      paidOrders: paidOrders.length,
      orders: allOrders.map((o: any) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        currencyCode: o.currencyCode,
        itemCount: o.items.length,
        mappedStatus: getPaymentStatus(o.paymentStatus)
      }))
    });

    res.json({
      totalOrders: allOrders.length,
      paidOrders: paidOrders.length,
      orders: allOrders.map((o: any) => ({
        id: o.id,
        status: o.status,
        paymentStatus: o.paymentStatus,
        currencyCode: o.currencyCode,
        itemCount: o.items.length,
        orderItems: o.items.map((item: any) => ({
          id: item.id,
          productId: item.productId
        }))
      }))
    });
  } catch (error) {
    logger.error('Error testing seller orders:', error);
    res.status(500).json({ 
      error: 'Failed to test orders',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Helper function to get currency symbol
function getCurrencySymbol(currencyCode: string): string {
  const currencySymbols: { [key: string]: string } = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    CAD: 'C$',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥',
    INR: '₹',
    BRL: 'R$',
    MXN: '$',
    KRW: '₩',
    SGD: 'S$',
    HKD: 'HK$',
    NZD: 'NZ$',
  };
  return currencySymbols[currencyCode] || currencyCode;
}

// Helper function to map payment status to transaction status
function getPaymentStatus(paymentStatus: string): 'completed' | 'pending' | 'cancelled' | 'refunded' {
  switch (paymentStatus?.toUpperCase()) {
    case 'PAID':
    case 'COMPLETED':
    case 'SUCCESS':
    case 'SETTLED':
    case 'CONFIRMED':
      return 'completed';
    case 'PENDING':
    case 'AUTHORIZED':
    case 'PROCESSING':
    case 'AWAITING_PAYMENT':
    case 'PAYMENT_PENDING':
      return 'pending';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'refunded';
    case 'FAILED':
    case 'CANCELLED':
    case 'DECLINED':
    case 'VOIDED':
    case 'EXPIRED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Helper function to map order status to transaction status
function getOrderStatus(orderStatus: string): 'completed' | 'pending' | 'cancelled' | 'refunded' {
  switch (orderStatus) {
    case 'CONFIRMED':
    case 'AUTHORIZED':
      return 'completed';
    case 'PENDING':
    case 'PROCESSING':
      return 'pending';
    case 'CANCELLED':
    case 'FAILED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

// Apply discount to order
router.patch('/:orderId/product-price', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { orderId } = req.params;
    const { newPrice, currency } = req.body;

    // Validate inputs
    if (!newPrice || typeof newPrice !== 'number' || newPrice <= 0) {
      return res.status(400).json({ error: 'Invalid price. Must be a positive number.' });
    }

    if (!currency || typeof currency !== 'string') {
      return res.status(400).json({ error: 'Invalid currency.' });
    }

    // Find the order
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Security check - only seller can apply discount
    if (order.sellerId !== req.user?.id) {
      return res.status(403).json({ error: 'Access denied. Only the product owner can apply discount.' });
    }

    // Check if payment is completed
    if (order.paymentStatus?.toUpperCase() === 'PAID') {
      return res.status(400).json({ error: 'Discount cannot be applied after payment is completed.' });
    }

    // Calculate the original total (without any existing discount)
    const originalSubtotal = order.items.reduce((total: number, item: any) => {
      return total + parseFloat(item.unitPrice.toString()) * item.quantity;
    }, 0);
    
    const originalTotal = originalSubtotal + parseFloat(order.shippingAmount.toString());

    // The newPrice is actually the discount amount
    const discountAmount = newPrice;

    // Calculate the new total by subtracting the discount from the original total
    const newTotal = originalTotal - discountAmount;

    // Validate discount is not negative or exceeds total
    if (discountAmount < 0) {
      return res.status(400).json({ error: 'Discount amount must be positive.' });
    }

    if (discountAmount >= originalTotal) {
      return res.status(400).json({ error: 'Discount amount cannot exceed or equal the total order amount.' });
    }

    // Update the order with new total and discount (keep original order item prices)
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        totalAmount: newTotal,
        discountAmount: discountAmount,
        currencyCode: currency
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        User_orders_userIdToUser: true,
        User_orders_sellerIdToUser: true
      }
    });

    logger.info('Discount applied successfully:', {
      orderId,
      sellerId: req.user?.id,
      newPrice,
      currency,
      originalTotal,
      newTotal,
      discountAmount
    });

    res.json({
      message: 'Discount applied successfully',
      order: {
        id: updatedOrder.id,
        totalAmount: updatedOrder.totalAmount,
        discountAmount: updatedOrder.discountAmount,
        currencyCode: updatedOrder.currencyCode,
        items: updatedOrder.items.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          product: {
            id: item.product.id,
            title: item.product.title
          }
        }))
      }
    });

  } catch (error) {
    logger.error('Error applying discount:', error);
    res.status(500).json({ 
      error: 'Failed to apply discount',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 