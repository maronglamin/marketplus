import express from 'express';
import {
  getAvailableRevenue,
  getAvailableRideEarnings,
  getBankAccounts,
  getWallets,
  createSettlementRequest,
  getSettlementHistory,
  getSettlementDetails,
  createBankAccount,
  createWallet
} from '../controllers/settlement';
import { authenticate } from '../middleware/auth';

const router = express.Router();

// Get available revenue for settlement (ecommerce)
router.get('/available-revenue', authenticate, getAvailableRevenue);

// Get available ride earnings for settlement (rides)
router.get('/available-ride-earnings', authenticate, getAvailableRideEarnings);

// Get seller's bank accounts
router.get('/bank-accounts', authenticate, getBankAccounts);

// Get seller's wallets
router.get('/wallets', authenticate, getWallets);

// Create bank account
router.post('/bank-accounts', authenticate, createBankAccount);

// Create wallet
router.post('/wallets', authenticate, createWallet);

// Create settlement request
router.post('/request', authenticate, createSettlementRequest);

// Get settlement history
router.get('/history', authenticate, getSettlementHistory);

// Get settlement details
router.get('/:settlementId', authenticate, getSettlementDetails);

export default router; 