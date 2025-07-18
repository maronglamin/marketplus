import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Get available revenue for settlement
export const getAvailableRevenue = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    logger.info('Fetching available revenue for settlement:', { userId: req.user.id });

    // Get all PAID orders (excluding SETTLED orders) grouped by currency
    const paidOrders = await prisma.order.findMany({
      where: {
        sellerId: req.user.id,
        paymentStatus: 'PAID' // Only include PAID orders, SETTLED orders are excluded
      },
      select: {
        id: true,
        totalAmount: true,
        currencyCode: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
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

    // Calculate revenue per currency with proper service fee deduction
    const currencyData = new Map<string, { grossAmount: number; serviceFees: number }>();
    
    // Initialize currency data
    paidOrders.forEach(order => {
      const currency = order.currencyCode;
      const amount = parseFloat(order.totalAmount.toString());
      
      if (!currencyData.has(currency)) {
        currencyData.set(currency, { grossAmount: 0, serviceFees: 0 });
      }
      
      const data = currencyData.get(currency)!;
      data.grossAmount += amount;
    });

    // Add service fees per order
    serviceFees.forEach(fee => {
      const currency = fee.currencyCode;
      const feeAmount = parseFloat(fee.amount.toString());
      
      if (currencyData.has(currency)) {
        const data = currencyData.get(currency)!;
        data.serviceFees += feeAmount;
      }
    });

    // Calculate net revenue per currency
    currencyData.forEach((data, currency) => {
      const netAmount = Math.max(0, data.grossAmount - data.serviceFees);
      const roundedAmount = Math.round(netAmount * 100) / 100;
      
      if (roundedAmount > 0) {
        revenueByCurrency.set(currency, roundedAmount);
      }
    });

    // Convert to array format with currency symbols
    const revenues = Array.from(revenueByCurrency.entries())
      .map(([currency, amount]) => ({
        currency,
        amount,
        currencySymbol: getCurrencySymbol(currency)
      }));

    logger.info('Available revenue calculated successfully:', { 
      userId: req.user.id,
      revenues: revenues.map(r => ({ currency: r.currency, amount: r.amount }))
    });

    res.json({
      revenues,
      count: revenues.length
    });
  } catch (error) {
    logger.error('Error getting available revenue:', error);
    res.status(500).json({ 
      message: 'Failed to get available revenue',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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

    const { amount, currency, type, bankAccountId, walletId } = req.body;

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
      bankAccountId,
      walletId
    });

    // Enhanced financial integrity check
    const settlementData = await calculateSettlementData(req.user.id, currency, amount);
    
    if (!settlementData.isValid) {
      return res.status(400).json({
        message: settlementData.error || 'Insufficient available revenue for settlement'
      });
    }

    // Generate unique reference
    const reference = `SETTLE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create settlement record with enhanced tracking
    const settlement = await prisma.settlement.create({
      data: {
        userId: req.user.id,
        amount: settlementData.netAmount || 0,
        currency,
        status: 'PENDING',
        type,
        reference,
        bankAccountId: type === 'BANK_TRANSFER' ? bankAccountId : null,
        walletId: type === 'WALLET_TRANSFER' ? walletId : null,
        includedOrderIds: settlementData.includedOrderIds || [],
        totalOrdersCount: settlementData.totalOrdersCount || 0,
        serviceFeesDeducted: settlementData.serviceFeesDeducted || 0,
        netAmountBeforeFees: settlementData.grossAmount || 0,
        metadata: {
          requestedAt: new Date().toISOString(),
          requestSource: 'mobile_app',
          calculationDetails: {
            grossAmount: settlementData.grossAmount,
            serviceFees: settlementData.serviceFeesDeducted,
            netAmount: settlementData.netAmount,
            ordersIncluded: settlementData.includedOrderIds
          }
        }
      },
      include: {
        bankAccount: true,
        wallet: true
      }
    });

    // Update orders to SETTLED status to prevent double-counting
    if (settlementData.includedOrderIds && settlementData.includedOrderIds.length > 0) {
      await updateOrdersToSettled(settlementData.includedOrderIds);
    }

    logger.info('Settlement request created successfully:', { 
      userId: req.user.id,
      settlementId: settlement.id,
      reference: settlement.reference,
      ordersUpdated: settlementData.totalOrdersCount
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

    logger.info('Fetching settlement history:', { 
      userId: req.user.id,
      page,
      limit
    });

    // Get settlements with pagination
    const [settlements, totalCount] = await Promise.all([
      prisma.settlement.findMany({
        where: { userId: req.user.id },
        include: {
          bankAccount: true,
          wallet: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.settlement.count({
        where: { userId: req.user.id }
      })
    ]);

    logger.info('Settlement history fetched successfully:', { 
      userId: req.user.id,
      count: settlements.length,
      totalCount
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
    const sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        bankAccounts: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!sellerKyc) {
      return res.status(400).json({
        message: 'Seller KYC not found. Please complete KYC verification first.'
      });
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
    const sellerKyc = await prisma.sellerKyc.findUnique({
      where: { userId: req.user.id },
      include: {
        wallets: {
          where: { status: 'ACTIVE' }
        }
      }
    });

    if (!sellerKyc) {
      return res.status(400).json({
        message: 'Seller KYC not found. Please complete KYC verification first.'
      });
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

// Get settlement details with included orders
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

    // Get included orders with order numbers
    let includedOrders: Array<{ id: string; orderNumber: string; createdAt: Date; totalAmount: number; currencyCode: string }> = [];
    
    if (settlement.includedOrderIds && Array.isArray(settlement.includedOrderIds)) {
      const orderIds = settlement.includedOrderIds as string[];
      
      if (orderIds.length > 0) {
        const orders = await prisma.order.findMany({
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
    }

    logger.info('Settlement details fetched successfully:', { 
      userId: req.user.id,
      settlementId,
      includedOrdersCount: includedOrders.length
    });

    res.json({
      settlement,
      includedOrders
    });
  } catch (error) {
    logger.error('Error getting settlement details:', error);
    res.status(500).json({ 
      message: 'Failed to get settlement details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to calculate settlement data with enhanced financial integrity
async function calculateSettlementData(userId: string, currency: string, requestedAmount: number) {
  try {
    logger.info('Starting settlement calculation:', {
      userId,
      currency,
      requestedAmount
    });

    // Get all PAID orders for this currency that haven't been settled yet
    const availableOrders = await prisma.order.findMany({
      where: {
        sellerId: userId,
        paymentStatus: 'PAID', // Only include PAID orders, not SETTLED
        currencyCode: currency
      },
      select: {
        id: true,
        totalAmount: true,
        orderNumber: true
      },
      orderBy: {
        paidAt: 'asc' // Process oldest orders first (FIFO)
      }
    });

    logger.info('Available orders found:', {
      count: availableOrders.length,
      orders: availableOrders.map(o => ({ id: o.id, amount: o.totalAmount.toString() }))
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
      logger.info('Requested amount equals available amount, including all orders');
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
      remainingAmount
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
    logger.error('Error calculating settlement data:', error);
    return {
      isValid: false,
      error: 'Failed to calculate settlement data'
    };
  }
}

// Helper function to update orders to SETTLED status
async function updateOrdersToSettled(orderIds: string[]) {
  try {
    const result = await prisma.order.updateMany({
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