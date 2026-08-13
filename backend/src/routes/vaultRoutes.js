const express = require('express');
const router = express.Router();
const { getVaultSummary, recordTransaction } = require('../controllers/vaultController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);
router.get('/', getVaultSummary);
router.post('/transaction', requireRole('SUPER_ADMIN', 'ACCOUNTS_HEAD', 'ADMIN'), recordTransaction);

module.exports = router;
