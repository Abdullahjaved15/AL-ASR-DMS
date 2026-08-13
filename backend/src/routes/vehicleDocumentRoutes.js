const express = require('express');
const router = express.Router();
const { getVehicleDocuments, addVehicleDocument, deleteVehicleDocument } = require('../controllers/vehicleDocumentController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);
router.get('/seller/:sellerId', getVehicleDocuments);
router.post('/', addVehicleDocument);
router.delete('/:id', deleteVehicleDocument);

module.exports = router;
