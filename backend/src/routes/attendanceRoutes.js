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

// All endpoints in Attendance Module require Authentication AND Admin/Super Admin Role
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

// Employee Roster Routes
router.get('/employees', getEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Attendance Logging Routes
router.get('/', getAttendance);
router.post('/', saveAttendance);
router.post('/bulk', saveBulkAttendance);
router.delete('/:id', deleteAttendance);

// Reports & CSV Export Routes
router.get('/reports', getAttendanceReports);
router.get('/export-csv', exportAttendanceCSV);

module.exports = router;
