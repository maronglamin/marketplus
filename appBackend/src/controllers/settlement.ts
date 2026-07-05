import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Get available revenue for settlement (ecommerce)
export const getAvailableRevenue = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching available revenue for settlement:', { userId: req.user.id });

    // First, get all sales rep user IDs for this parent seller
    const salesReps = await prisma.salesRep.findMany({
      where: {
        parentSellerId: req.user.id,
        status: 'ACTIVE'
      },
      select: {
        userId: true
      }
    });

    const salesRepUserIds = salesReps.map(rep => rep.userId);
    logger.info('Sales rep user IDs found:', { salesRepUserIds, salesRepsCount: salesReps.length });

    // Get all PAID orders (excluding SETTLED orders) for parent seller and their sales reps
    const paidOrders = await prisma.orders.findMany({
      where: {
        OR: [
          // Parent seller's own orders
          {
            sellerId: req.user.id,
            paymentStatus: 'PAID'
          },
          // Sales rep orders (where sellerId is a sales rep's userId and that sales rep belongs to this parent)
          {
            sellerId: {
              in: salesRepUserIds
            },
            paymentStatus: 'PAID'
          }
        ]
      },
      select: {
        id: true,
        totalAmount: true,
        currencyCode: true,
        createdAt: true,
        sellerId: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info('Paid orders found for available revenue:', { 
      totalOrders: paidOrders.length,
      orders: paidOrders.map(order => ({
        id: order.id,
        sellerId: order.sellerId,
        totalAmount: order.totalAmount.toString(),
        currency: order.currencyCode,
        isParentOrder: order.sellerId === req.user.id,
        isSalesRepOrder: salesRepUserIds.includes(order.sellerId)
      }))
    });

    // Group orders by currency and calculate totals
    const revenueByCurrency = new Map<string, number>();
    const orderIds = paidOrders.map(order => order.id);
    
    // Get service fees for these specific orders
    const serviceFees = await prisma.externalTransaction.findMany({
      where: {
        orderId: { in: orderIds },
        transactionType: 'SERVICE_FEE',
        status: 'SUCCESS'
      },
      select: {
        orderId: true,
        amount: true,
        currencyCode: true
      }
    });

    // Separate parent and sales rep orders
    const parentOrders = paidOrders.filter(order => order.sellerId === req.user.id);
    const salesRepOrders = paidOrders.filter(order => salesRepUserIds.includes(order.sellerId));

    // Calculate parent revenue per currency
    const parentCurrencyData = new Map<string, { grossAmount: number; serviceFees: number }>();
    const parentOrderIds = parentOrders.map(order => order.id);
    const parentServiceFees = serviceFees.filter(fee => parentOrderIds.includes(fee.orderId));

    parentOrders.forEach(order => {
      const currency = order.currencyCode;
      const amount = parseFloat(order.totalAmount.toString());
      
      if (!parentCurrencyData.has(currency)) {
        parentCurrencyData.set(currency, { grossAmount: 0, serviceFees: 0 });
      }
      
      const data = parentCurrencyData.get(currency)!;
      data.grossAmount += amount;
    });

    parentServiceFees.forEach(fee => {
      const currency = fee.currencyCode;
      const feeAmount = parseFloat(fee.amount.toString());
      
      if (parentCurrencyData.has(currency)) {
        const data = parentCurrencyData.get(currency)!;
        data.serviceFees += feeAmount;
      }
    });

    // Calculate sales rep revenue per currency
    const salesRepCurrencyData = new Map<string, { grossAmount: number; serviceFees: number }>();
    const salesRepOrderIds = salesRepOrders.map(order => order.id);
    const salesRepServiceFees = serviceFees.filter(fee => salesRepOrderIds.includes(fee.orderId));

    salesRepOrders.forEach(order => {
      const currency = order.currencyCode;
      const amount = parseFloat(order.totalAmount.toString());
      
      if (!salesRepCurrencyData.has(currency)) {
        salesRepCurrencyData.set(currency, { grossAmount: 0, serviceFees: 0 });
      }
      
      const data = salesRepCurrencyData.get(currency)!;
      data.grossAmount += amount;
    });

    salesRepServiceFees.forEach(fee => {
      const currency = fee.currencyCode;
      const feeAmount = parseFloat(fee.amount.toString());
      
      if (salesRepCurrencyData.has(currency)) {
        const data = salesRepCurrencyData.get(currency)!;
        data.serviceFees += feeAmount;
      }
    });

    // Calculate net revenue per currency for parent
    const parentRevenues = Array.from(parentCurrencyData.entries())
      .map(([currency, data]) => {
        const netAmount = Math.max(0, data.grossAmount - data.serviceFees);
        const roundedAmount = Math.round(netAmount * 100) / 100;
        return { currency, amount: roundedAmount, currencySymbol: getCurrencySymbol(currency) };
      })
      .filter(revenue => revenue.amount > 0);

    // Calculate net revenue per currency for sales reps
    const salesRepRevenues = Array.from(salesRepCurrencyData.entries())
      .map(([currency, data]) => {
        const netAmount = Math.max(0, data.grossAmount - data.serviceFees);
        const roundedAmount = Math.round(netAmount * 100) / 100;
        return { currency, amount: roundedAmount, currencySymbol: getCurrencySymbol(currency) };
      })
      .filter(revenue => revenue.amount > 0);

    // Get sales rep details for the response
    const salesRepDetails = await prisma.salesRep.findMany({
      where: {
        parentSellerId: req.user.id,
        status: 'ACTIVE'
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Group sales rep orders by sales rep
    const salesRepOrderGroups = new Map<string, any[]>();
    salesRepOrders.forEach(order => {
      const salesRepId = salesReps.find(rep => rep.userId === order.sellerId)?.userId;
      if (salesRepId) {
        if (!salesRepOrderGroups.has(salesRepId)) {
          salesRepOrderGroups.set(salesRepId, []);
        }
        salesRepOrderGroups.get(salesRepId)!.push(order);
      }
    });

    // Calculate revenue per sales rep
    const salesRepRevenueDetails = salesRepDetails.map(rep => {
      const repOrders = salesRepOrderGroups.get(rep.userId) || [];
      const repOrderIds = repOrders.map(order => order.id);
      const repServiceFees = serviceFees.filter(fee => repOrderIds.includes(fee.orderId));

      const repCurrencyData = new Map<string, { grossAmount: number; serviceFees: number }>();
      
      repOrders.forEach(order => {
        const currency = order.currencyCode;
        const amount = parseFloat(order.totalAmount.toString());
        
        if (!repCurrencyData.has(currency)) {
          repCurrencyData.set(currency, { grossAmount: 0, serviceFees: 0 });
        }
        
        const data = repCurrencyData.get(currency)!;
        data.grossAmount += amount;
      });

      repServiceFees.forEach(fee => {
        const currency = fee.currencyCode;
        const feeAmount = parseFloat(fee.amount.toString());
        
        if (repCurrencyData.has(currency)) {
          const data = repCurrencyData.get(currency)!;
          data.serviceFees += feeAmount;
        }
      });

      const repRevenues = Array.from(repCurrencyData.entries())
        .map(([currency, data]) => {
          const netAmount = Math.max(0, data.grossAmount - data.serviceFees);
          const roundedAmount = Math.round(netAmount * 100) / 100;
          return { currency, amount: roundedAmount, currencySymbol: getCurrencySymbol(currency) };
        })
        .filter(revenue => revenue.amount > 0);

      return {
        salesRepId: rep.id,
        userId: rep.userId,
        name: `${rep.user.firstName} ${rep.user.lastName}`,
        revenues: repRevenues,
        totalAmount: repRevenues.reduce((sum, rev) => sum + rev.amount, 0)
      };
    }).filter(rep => rep.totalAmount > 0);

    logger.info('Available revenue calculated successfully:', { 
      userId: req.user.id,
      parentRevenues: parentRevenues.map(r => ({ currency: r.currency, amount: r.amount })),
      salesRepRevenueDetails: salesRepRevenueDetails.map(rep => ({
        name: rep.name,
        totalAmount: rep.totalAmount,
        revenues: rep.revenues.map(r => ({ currency: r.currency, amount: r.amount }))
      }))
    });

    res.json({
      parentRevenue: {
        revenues: parentRevenues,
        count: parentRevenues.length
      },
      salesRepRevenue: {
        salesReps: salesRepRevenueDetails,
        count: salesRepRevenueDetails.length
      }
    });
  } catch (error) {
    logger.error('Error getting available revenue:', error);
    res.status(500).json({ 
      message: 'Failed to get available revenue',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available ride earnings for settlement (rides)
export const getAvailableRideEarnings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching available ride earnings for settlement:', { userId: req.user.id });

    // Get driver record
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Get all completed rides with pending settlement
    const availableRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        settlementStatus: 'PENDING'
      },
      select: {
        id: true,
        rideId: true,
        rideRequest: {
          select: {
            requestId: true,
            currency: true
          }
        },
        driverEarnings: true,
        totalFare: true,
        platformFee: true,
        createdAt: true,
        completedAt: true
      },
      orderBy: {
        completedAt: 'asc'
      }
    });

    // Group by currency (using GMD as default for rides)
    const earningsByCurrency = new Map<string, { amount: number; rides: any[] }>();
    
    availableRides.forEach(ride => {
      const currency = ride.rideRequest?.currency || 'GMD'; // Get currency from rideRequest or default to GMD
      const earnings = parseFloat(ride.driverEarnings.toString());
      
      if (!earningsByCurrency.has(currency)) {
        earningsByCurrency.set(currency, { amount: 0, rides: [] });
      }
      
      const currencyData = earningsByCurrency.get(currency)!;
      currencyData.amount += earnings;
      currencyData.rides.push({
        id: ride.id,
        rideId: ride.rideId,
        requestId: ride.rideRequest?.requestId,
        driverEarnings: earnings,
        totalFare: parseFloat(ride.totalFare.toString()),
        platformFee: parseFloat(ride.platformFee.toString()),
        createdAt: ride.createdAt,
        completedAt: ride.completedAt
      });
    });

    // Convert to array format
    const earnings = Array.from(earningsByCurrency.entries())
      .map(([currency, data]) => ({
        currency,
        amount: Math.round(data.amount * 100) / 100,
        currencySymbol: getCurrencySymbol(currency),
        ridesCount: data.rides.length,
        rides: data.rides
      }));

    logger.info('Available ride earnings calculated successfully:', { 
      userId: req.user.id,
      driverId: driver.id,
      earnings: earnings.map(e => ({ currency: e.currency, amount: e.amount, ridesCount: e.ridesCount }))
    });

    res.json({
      earnings,
      count: earnings.length,
      totalRides: availableRides.length
    });
  } catch (error) {
    logger.error('Error getting available ride earnings:', error);
    res.status(500).json({ 
      message: 'Failed to get available ride earnings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get available rental earnings for settlement (rentals)
export const getAvailableRentalEarnings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching available rental earnings for settlement:', { userId: req.user.id });

    // Get successful external transactions for rentals where current user is seller (asset owner)
    const txs = await prisma.externalTransaction.findMany({
      where: {
        sellerId: req.user.id,
        appService: 'RENTAL',
        status: 'SUCCESS',
        rentalRequestId: { not: null }
      },
      select: {
        rentalRequestId: true,
        amount: true,
        currencyCode: true,
        transactionType: true
      }
    });

    if (txs.length === 0) {
      return res.json({
        earnings: [],
        count: 0,
        totalRentals: 0
      });
    }

    // Get rental requests to check settlement status and requestId
    const rentalIds = Array.from(new Set(txs.map(t => t.rentalRequestId!).filter(Boolean)));
    const rentals = await prisma.rentalRequest.findMany({
      where: { id: { in: rentalIds } },
      select: { id: true, requestId: true, createdAt: true, rentalSettlementStatus: true, currency: true }
    });
    const rentalById = new Map(rentals.map(r => [r.id, r]));

    // Group by currency and compute net = sum(ORIGINAL) - sum(SERVICE_FEE), excluding settled rentals
    const earningsByCurrency = new Map<string, { amount: number; rentals: any[] }>();
    const serviceFeesByRental = new Map<string, number>();
    const originalsByRental = new Map<string, number>();

    for (const t of txs) {
      const rid = t.rentalRequestId!;
      if (!rentalById.has(rid)) continue;
      const rr = rentalById.get(rid)!;
      // Skip rentals already settled
      if ((rr.rentalSettlementStatus as any) === 'SETTLED') continue;

      if (t.transactionType === 'SERVICE_FEE') {
        serviceFeesByRental.set(rid, (serviceFeesByRental.get(rid) || 0) + parseFloat(t.amount.toString()));
      } else if (t.transactionType === 'ORIGINAL') {
        originalsByRental.set(rid, (originalsByRental.get(rid) || 0) + parseFloat(t.amount.toString()));
      }
    }

    // Build currency buckets
    for (const rid of originalsByRental.keys()) {
      const rr = rentalById.get(rid);
      if (!rr) continue;
      const currency = rr.currency || 'GMD';
      const gross = originalsByRental.get(rid) || 0;
      const svc = serviceFeesByRental.get(rid) || 0;
      const net = Math.max(0, gross - svc);
      if (net <= 0) continue;

      if (!earningsByCurrency.has(currency)) {
        earningsByCurrency.set(currency, { amount: 0, rentals: [] });
      }
      const bucket = earningsByCurrency.get(currency)!;
      bucket.amount += net;
      bucket.rentals.push({
        id: rid,
        requestId: rr.requestId,
        earnings: net,
        createdAt: rr.createdAt
      });
    }

    const earnings = Array.from(earningsByCurrency.entries()).map(([currency, data]) => ({
      currency,
      amount: Math.round(data.amount * 100) / 100,
      currencySymbol: getCurrencySymbol(currency),
      rentalsCount: data.rentals.length,
      rentals: data.rentals
    }));

    logger.info('Available rental earnings calculated successfully:', {
      userId: req.user.id,
      earnings: earnings.map(e => ({ currency: e.currency, amount: e.amount, rentalsCount: e.rentalsCount }))
    });

    res.json({
      earnings,
      count: earnings.length,
      totalRentals: earnings.reduce((sum, e) => sum + e.rentalsCount, 0)
    });
  } catch (error) {
    logger.error('Error getting available rental earnings:', error);
    res.status(500).json({
      message: 'Failed to get available rental earnings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
// Get available home service earnings for settlement
export const getAvailableHomeServiceEarnings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'User not authenticated' });
    const txs = await prisma.externalTransaction.findMany({
      where: {
        sellerId: req.user.id,
        appService: 'HOME_SERVICES',
        status: 'SUCCESS',
        transactionType: 'ORIGINAL',
        serviceBookingId: { not: null },
      },
      select: { amount: true, currencyCode: true, serviceBookingId: true },
    });
    const byCurrency: Record<string, number> = {};
    for (const t of txs) {
      byCurrency[t.currencyCode] = (byCurrency[t.currencyCode] || 0) + Number(t.amount);
    }
    const earnings = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100,
      currencySymbol: getCurrencySymbol(currency),
    }));
    res.json({ earnings, count: earnings.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get home service earnings' });
  }
};

// Get available real estate earnings for settlement
export const getAvailableRealEstateEarnings = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ message: 'User not authenticated' });
    const txs = await prisma.externalTransaction.findMany({
      where: {
        sellerId: req.user.id,
        appService: 'REAL_ESTATE',
        status: 'SUCCESS',
        transactionType: 'ORIGINAL',
        propertyBookingId: { not: null },
      },
      select: { amount: true, currencyCode: true, propertyBookingId: true },
    });
    const byCurrency: Record<string, number> = {};
    for (const t of txs) {
      byCurrency[t.currencyCode] = (byCurrency[t.currencyCode] || 0) + Number(t.amount);
    }
    const earnings = Object.entries(byCurrency).map(([currency, amount]) => ({
      currency,
      amount: Math.round(amount * 100) / 100,
      currencySymbol: getCurrencySymbol(currency),
    }));
    res.json({ earnings, count: earnings.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get real estate earnings' });
  }
};
// Get seller's bank accounts
export const getBankAccounts = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching bank accounts for settlement:', { userId: req.user.id });

    // Get seller's KYC record
    const sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        bankAccounts: {
          where: { status: 'ACTIVE' },
          orderBy: { isDefault: 'desc' }
        }
      }
    });

    if (!sellerKyc) {
      return res.json({
        bankAccounts: [],
        count: 0
      });
    }

    logger.info('Bank accounts fetched successfully:', { 
      userId: req.user.id,
      count: sellerKyc.bankAccounts.length
    });

    res.json({
      bankAccounts: sellerKyc.bankAccounts,
      count: sellerKyc.bankAccounts.length
    });
  } catch (error) {
    logger.error('Error getting bank accounts:', error);
    res.status(500).json({ 
      message: 'Failed to get bank accounts',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get seller's wallets
export const getWallets = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching wallets for settlement:', { userId: req.user.id });

    // Get seller's KYC record
    const sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        wallets: {
          where: { status: 'ACTIVE' },
          orderBy: { isDefault: 'desc' }
        }
      }
    });

    if (!sellerKyc) {
      return res.json({
        wallets: [],
        count: 0
      });
    }

    logger.info('Wallets fetched successfully:', { 
      userId: req.user.id,
      count: sellerKyc.wallets.length
    });

    res.json({
      wallets: sellerKyc.wallets,
      count: sellerKyc.wallets.length
    });
  } catch (error) {
    logger.error('Error getting wallets:', error);
    res.status(500).json({ 
      message: 'Failed to get wallets',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create settlement request with enhanced financial integrity
export const createSettlementRequest = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { amount, currency, type, bankAccountId, walletId, channel = 'ECOMMERCE' } = req.body;

    // Validate required fields
    if (!amount || !currency || !type) {
      return res.status(400).json({
        message: 'Missing required fields: amount, currency, type'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        message: 'Amount must be greater than 0'
      });
    }

    // Validate settlement type
    if (!['BANK_TRANSFER', 'WALLET_TRANSFER'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid settlement type. Must be BANK_TRANSFER or WALLET_TRANSFER'
      });
    }

    // Validate channel
    if (!['ECOMMERCE', 'RIDES', 'RENTALS'].includes(channel)) {
      return res.status(400).json({
        message: 'Invalid channel. Must be ECOMMERCE, RIDES or RENTALS'
      });
    }

    // Validate payment method selection
    if (type === 'BANK_TRANSFER' && !bankAccountId) {
      return res.status(400).json({
        message: 'Bank account ID is required for bank transfer'
      });
    }

    if (type === 'WALLET_TRANSFER' && !walletId) {
      return res.status(400).json({
        message: 'Wallet ID is required for wallet transfer'
      });
    }

    logger.info('Creating settlement request:', { 
      userId: req.user.id,
      amount,
      currency,
      type,
      channel,
      bankAccountId,
      walletId
    });

    // Get sales rep ID from route parameter if this is a sales rep settlement request
    const salesRepId = req.params?.salesRepId;

    // Calculate settlement data based on channel
    let settlementData: any;
    if (channel === 'ECOMMERCE') {
      settlementData = await calculateEcommerceSettlementData(req.user.id, currency, amount, salesRepId);
    } else if (channel === 'RIDES') {
      settlementData = await calculateRidesSettlementData(req.user.id, currency, amount);
    } else {
      settlementData = await calculateRentalsSettlementData(req.user.id, currency, amount);
    }
    
    if (!settlementData.isValid) {
      return res.status(400).json({
        message: settlementData.error || 'Insufficient available revenue for settlement'
      });
    }

    // Generate unique reference
    const reference = `SETTLE-${channel}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create settlement record with enhanced tracking
    const settlement = await prisma.settlement.create({
      data: {
        userId: req.user.id,
        amount: settlementData.netAmount || 0,
        currency,
        status: 'PENDING',
        type,
        channel,
        reference,
        bankAccountId: type === 'BANK_TRANSFER' ? bankAccountId : null,
        walletId: type === 'WALLET_TRANSFER' ? walletId : null,
        includedOrderIds: channel === 'ECOMMERCE' ? settlementData.includedOrderIds : null,
        includedRideIds: channel === 'RIDES' ? settlementData.includedRideIds : null,
        includedRentalIds: channel === 'RENTALS' ? settlementData.includedRentalIds : null,
        totalOrdersCount: channel === 'ECOMMERCE' ? settlementData.totalOrdersCount : 0,
        totalRidesCount: channel === 'RIDES' ? settlementData.totalRidesCount : 0,
        totalRentalsCount: channel === 'RENTALS' ? settlementData.totalRentalsCount : 0,
        // For rentals, include rental ids in metadata
        serviceFeesDeducted: settlementData.serviceFeesDeducted || 0,
        netAmountBeforeFees: settlementData.grossAmount || 0,
        metadata: {
          requestedAt: new Date().toISOString(),
          requestSource: 'mobile_app',
          channel,
          calculationDetails: {
            grossAmount: settlementData.grossAmount,
            serviceFees: settlementData.serviceFeesDeducted,
            netAmount: settlementData.netAmount,
            ordersIncluded: channel === 'ECOMMERCE' ? settlementData.includedOrderIds : null,
            ridesIncluded: channel === 'RIDES' ? settlementData.includedRideIds : null,
            rentalsIncluded: channel === 'RENTALS' ? settlementData.includedRentalIds : null
          }
        }
      },
      include: {
        bankAccount: true,
        wallet: true
      }
    });

    // Update orders/rides to SETTLED status to prevent double-counting
    if (channel === 'ECOMMERCE' && settlementData.includedOrderIds && settlementData.includedOrderIds.length > 0) {
      await updateOrdersToSettled(settlementData.includedOrderIds);
    } else if (channel === 'RIDES' && settlementData.includedRideIds && settlementData.includedRideIds.length > 0) {
      await updateRidesToSettled(settlementData.includedRideIds);
    } else if (channel === 'RENTALS' && settlementData.includedRentalIds && settlementData.includedRentalIds.length > 0) {
      await updateRentalsToSettled(settlementData.includedRentalIds);
    }

    logger.info('Settlement request created successfully:', { 
      userId: req.user.id,
      settlementId: settlement.id,
      reference: settlement.reference,
      channel,
      ordersUpdated: channel === 'ECOMMERCE' ? settlementData.totalOrdersCount : 0,
      ridesUpdated: channel === 'RIDES' ? settlementData.totalRidesCount : 0,
      includedOrderIds: channel === 'ECOMMERCE' ? settlementData.includedOrderIds : null,
      settlementAmount: settlement.amount,
      currency: settlement.currency
    });

    res.status(201).json({
      message: 'Settlement request created successfully',
      settlement
    });
  } catch (error) {
    logger.error('Error creating settlement request:', error);
    res.status(500).json({ 
      message: 'Failed to create settlement request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get settlement history
export const getSettlementHistory = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const channel = req.query.channel as string; // Optional filter by channel
    const period = req.query.period as string; // Optional filter by period: today, week, month, all

    logger.info('Fetching settlement history:', { 
      userId: req.user.id,
      page,
      limit,
      channel,
      period
    });

    // Build where clause
    const whereClause: any = { userId: req.user.id };
    
    // Add channel filter
    if (channel && ['ECOMMERCE', 'RIDES'].includes(channel)) {
      whereClause.channel = channel;
    }

    // Add date filter based on period
    if (period && period !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          startDate = weekStart;
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      whereClause.createdAt = {
        gte: startDate
      };
    }

    // Get settlements with pagination
    const [settlements, totalCount] = await Promise.all([
      prisma.settlement.findMany({
        where: whereClause,
        include: {
          bankAccount: true,
          wallet: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.settlement.count({
        where: whereClause
      })
    ]);

    logger.info('Settlement history fetched successfully:', { 
      userId: req.user.id,
      count: settlements.length,
      totalCount,
      period
    });

    res.json({
      settlements,
      totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: page * limit < totalCount
    });
  } catch (error) {
    logger.error('Error getting settlement history:', error);
    res.status(500).json({ 
      message: 'Failed to get settlement history',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create bank account for seller
export const createBankAccount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { 
      accountName, 
      accountNumber, 
      bankName, 
      bankCode, 
      branchCode, 
      swiftCode, 
      iban, 
      currency, 
      isDefault 
    } = req.body;

    // Validate required fields
    if (!accountName || !accountNumber || !bankName || !currency) {
      return res.status(400).json({
        message: 'Missing required fields: accountName, accountNumber, bankName, currency'
      });
    }

    // Validate currency format (3 characters)
    if (currency.length !== 3) {
      return res.status(400).json({
        message: 'Currency must be a 3-character code (e.g., USD, EUR)'
      });
    }

    logger.info('Creating bank account:', { 
      userId: req.user.id,
      accountName,
      bankName,
      currency
    });

    // Get seller's KYC record
    let sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        bankAccounts: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    // For riders/drivers, allow adding payout methods without seller KYC by deriving from rider application info
    if (!sellerKyc) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          firstName: true,
          lastName: true
        }
      });
      // Check driver profile or approved rider application
      const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
      const riderApp = await prisma.riderApplication.findFirst({
        where: { userId: req.user.id, status: 'APPROVED' },
        orderBy: { updatedAt: 'desc' }
      });
      if (driver || riderApp) {
        // Try to enrich address from user's default delivery address
        const defaultAddress = await prisma.deliveryAddress.findFirst({
          where: { userId: req.user.id, isDefault: true }
        });
        // Create a lightweight KYC profile for payout method linkage
        await prisma.sellerKyc.create({
          data: {
            userId: req.user.id,
            businessName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Individual',
            businessType: 'INDIVIDUAL',
            address: defaultAddress?.address || riderApp?.address || 'N/A',
            city: defaultAddress?.city || riderApp?.city || 'N/A',
            state: defaultAddress?.state || '',
            postalCode: defaultAddress?.postalCode || '',
            documentType: 'DRIVERS_LICENSE',
            documentNumber: riderApp?.licenseNumber || 'N/A',
            documentUrl: (riderApp as any)?.documents?.[0]?.documentUrl || 'N/A',
            status: 'APPROVED',
            country: defaultAddress?.country ? [defaultAddress.country] : ['GM']
          }
        });
        // Re-fetch with included relations to satisfy types
        sellerKyc = await prisma.sellerKyc.findUnique({
          where: { userId: req.user.id },
          include: {
            bankAccounts: { where: { status: 'ACTIVE' } }
          }
        });
        if (!sellerKyc) {
          return res.status(500).json({
            message: 'Unable to prepare payout profile for this user'
          });
        }
      } else {
        return res.status(400).json({
          message: 'Rider application not found or not approved.'
        });
      }
    }

    // Check if account number already exists for this seller
    const existingAccount = sellerKyc.bankAccounts.find(
      account => account.accountNumber === accountNumber && account.status === 'ACTIVE'
    );

    if (existingAccount) {
      return res.status(400).json({
        message: 'Bank account with this account number already exists'
      });
    }

    // If this is set as default, unset other default accounts
    if (isDefault) {
      await prisma.bankAccount.updateMany({
        where: {
          sellerKycId: sellerKyc.id,
          status: 'ACTIVE',
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create bank account
    const bankAccount = await prisma.bankAccount.create({
      data: {
        sellerKycId: sellerKyc.id,
        accountName,
        accountNumber,
        bankName,
        bankCode: bankCode || '',
        branchCode: branchCode || null,
        swiftCode: swiftCode || null,
        iban: iban || null,
        currency,
        isDefault: isDefault || false,
        status: 'ACTIVE'
      }
    });

    logger.info('Bank account created successfully:', { 
      userId: req.user.id,
      bankAccountId: bankAccount.id
    });

    res.status(201).json({
      message: 'Bank account created successfully',
      bankAccount
    });
  } catch (error) {
    logger.error('Error creating bank account:', error);
    res.status(500).json({ 
      message: 'Failed to create bank account',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create wallet for seller
export const createWallet = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { 
      walletType, 
      walletAddress, 
      currency, 
      isDefault 
    } = req.body;

    // Validate required fields
    if (!walletType || !walletAddress || !currency) {
      return res.status(400).json({
        message: 'Missing required fields: walletType, walletAddress, currency'
      });
    }

    // Validate wallet type
    if (!['MOBILE_MONEY', 'DIGITAL_WALLET', 'CRYPTO'].includes(walletType)) {
      return res.status(400).json({
        message: 'Invalid wallet type. Must be MOBILE_MONEY, DIGITAL_WALLET, or CRYPTO'
      });
    }

    // Validate currency format (3 characters)
    if (currency.length !== 3) {
      return res.status(400).json({
        message: 'Currency must be a 3-character code (e.g., USD, EUR)'
      });
    }

    logger.info('Creating wallet:', { 
      userId: req.user.id,
      walletType,
      currency
    });

    // Get user's phone number
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { phoneNumber: true }
    });

    if (!user) {
      return res.status(400).json({
        message: 'User not found'
      });
    }

    // Get seller's KYC record
    let sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        wallets: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    // For riders/drivers, allow adding payout methods without seller KYC by deriving from rider application info
    if (!sellerKyc) {
      const baseUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { firstName: true, lastName: true, phoneNumber: true }
      });
      const driver = await prisma.driver.findUnique({ where: { userId: req.user.id } });
      const riderApp = await prisma.riderApplication.findFirst({
        where: { userId: req.user.id, status: 'APPROVED' },
        orderBy: { updatedAt: 'desc' }
      });
      if (driver || riderApp) {
        const defaultAddress = await prisma.deliveryAddress.findFirst({
          where: { userId: req.user.id, isDefault: true }
        });
        await prisma.sellerKyc.create({
          data: {
            userId: req.user.id,
            businessName: `${baseUser?.firstName ?? ''} ${baseUser?.lastName ?? ''}`.trim() || 'Individual',
            businessType: 'INDIVIDUAL',
            address: defaultAddress?.address || riderApp?.address || 'N/A',
            city: defaultAddress?.city || riderApp?.city || 'N/A',
            state: defaultAddress?.state || '',
            postalCode: defaultAddress?.postalCode || '',
            documentType: 'DRIVERS_LICENSE',
            documentNumber: riderApp?.licenseNumber || 'N/A',
            documentUrl: (riderApp as any)?.documents?.[0]?.documentUrl || 'N/A',
            status: 'APPROVED',
            country: defaultAddress?.country ? [defaultAddress.country] : ['GM']
          }
        });
        // Re-fetch with included relations to satisfy types
        sellerKyc = await prisma.sellerKyc.findUnique({
          where: { userId: req.user.id },
          include: {
            wallets: { where: { status: 'ACTIVE' } }
          }
        });
        if (!sellerKyc) {
          return res.status(500).json({
            message: 'Unable to prepare payout profile for this user'
          });
        }
      } else {
        return res.status(400).json({
          message: 'Rider application not found or not approved.'
        });
      }
    }

    // Check if wallet address already exists for this seller
    const existingWallet = sellerKyc.wallets.find(
      wallet => wallet.walletAddress === walletAddress && wallet.status === 'ACTIVE'
    );

    if (existingWallet) {
      return res.status(400).json({
        message: 'Wallet with this address already exists'
      });
    }

    // If this is set as default, unset other default wallets
    if (isDefault) {
      await prisma.wallet.updateMany({
        where: {
          sellerKycId: sellerKyc.id,
          status: 'ACTIVE',
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create wallet
    const wallet = await prisma.wallet.create({
      data: {
        sellerKycId: sellerKyc.id,
        walletType,
        walletAddress,
        account: user.phoneNumber, // Set account to user's phone number
        currency,
        isDefault: isDefault || false,
        status: 'ACTIVE'
      }
    });

    logger.info('Wallet created successfully:', { 
      userId: req.user.id,
      walletId: wallet.id
    });

    res.status(201).json({
      message: 'Wallet created successfully',
      wallet
    });
  } catch (error) {
    logger.error('Error creating wallet:', error);
    res.status(500).json({ 
      message: 'Failed to create wallet',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get settlement details with included orders/rides
export const getSettlementDetails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const { settlementId } = req.params;

    if (!settlementId) {
      return res.status(400).json({ message: 'Settlement ID is required' });
    }

    logger.info('Fetching settlement details:', { 
      userId: req.user.id,
      settlementId
    });

    // Get settlement with bank account and wallet details
    const settlement = await prisma.settlement.findFirst({
      where: { 
        id: settlementId,
        userId: req.user.id 
      },
      include: {
        bankAccount: true,
        wallet: true
      }
    });

    if (!settlement) {
      return res.status(404).json({ message: 'Settlement not found' });
    }

    let includedOrders: Array<{ id: string; orderNumber: string; createdAt: Date; totalAmount: number; currencyCode: string }> = [];
    let includedRides: Array<{ id: string; rideId: string; createdAt: Date; driverEarnings: number; totalFare: number; currency: string }> = [];
    
    if (settlement.channel === 'ECOMMERCE' && settlement.includedOrderIds && Array.isArray(settlement.includedOrderIds)) {
      const orderIds = settlement.includedOrderIds as string[];
      
      if (orderIds.length > 0) {
        const orders = await prisma.orders.findMany({
          where: {
            id: { in: orderIds }
          },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            totalAmount: true,
            currencyCode: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Convert Decimal to number
        includedOrders = orders.map(order => ({
          ...order,
          totalAmount: parseFloat(order.totalAmount.toString())
        }));
      }
    } else if (settlement.channel === 'RIDES' && settlement.includedRideIds && Array.isArray(settlement.includedRideIds)) {
      const rideIds = settlement.includedRideIds as string[];
      
      if (rideIds.length > 0) {
        const rides = await prisma.ride.findMany({
          where: {
            id: { in: rideIds }
          },
          select: {
            id: true,
            rideId: true,
            createdAt: true,
            driverEarnings: true,
            totalFare: true,
            rideRequest: {
              select: {
                currency: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Convert Decimal to number and extract currency from rideRequest
        includedRides = rides.map(ride => ({
          ...ride,
          driverEarnings: parseFloat(ride.driverEarnings.toString()),
          totalFare: parseFloat(ride.totalFare.toString()),
          currency: ride.rideRequest?.currency || 'GMD'
        }));
      }
    }

    logger.info('Settlement details fetched successfully:', { 
      userId: req.user.id,
      settlementId,
      channel: settlement.channel,
      includedOrdersCount: includedOrders.length,
      includedRidesCount: includedRides.length
    });

    res.json({
      settlement,
      includedOrders,
      includedRides
    });
  } catch (error) {
    logger.error('Error getting settlement details:', error);
    res.status(500).json({ 
      message: 'Failed to get settlement details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to calculate ecommerce settlement data
async function calculateEcommerceSettlementData(userId: string, currency: string, requestedAmount: number, salesRepId?: string) {
  try {
    logger.info('Starting ecommerce settlement calculation:', {
      userId,
      currency,
      requestedAmount,
      salesRepId
    });

    let availableOrders: any[];

    if (salesRepId) {
      // Settlement request for a specific sales rep
      const salesRep = await prisma.salesRep.findFirst({
        where: {
          id: salesRepId,
          parentSellerId: userId,
          status: 'ACTIVE'
        },
        select: {
          userId: true
        }
      });

      if (!salesRep) {
        return {
          isValid: false,
          error: 'Sales rep not found or not authorized'
        };
      }

      // Get orders for this specific sales rep only
      availableOrders = await prisma.orders.findMany({
        where: {
          sellerId: salesRep.userId,
          paymentStatus: 'PAID',
          currencyCode: currency
        },
        select: {
          id: true,
          totalAmount: true,
          orderNumber: true,
          sellerId: true
        },
        orderBy: {
          paidAt: 'asc' // Process oldest orders first (FIFO)
        }
      });
    } else {
      // Settlement request for parent seller only
      availableOrders = await prisma.orders.findMany({
        where: {
          sellerId: userId,
          paymentStatus: 'PAID',
          currencyCode: currency
        },
        select: {
          id: true,
          totalAmount: true,
          orderNumber: true,
          sellerId: true
        },
        orderBy: {
          paidAt: 'asc' // Process oldest orders first (FIFO)
        }
      });
    }

    logger.info('Available orders found:', {
      count: availableOrders.length,
      isSalesRepSettlement: !!salesRepId,
      orders: availableOrders.map(o => ({ 
        id: o.id, 
        amount: o.totalAmount.toString(),
        sellerId: o.sellerId
      }))
    });

    if (availableOrders.length === 0) {
      return {
        isValid: false,
        error: 'No available orders for settlement in this currency'
      };
    }

    // Get service fees for these specific orders
    const orderIds = availableOrders.map(order => order.id);
    const serviceFees = await prisma.externalTransaction.findMany({
      where: {
        orderId: { in: orderIds },
        transactionType: 'SERVICE_FEE',
        status: 'SUCCESS',
        currencyCode: currency
      },
      select: {
        orderId: true,
        amount: true
      }
    });

    logger.info('Service fees found:', {
      count: serviceFees.length,
      fees: serviceFees.map(f => ({ orderId: f.orderId, amount: f.amount.toString() }))
    });

    // Calculate total available revenue first
    let totalGrossAmount = 0;
    let totalServiceFees = 0;
    const orderDetails: any[] = [];

    for (const order of availableOrders) {
      const orderServiceFees = serviceFees
        .filter(fee => fee.orderId === order.id)
        .reduce((sum, fee) => sum + parseFloat(fee.amount.toString()), 0);

      const orderNetAmount = parseFloat(order.totalAmount.toString()) - orderServiceFees;
      
      orderDetails.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        grossAmount: parseFloat(order.totalAmount.toString()),
        serviceFees: orderServiceFees,
        netAmount: orderNetAmount
      });
      
      totalGrossAmount += parseFloat(order.totalAmount.toString());
      totalServiceFees += orderServiceFees;
    }

    const totalAvailableNetAmount = totalGrossAmount - totalServiceFees;
    
    // Round to 2 decimal places to avoid floating point precision issues
    const roundedAvailableAmount = Math.round(totalAvailableNetAmount * 100) / 100;
    const roundedRequestedAmount = Math.round(requestedAmount * 100) / 100;

    logger.info('Calculation summary:', {
      totalGrossAmount,
      totalServiceFees,
      totalAvailableNetAmount,
      roundedAvailableAmount,
      roundedRequestedAmount,
      difference: roundedRequestedAmount - roundedAvailableAmount
    });

    // Check if requested amount is available
    if (roundedRequestedAmount > roundedAvailableAmount) {
      return {
        isValid: false,
        error: `Insufficient available revenue. Available: ${roundedAvailableAmount.toFixed(2)}, Requested: ${roundedRequestedAmount.toFixed(2)}`
      };
    }

    // If requested amount equals available amount, include all orders
    if (Math.abs(roundedRequestedAmount - roundedAvailableAmount) < 0.01) {
      logger.info('Requested amount equals available amount, including all orders', {
        totalOrdersCount: orderDetails.length,
        includedOrderIds: orderDetails.map(order => order.orderId),
        orderBreakdown: orderDetails.map(order => ({
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          netAmount: order.netAmount,
          isSalesRepOrder: availableOrders.find(o => o.id === order.orderId)?.salesRep ? true : false
        }))
      });
      return {
        isValid: true,
        includedOrderIds: orderDetails.map(order => order.orderId),
        totalOrdersCount: orderDetails.length,
        grossAmount: totalGrossAmount,
        serviceFeesDeducted: totalServiceFees,
        netAmount: roundedAvailableAmount,
        orderDetails: orderDetails
      };
    }

    // If requested amount is less than available, select orders to match exactly
    let remainingAmount = roundedRequestedAmount;
    let includedOrders: any[] = [];
    let includedGrossAmount = 0;
    let includedServiceFees = 0;

    for (const orderDetail of orderDetails) {
      if (orderDetail.netAmount <= remainingAmount) {
        // Include this entire order
        includedOrders.push(orderDetail);
        includedGrossAmount += orderDetail.grossAmount;
        includedServiceFees += orderDetail.serviceFees;
        remainingAmount -= orderDetail.netAmount;
        
        if (remainingAmount <= 0.01) break; // Allow for small rounding differences
      } else {
        // This order would exceed the requested amount, so we can't include it
        break;
      }
    }

    if (includedOrders.length === 0) {
      return {
        isValid: false,
        error: 'No suitable orders found for the requested settlement amount'
      };
    }

    const finalNetAmount = includedGrossAmount - includedServiceFees;
    const roundedFinalAmount = Math.round(finalNetAmount * 100) / 100;

    logger.info('Final settlement calculation:', {
      includedOrdersCount: includedOrders.length,
      includedGrossAmount,
      includedServiceFees,
      finalNetAmount,
      roundedFinalAmount,
      remainingAmount,
      includedOrderIds: includedOrders.map(order => order.orderId)
    });

    return {
      isValid: true,
      includedOrderIds: includedOrders.map(order => order.orderId),
      totalOrdersCount: includedOrders.length,
      grossAmount: includedGrossAmount,
      serviceFeesDeducted: includedServiceFees,
      netAmount: roundedFinalAmount,
      orderDetails: includedOrders
    };
  } catch (error) {
    logger.error('Error calculating ecommerce settlement data:', error);
    return {
      isValid: false,
      error: 'Failed to calculate settlement data'
    };
  }
}

// Helper function to calculate rentals settlement data
async function calculateRentalsSettlementData(userId: string, currency: string, requestedAmount: number) {
  try {
    logger.info('Starting rentals settlement calculation:', { userId, currency, requestedAmount });

    // Get all rental requests for the driver (asset owner) via external transactions (sellerId)
    const txs = await prisma.externalTransaction.findMany({
      where: {
        sellerId: userId,
        appService: 'RENTAL',
        status: 'SUCCESS',
        currencyCode: currency,
        rentalRequestId: { not: null }
      },
      select: {
        rentalRequestId: true,
        amount: true,
        transactionType: true
      },
      orderBy: { createdAt: 'asc' }
    });

    if (txs.length === 0) {
      return { isValid: false, error: 'No available rentals for settlement in this currency' };
    }

    const rentalIds = Array.from(new Set(txs.map(t => t.rentalRequestId!).filter(Boolean)));
    const rentals = await prisma.rentalRequest.findMany({
      where: {
        id: { in: rentalIds },
        rentalSettlementStatus: 'PENDING'
      },
      select: { id: true, requestId: true, createdAt: true }
    });
    if (rentals.length === 0) {
      return { isValid: false, error: 'No available rentals for settlement in this currency' };
    }

    // Compute net per rental
    const originalById = new Map<string, number>();
    const serviceFeeById = new Map<string, number>();
    for (const t of txs) {
      const rid = t.rentalRequestId!;
      if (!rentals.find(r => r.id === rid)) continue;
      const amt = parseFloat(t.amount.toString());
      if (t.transactionType === 'ORIGINAL') {
        originalById.set(rid, (originalById.get(rid) || 0) + amt);
      } else if (t.transactionType === 'SERVICE_FEE') {
        serviceFeeById.set(rid, (serviceFeeById.get(rid) || 0) + amt);
      }
    }

    const details: any[] = [];
    for (const r of rentals) {
      const gross = originalById.get(r.id) || 0;
      const svc = serviceFeeById.get(r.id) || 0;
      const net = Math.max(0, gross - svc);
      if (net > 0) {
        details.push({
          rentalId: r.id,
          requestId: r.requestId,
          earnings: net,
          createdAt: r.createdAt,
          serviceFees: svc
        });
      }
    }

    if (details.length === 0) {
      return { isValid: false, error: 'No available rentals for settlement in this currency' };
    }

    const totalAvailable = details.reduce((sum, d) => sum + d.earnings, 0);
    const roundedAvailableAmount = Math.round(totalAvailable * 100) / 100;
    const roundedRequestedAmount = Math.round(requestedAmount * 100) / 100;

    if (roundedRequestedAmount > roundedAvailableAmount) {
      return {
        isValid: false,
        error: `Insufficient available earnings. Available: ${roundedAvailableAmount.toFixed(2)}, Requested: ${roundedRequestedAmount.toFixed(2)}`
      };
    }

    if (Math.abs(roundedRequestedAmount - roundedAvailableAmount) < 0.01) {
      return {
        isValid: true,
        includedRentalIds: details.map(d => d.rentalId),
        totalRentalsCount: details.length,
        grossAmount: totalAvailable,
        serviceFeesDeducted: details.reduce((s, d) => s + d.serviceFees, 0),
        netAmount: roundedAvailableAmount,
        rentalDetails: details
      };
    }

    // Select rentals FIFO until requested amount met
    let remaining = roundedRequestedAmount;
    const included: any[] = [];
    for (const d of details) {
      if (d.earnings <= remaining) {
        included.push(d);
        remaining -= d.earnings;
        if (remaining <= 0.01) break;
      } else {
        break;
      }
    }
    if (included.length === 0) {
      return { isValid: false, error: 'No suitable rentals found for the requested settlement amount' };
    }
    const finalNet = Math.round(included.reduce((s, d) => s + d.earnings, 0) * 100) / 100;
    const includedServiceFees = included.reduce((s, d) => s + d.serviceFees, 0);

    return {
      isValid: true,
      includedRentalIds: included.map(d => d.rentalId),
      totalRentalsCount: included.length,
      grossAmount: included.reduce((s, d) => s + d.earnings + d.serviceFees, 0),
      serviceFeesDeducted: includedServiceFees,
      netAmount: finalNet,
      rentalDetails: included
    };
  } catch (error) {
    logger.error('Error calculating rentals settlement data:', error);
    return { isValid: false, error: 'Failed to calculate settlement data' };
  }
}

// Helper function to update rentals to SETTLED status
async function updateRentalsToSettled(rentalIds: string[]) {
  try {
    const result = await prisma.rentalRequest.updateMany({
      where: {
        id: { in: rentalIds },
        rentalSettlementStatus: 'PENDING'
      },
      data: {
        rentalSettlementStatus: 'SETTLED',
        updatedAt: new Date()
      }
    });
    logger.info('Rentals updated to SETTLED status:', { rentalIds, updatedCount: result.count });
    return result.count;
  } catch (error) {
    logger.error('Error updating rentals to SETTLED status:', error);
    throw error;
  }
}
// Helper function to calculate rides settlement data
async function calculateRidesSettlementData(userId: string, currency: string, requestedAmount: number) {
  try {
    logger.info('Starting rides settlement calculation:', {
      userId,
      currency,
      requestedAmount
    });

    // Get driver record
    const driver = await prisma.driver.findUnique({
      where: { userId }
    });

    if (!driver) {
      return {
        isValid: false,
        error: 'Driver not found'
      };
    }

    // Get all completed rides with pending settlement
    const availableRides = await prisma.ride.findMany({
      where: {
        driverId: driver.id,
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        settlementStatus: 'PENDING'
      },
      select: {
        id: true,
        rideId: true,
        driverEarnings: true,
        totalFare: true,
        platformFee: true,
        createdAt: true,
        completedAt: true,
        rideRequest: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        completedAt: 'asc' // Process oldest rides first (FIFO)
      }
    });

    logger.info('Available rides found:', {
      count: availableRides.length,
      rides: availableRides.map(r => ({ id: r.id, earnings: r.driverEarnings.toString() }))
    });

    if (availableRides.length === 0) {
      return {
        isValid: false,
        error: 'No available rides for settlement in this currency'
      };
    }

    // Get service fees for these specific ride requests
    const rideRequestIds = availableRides.map(ride => ride.rideRequest.id);
    const serviceFees = await prisma.externalTransaction.findMany({
      where: {
        rideRequestId: { in: rideRequestIds },
        transactionType: 'SERVICE_FEE',
        status: 'SUCCESS',
        appService: 'RIDES'
      },
      select: {
        rideRequestId: true,
        amount: true,
        currencyCode: true
      }
    });

    logger.info('Service fees found for rides:', {
      count: serviceFees.length,
      fees: serviceFees.map(f => ({ rideRequestId: f.rideRequestId, amount: f.amount.toString() }))
    });

    // Calculate total available earnings and service fees
    let totalEarnings = 0;
    let totalServiceFees = 0;
    const rideDetails: any[] = [];

    for (const ride of availableRides) {
      const earnings = parseFloat(ride.driverEarnings.toString());
      const rideServiceFees = serviceFees
        .filter(fee => fee.rideRequestId === ride.rideRequest.id)
        .reduce((sum, fee) => sum + parseFloat(fee.amount.toString()), 0);
      
      totalEarnings += earnings;
      totalServiceFees += rideServiceFees;
      
      rideDetails.push({
        rideId: ride.id,
        rideRequestId: ride.rideId,
        earnings: earnings,
        totalFare: parseFloat(ride.totalFare.toString()),
        platformFee: parseFloat(ride.platformFee.toString()),
        serviceFees: rideServiceFees
      });
    }

    // Round to 2 decimal places
    const roundedAvailableAmount = Math.round(totalEarnings * 100) / 100;
    const roundedRequestedAmount = Math.round(requestedAmount * 100) / 100;

    logger.info('Calculation summary:', {
      totalEarnings,
      totalServiceFees,
      roundedAvailableAmount,
      roundedRequestedAmount,
      difference: roundedRequestedAmount - roundedAvailableAmount
    });

    // Check if requested amount is available
    if (roundedRequestedAmount > roundedAvailableAmount) {
      return {
        isValid: false,
        error: `Insufficient available earnings. Available: ${roundedAvailableAmount.toFixed(2)}, Requested: ${roundedRequestedAmount.toFixed(2)}`
      };
    }

    // If requested amount equals available amount, include all rides
    if (Math.abs(roundedRequestedAmount - roundedAvailableAmount) < 0.01) {
      logger.info('Requested amount equals available amount, including all rides');
      return {
        isValid: true,
        includedRideIds: rideDetails.map(ride => ride.rideId),
        totalRidesCount: rideDetails.length,
        grossAmount: totalEarnings,
        serviceFeesDeducted: totalServiceFees,
        netAmount: roundedAvailableAmount,
        rideDetails: rideDetails
      };
    }

    // If requested amount is less than available, select rides to match exactly
    let remainingAmount = roundedRequestedAmount;
    let includedRides: any[] = [];
    let includedEarnings = 0;

    for (const rideDetail of rideDetails) {
      if (rideDetail.earnings <= remainingAmount) {
        // Include this entire ride
        includedRides.push(rideDetail);
        includedEarnings += rideDetail.earnings;
        remainingAmount -= rideDetail.earnings;
        
        if (remainingAmount <= 0.01) break; // Allow for small rounding differences
      } else {
        // This ride would exceed the requested amount, so we can't include it
        break;
      }
    }

    if (includedRides.length === 0) {
      return {
        isValid: false,
        error: 'No suitable rides found for the requested settlement amount'
      };
    }

    const roundedFinalAmount = Math.round(includedEarnings * 100) / 100;

    // Calculate service fees for included rides
    const includedServiceFees = includedRides.reduce((sum, ride) => sum + ride.serviceFees, 0);
    
    logger.info('Final settlement calculation:', {
      includedRidesCount: includedRides.length,
      includedEarnings,
      includedServiceFees,
      roundedFinalAmount,
      remainingAmount
    });
    
    return {
      isValid: true,
      includedRideIds: includedRides.map(ride => ride.rideId),
      totalRidesCount: includedRides.length,
      grossAmount: includedEarnings,
      serviceFeesDeducted: includedServiceFees,
      netAmount: roundedFinalAmount,
      rideDetails: includedRides
    };
  } catch (error) {
    logger.error('Error calculating rides settlement data:', error);
    return {
      isValid: false,
      error: 'Failed to calculate settlement data'
    };
  }
}

// Helper function to update orders to SETTLED status (both parent and sales rep orders)
async function updateOrdersToSettled(orderIds: string[]) {
  try {
    const result = await prisma.orders.updateMany({
      where: {
        id: { in: orderIds },
        paymentStatus: 'PAID' // Only update PAID orders to prevent double updates
      },
      data: {
        paymentStatus: 'SETTLED',
        updatedAt: new Date()
      }
    });

    logger.info('Orders updated to SETTLED status:', {
      orderIds,
      updatedCount: result.count
    });

    return result.count;
  } catch (error) {
    logger.error('Error updating orders to SETTLED status:', error);
    throw error;
  }
}

// Helper function to update rides to SETTLED status
async function updateRidesToSettled(rideIds: string[]) {
  try {
    const result = await prisma.ride.updateMany({
      where: {
        id: { in: rideIds },
        settlementStatus: 'PENDING' // Only update PENDING rides to prevent double updates
      },
      data: {
        settlementStatus: 'SETTLED',
        updatedAt: new Date()
      }
    });

    logger.info('Rides updated to SETTLED status:', {
      rideIds,
      updatedCount: result.count
    });

    return result.count;
  } catch (error) {
    logger.error('Error updating rides to SETTLED status:', error);
    throw error;
  }
}

// Helper function to get currency symbol
function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'GMD': 'D',
    'SLL': 'Le',
    'UGX': 'USh',
    'TZS': 'TSh',
    'NGN': '₦',
    'KES': 'KSh',
    'GHS': 'GH₵',
    'ZAR': 'R',
    'EGP': 'E£',
    'INR': '₹',
    'CNY': '¥',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'CHF',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'RON': 'lei',
    'BGN': 'лв',
    'HRK': 'kn',
    'RUB': '₽',
    'TRY': '₺',
    'BRL': 'R$',
    'MXN': '$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$',
    'MYR': 'RM',
    'PHP': '₱',
    'THB': '฿',
    'IDR': 'Rp',
    'KRW': '₩',
    'VND': '₫',
    'ZMW': 'ZK',
    'BWP': 'P',
    'MWK': 'MK',
    'SZL': 'L',
    'NAF': 'N$',
    'AOA': 'Kz',
    'MZN': 'MT',
    'STN': 'Db',
    'CVE': 'Esc'
  };

  return symbols[currency] || currency;
} 