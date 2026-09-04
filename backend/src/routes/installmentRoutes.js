const express = require('express');
const router = express.Router();
const installmentController = require('../controllers/installmentController');
const { authenticateToken } = require('../middleware/auth');
const { requireAccountsAccess, requireAccountsHeadOrSuperAdmin } = require('../middleware/rbac');

router.use(authenticateToken, requireAccountsAccess);

router.get('/', installmentController.getInstallmentPlans);
router.get('/:id', installmentController.getInstallmentPlanById);
router.post('/', installmentController.createInstallmentPlan);
router.post('/:planId/payments', installmentController.recordInstallmentPayment);

// Update & Delete Plan (Accounts Head & Super Admin)
router.put('/:id', requireAccountsHeadOrSuperAdmin, installmentController.updateInstallmentPlan);
router.delete('/:id', requireAccountsHeadOrSuperAdmin, installmentController.deleteInstallmentPlan);

module.exports = router;
