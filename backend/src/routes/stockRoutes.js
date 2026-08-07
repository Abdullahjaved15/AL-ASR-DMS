const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCurrentStock,
  createStockItem,
  updateStockItem,
  deleteStockItem
} = require('../controllers/stockController');

router.use(authenticateToken);

router.get('/', getCurrentStock);
router.post('/', createStockItem);
router.put('/:id', updateStockItem);
router.delete('/:id', deleteStockItem);

module.exports = router;
