const express = require('express');
const router = express.Router();
const auditTrailController = require('../controllers/auditTrailController');
const { authenticateToken } = require('../middleware/auth');
const { requireAccountsAccess } = require('../middleware/rbac');

router.use(authenticateToken, requireAccountsAccess);

// Audit Trail & Day Book
router.get('/', auditTrailController.getAuditTrail);

// Single Chassis Multi-Sale / Double Sale Segregation Tracker
router.get('/chassis/:chassisNumber', auditTrailController.getChassisMultiSaleTracker);

module.exports = router;
