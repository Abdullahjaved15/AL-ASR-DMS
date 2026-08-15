const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  createReceivingLetter,
  getReceivingLetters,
  getReceivingLetterById,
  updateReceivingLetter,
  deleteReceivingLetter,
  uploadReceivingLetterImages,
  deleteReceivingLetterImage
} = require('../controllers/receivingLetterController');

// All authenticated staff can access Receiving Letters
router.use(authenticateToken);

router.post('/', createReceivingLetter);
router.get('/', getReceivingLetters);
router.get('/:id', getReceivingLetterById);
router.put('/:id', updateReceivingLetter);
router.delete('/:id', deleteReceivingLetter);

router.post('/:id/images', upload.array('images', 10), uploadReceivingLetterImages);
router.delete('/:letterId/images/:imageId', deleteReceivingLetterImage);

module.exports = router;
