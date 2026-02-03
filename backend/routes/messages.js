const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../config/multer');

// Send Message (Text or File)
router.post('/send', authenticateToken, upload.single('file'), messageController.sendMessage);

// Get Conversations List
router.get('/conversations', authenticateToken, messageController.getConversations);

// Get Chat History (Direct)
router.get('/direct/:userId', authenticateToken, messageController.getDirectMessages);

// Get Chat History (Group)
router.get('/group/:groupId', authenticateToken, messageController.getGroupMessages);

module.exports = router;
