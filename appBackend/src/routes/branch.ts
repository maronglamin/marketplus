import express from 'express'
import { authenticate } from '../middleware/auth'
import {
  getBranches,
  getBranch,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchStats
} from '../controllers/branch'

const router = express.Router()

// All routes require authentication
router.use(authenticate)

// GET /api/branches - Get all branches for the authenticated parent seller
router.get('/', getBranches)

// GET /api/branches/:branchId - Get a specific branch
router.get('/:branchId', getBranch)

// POST /api/branches - Create a new branch
router.post('/', createBranch)

// PUT /api/branches/:branchId - Update a branch
router.put('/:branchId', updateBranch)

// DELETE /api/branches/:branchId - Delete a branch
router.delete('/:branchId', deleteBranch)

// GET /api/branches/:branchId/stats - Get branch statistics
router.get('/:branchId/stats', getBranchStats)

export default router
