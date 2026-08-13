const express = require('express');
const router = express.Router();
const { getChartOfAccounts, getAccountLedger, createAccountHead, recordAccountTransaction } = require('../controllers/chartOfAccountsController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getChartOfAccounts);
router.get('/:id/ledger', getAccountLedger);
router.post('/head', createAccountHead);
router.post('/transaction', recordAccountTransaction);

module.exports = router;
