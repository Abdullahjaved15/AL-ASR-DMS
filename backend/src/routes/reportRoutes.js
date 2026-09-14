const express = require('express');
const { 
  getSalesmenReports, 
  exportReportsCSV,
  getBankCasesReport,
  exportBankCasesReportCSV
} = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/salesmen', getSalesmenReports);
router.get('/export-csv', exportReportsCSV);
router.get('/bank-cases', getBankCasesReport);
router.get('/export-bank-cases-csv', exportBankCasesReportCSV);

module.exports = router;
