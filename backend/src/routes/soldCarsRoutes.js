const express = require('express');
const router = express.Router();
const soldCarsController = require('../controllers/soldCarsController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authenticated user
router.use(authenticateToken);

// 1. Get All Sold Cars & Summary Statistics
router.get('/', soldCarsController.getSoldCars);

// 2. Get Deep Vehicle Lifecycle & Ownership History
router.get('/:chassisNumber/history', soldCarsController.getVehicleHistory);

// 3. Record Showroom Buyback (Add returned car back into stock)
router.post('/buyback', soldCarsController.recordVehicleBuyback);

module.exports = router;
