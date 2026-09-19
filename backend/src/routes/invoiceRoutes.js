const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { 
  requireAccountsAccess, 
  requireAccountsHeadOrSuperAdmin, 
  requireAccountsHeadOnly 
} = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Invoices & Vouchers accessible by SUPER_ADMIN, ACCOUNTS_HEAD, and ACCOUNTANT
router.use(authenticateToken, requireAccountsAccess);

router.get('/booking-by-phone', invoiceController.findActiveBookingByPhone);
router.get('/salesman-incentives', invoiceController.getSalesmanIncentives);
router.get('/customer-history', invoiceController.getCustomerTradeHistory);
router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.post('/:id/cancel-booking', invoiceController.cancelBookingAndIssueRefund);

// Accounts Head Sales / Voucher Approval & Rejection endpoints
router.post('/:id/approve', requireAccountsHeadOnly, invoiceController.approveInvoice);
router.post('/:id/reject', requireAccountsHeadOnly, invoiceController.rejectInvoice);

// Delete Invoice restricted to ACCOUNTS_HEAD and SUPER_ADMIN
router.delete('/:id', requireAccountsHeadOrSuperAdmin, invoiceController.deleteInvoice);

router.post('/:id/images', upload.array('images', 10), invoiceController.uploadInvoiceImages);
router.delete('/:invoiceId/images/:imageId', requireAccountsHeadOrSuperAdmin, invoiceController.deleteInvoiceImage);

module.exports = router;

