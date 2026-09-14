const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getAttendance,
  saveAttendance,
  saveBulkAttendance,
  deleteAttendance,
  getAttendanceReports,
  exportAttendanceCSV
} = require('../controllers/attendanceController');

// All endpoints in Attendance Module require Authentication
router.use(authenticateToken);

// Employee Roster Routes
router.get('/employees', getEmployees);
router.post('/employees', requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS_HEAD'), createEmployee);
router.put('/employees/:id', requireRole('ADMIN', 'SUPER_ADMIN', 'ACCOUNTS_HEAD'), updateEmployee);
router.delete('/employees/:id', requireRole('ADMIN', 'SUPER_ADMIN'), deleteEmployee);

// Attendance Logging Routes
router.get('/', getAttendance);
router.post('/', saveAttendance);
router.post('/bulk', saveBulkAttendance);
router.delete('/:id', requireRole('ADMIN', 'SUPER_ADMIN'), deleteAttendance);

// Reports & CSV Export Routes
router.get('/reports', getAttendanceReports);
router.get('/export-csv', exportAttendanceCSV);

module.exports = router;
