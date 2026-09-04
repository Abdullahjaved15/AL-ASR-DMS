const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticateToken } = require('../middleware/auth');
const { requireAccountsAccess, requireAccountsHeadOrSuperAdmin } = require('../middleware/rbac');

// All routes require Accounts access (SUPER_ADMIN, ACCOUNTS_HEAD, ACCOUNTANT)
router.use(authenticateToken, requireAccountsAccess);

// Chart of Accounts & Quick Selection
router.get('/', accountController.getAccounts);
router.get('/banks-cash', accountController.getBankAndCashAccounts);
router.get('/:id/ledger', accountController.getAccountLedger);

// Create Account (Accounts Head or Super Admin or Accountant creating standard accounts)
router.post('/', accountController.createAccount);

// Fund Transfers (Cash to Bank, Bank to Bank)
router.post('/transfer', accountController.transferFunds);

// Edit / Delete Account (Accounts Head or Super Admin only)
router.put('/:id', requireAccountsHeadOrSuperAdmin, accountController.updateAccount);
router.delete('/:id', requireAccountsHeadOrSuperAdmin, accountController.deleteAccount);

module.exports = router;
