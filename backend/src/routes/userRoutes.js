const express = require('express');
const { getAllUsers, updateUserStatus, deleteUser } = require('../controllers/userController');
const { register } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);

// All authenticated users can list team members (salesmen & admins)
router.get('/', getAllUsers);

// Admin-only management endpoints
router.post('/create', requireRole('ADMIN'), register);
router.put('/:id/status', requireRole('ADMIN'), updateUserStatus);
router.delete('/:id', requireRole('ADMIN'), deleteUser);

module.exports = router;
