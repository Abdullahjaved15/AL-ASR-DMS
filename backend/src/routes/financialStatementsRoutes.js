const express = require('express');
const router = express.Router();
const { getBalanceSheet, getIncomeStatement, getTrialBalance } = require('../controllers/financialStatementsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);
router.use(requireRole('SUPER_ADMIN', 'ACCOUNTS_HEAD', 'ADMIN'));

router.get('/balance-sheet', getBalanceSheet);
router.get('/income-statement', getIncomeStatement);
router.get('/trial-balance', getTrialBalance);

module.exports = router;
