const express = require('express');
const { getAllUsers, updateUserStatus, deleteUser } = require('../controllers/userController');
const { register } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/', getAllUsers);
router.post('/create', register);
router.put('/:id/status', updateUserStatus);
router.delete('/:id', deleteUser);

module.exports = router;
