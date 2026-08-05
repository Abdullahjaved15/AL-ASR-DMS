const express = require('express');
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats', getDashboardStats);

module.exports = router;
