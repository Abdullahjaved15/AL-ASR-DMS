const express = require('express');
const { getSalesmenReports, exportReportsCSV } = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/salesmen', getSalesmenReports);
router.get('/export-csv', exportReportsCSV);

module.exports = router;
