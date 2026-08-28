const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createIncentiveApprovalSheet,
  getIncentiveApprovalSheets,
  getIncentiveApprovalSheetById,
  updateIncentiveApprovalSheet,
  deleteIncentiveApprovalSheet,
  uploadIncentiveApprovalSheetImages,
  deleteIncentiveApprovalSheetImage
} = require('../controllers/incentiveApprovalController');

// All authenticated users can access Incentive Approval Sheets
router.use(authenticateToken);

router.post('/', createIncentiveApprovalSheet);
router.get('/', getIncentiveApprovalSheets);
router.get('/:id', getIncentiveApprovalSheetById);
router.put('/:id', updateIncentiveApprovalSheet);
router.delete('/:id', deleteIncentiveApprovalSheet);

router.post('/:id/images', upload.array('images', 10), uploadIncentiveApprovalSheetImages);
router.delete('/:sheetId/images/:imageId', deleteIncentiveApprovalSheetImage);

module.exports = router;
