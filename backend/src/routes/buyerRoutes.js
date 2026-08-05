const express = require('express');
const {
  getBuyers,
  getBuyerById,
  createBuyer,
  updateBuyer,
  deleteBuyer
} = require('../controllers/buyerController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getBuyers);
router.get('/:id', getBuyerById);
router.post('/', createBuyer);
router.put('/:id', updateBuyer);
router.delete('/:id', deleteBuyer);

module.exports = router;
