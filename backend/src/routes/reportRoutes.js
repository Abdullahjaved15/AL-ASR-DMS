const express = require('express');
const { 
  getSalesmenReports, 
  exportReportsCSV,
  getBankCasesReport,
  exportBankCasesReportCSV
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('ADMIN'));

router.get('/salesmen', getSalesmenReports);
router.get('/export-csv', exportReportsCSV);
router.get('/bank-cases', getBankCasesReport);
router.get('/export-bank-cases-csv', exportBankCasesReportCSV);

module.exports = router;
