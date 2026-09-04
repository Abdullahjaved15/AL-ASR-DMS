const express = require('express');
const router = express.Router();
const securityChequeController = require('../controllers/securityChequeController');
const { authenticateToken } = require('../middleware/auth');
const { requireAccountsAccess, requireAccountsHeadOrSuperAdmin } = require('../middleware/rbac');

router.use(authenticateToken, requireAccountsAccess);

router.get('/', securityChequeController.getSecurityCheques);
router.post('/', securityChequeController.createSecurityCheque);
router.patch('/:id/status', securityChequeController.updateChequeStatus);

// Edit & Delete (Accounts Head & Super Admin)
router.put('/:id', requireAccountsHeadOrSuperAdmin, securityChequeController.updateSecurityCheque);
router.delete('/:id', requireAccountsHeadOrSuperAdmin, securityChequeController.deleteSecurityCheque);

module.exports = router;
