const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getAccountsStock,
  createAccountsStockItem,
  updateAccountsStockItem,
  deleteAccountsStockItem,
  clearAllAccountsStock
} = require('../controllers/accountsStockController');

router.use(authenticateToken);

router.get('/', getAccountsStock);
router.post('/', createAccountsStockItem);
router.delete('/clear-all', clearAllAccountsStock);
router.put('/:id', updateAccountsStockItem);
router.delete('/:id', deleteAccountsStockItem);

module.exports = router;
