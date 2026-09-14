const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
  getApprovalRequests,
  createApprovalRequest,
  approveRequest,
  rejectRequest
} = require('../controllers/approvalController');

// All approval routes require authentication
router.use(authenticateToken);

// List approval requests (Super Admin sees all, other users see their own)
router.get('/', getApprovalRequests);

// Submit an approval request (Any authenticated user can submit for approval)
router.post('/request', createApprovalRequest);

// Super Admin only: Approve request
router.post('/:id/approve', requireRole('SUPER_ADMIN'), approveRequest);

// Super Admin only: Reject request
router.post('/:id/reject', requireRole('SUPER_ADMIN'), rejectRequest);

module.exports = router;
