const express = require('express');
const { getDeals, createDeal } = require('../controllers/dealController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getDeals);
router.post('/', createDeal);

module.exports = router;
