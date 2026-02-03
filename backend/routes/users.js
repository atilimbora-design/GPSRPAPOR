const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../config/multer');

// Own Profile
router.get('/me', authenticateToken, userController.getMe);
router.patch('/me', authenticateToken, upload.single('profile_photo'), userController.updateMe);

// Admin Routes (User Management)
router.get('/', authenticateToken, requireAdmin, userController.getAllUsers);
router.post('/', authenticateToken, requireAdmin, userController.createUser);
router.patch('/:userId', authenticateToken, requireAdmin, userController.updateUser);
router.delete('/:userId', authenticateToken, requireAdmin, userController.deleteUser);

module.exports = router;
