import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getSalesReps,
  getSalesRep,
  getSalesRepByUserId,
  createSalesRep,
  updateSalesRep,
  deleteSalesRep,
  getSalesRepStats
} from '../controllers/salesRep'
import {
  getSalesRepAnalytics,
  getParentSellerAnalytics,
  getParentSellerRecentActivity
} from '../controllers/salesRepAnalytics'
import {
  requestSettlement,
  getSettlementHistory,
  getSettlementDetails,
  cancelSettlement
} from '../controllers/salesRepSettlement'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// GET /api/sales-reps - Get all sales reps for the authenticated parent seller
router.get('/', getSalesReps)

// GET /api/sales-reps/by-user - Get sales rep by current user ID
router.get('/by-user', getSalesRepByUserId)

// GET /api/sales-reps/:salesRepId - Get a specific sales rep
router.get('/:salesRepId', getSalesRep)

// POST /api/sales-reps - Create a new sales rep
router.post('/', createSalesRep)

// PUT /api/sales-reps/:salesRepId - Update a sales rep
router.put('/:salesRepId', updateSalesRep)

// DELETE /api/sales-reps/:salesRepId - Delete a sales rep
router.delete('/:salesRepId', deleteSalesRep)

// GET /api/sales-reps/:salesRepId/stats - Get sales rep statistics
router.get('/:salesRepId/stats', getSalesRepStats)

// GET /api/sales-reps/:salesRepId/analytics - Get sales rep analytics with date filters
router.get('/:salesRepId/analytics', getSalesRepAnalytics)

// GET /api/sales-reps/analytics/parent - Get parent seller analytics (all sales reps)
router.get('/analytics/parent', getParentSellerAnalytics)

// GET /api/sales-reps/activity/recent - Get recent activity across all reps for parent seller
// Query: limit, cursor, type
router.get('/activity/recent', getParentSellerRecentActivity)

// Settlement routes
// POST /api/sales-reps/settlement/request - Request settlement
router.post('/settlement/request', requestSettlement)

// GET /api/sales-reps/settlement/history - Get settlement history
router.get('/settlement/history', getSettlementHistory)

// GET /api/sales-reps/settlement/:settlementId - Get settlement details
router.get('/settlement/:settlementId', getSettlementDetails)

// PUT /api/sales-reps/settlement/:settlementId/cancel - Cancel settlement
router.put('/settlement/:settlementId/cancel', cancelSettlement)

export default router
