const express = require('express');
const { getDeals, createDeal, deleteDeal } = require('../controllers/dealController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getDeals);
router.post('/', createDeal);
router.delete('/:id', deleteDeal);

module.exports = router;
