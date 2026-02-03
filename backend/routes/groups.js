const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../config/multer');

// Create Group
router.post('/', authenticateToken, upload.single('photo'), groupController.createGroup);

// Get Group Details
router.get('/:groupId', authenticateToken, groupController.getGroupDetails);

// Add Members
router.post('/:groupId/members', authenticateToken, groupController.addMembers);

// Leave Group
router.post('/:groupId/leave', authenticateToken, groupController.leaveGroup);

module.exports = router;
