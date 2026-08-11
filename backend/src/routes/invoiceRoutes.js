const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// All invoice routes require SUPER_ADMIN role
router.use(authenticateToken, requireRole('SUPER_ADMIN'));

router.get('/', invoiceController.getInvoices);
router.get('/:id', invoiceController.getInvoiceById);
router.post('/', invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

router.post('/:id/images', upload.array('images', 10), invoiceController.uploadInvoiceImages);
router.delete('/:invoiceId/images/:imageId', invoiceController.deleteInvoiceImage);

module.exports = router;
