const express = require('express');
const {
  getSellers,
  getSellerById,
  createSeller,
  updateSeller,
  deleteSeller,
  uploadSellerImages,
  deleteSellerImage
} = require('../controllers/sellerController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(authenticateToken);

router.get('/', getSellers);
router.get('/:id', getSellerById);
router.post('/', createSeller);
router.put('/:id', updateSeller);
router.delete('/:id', deleteSeller);

router.post('/:id/images', upload.array('images', 10), uploadSellerImages);
router.delete('/:sellerId/images/:imageId', deleteSellerImage);

module.exports = router;
