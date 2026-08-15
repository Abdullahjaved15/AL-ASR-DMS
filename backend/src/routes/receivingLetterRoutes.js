const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  createReceivingLetter,
  getReceivingLetters,
  getReceivingLetterById,
  updateReceivingLetter,
  deleteReceivingLetter
} = require('../controllers/receivingLetterController');

// All authenticated staff can access Receiving Letters
router.use(authenticateToken);

router.post('/', createReceivingLetter);
router.get('/', getReceivingLetters);
router.get('/:id', getReceivingLetterById);
router.put('/:id', updateReceivingLetter);
router.delete('/:id', deleteReceivingLetter);

module.exports = router;
