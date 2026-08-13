const express = require('express');
const router = express.Router();
const { getSecurityCheques, createSecurityCheque, updateChequeStatus } = require('../controllers/securityChequeController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getSecurityCheques);
router.post('/', createSecurityCheque);
router.put('/:id/status', updateChequeStatus);

module.exports = router;
