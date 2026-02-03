const express = require('express');
const router = express.Router();
const gpsController = require('../controllers/gpsController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Personel GPS update
router.post('/update', authenticateToken, gpsController.updateLocation);

// Admin routes
router.get('/live', authenticateToken, requireAdmin, gpsController.getLiveLocations);
router.get('/history/:userId', authenticateToken, requireAdmin, gpsController.getHistory);

module.exports = router;
