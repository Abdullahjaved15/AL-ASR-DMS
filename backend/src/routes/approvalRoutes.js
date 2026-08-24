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

// List approval requests (Super Admin sees all, Admin sees their own requests)
router.get('/', requireRole('ADMIN'), getApprovalRequests);

// Submit an approval request (Admin or Super Admin)
router.post('/request', requireRole('ADMIN'), createApprovalRequest);

// Super Admin only: Approve request
router.post('/:id/approve', requireRole('SUPER_ADMIN'), approveRequest);

// Super Admin only: Reject request
router.post('/:id/reject', requireRole('SUPER_ADMIN'), rejectRequest);

module.exports = router;
