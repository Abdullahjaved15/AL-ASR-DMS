const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCollaborations,
  createCollaboration,
  updateCollaborationStatus,
  deleteCollaboration
} = require('../controllers/collaborationController');

router.use(authenticateToken);

router.get('/', getCollaborations);
router.post('/', createCollaboration);
router.put('/:id', updateCollaborationStatus);
router.delete('/:id', deleteCollaboration);

module.exports = router;
