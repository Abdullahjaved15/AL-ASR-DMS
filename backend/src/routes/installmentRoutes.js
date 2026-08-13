const express = require('express');
const router = express.Router();
const { getInstallmentPlans, createInstallmentPlan, payInstallment, getDefaulterAlerts } = require('../controllers/installmentController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/', getInstallmentPlans);
router.post('/plan', createInstallmentPlan);
router.post('/pay', payInstallment);
router.get('/defaulters', getDefaulterAlerts);

module.exports = router;
