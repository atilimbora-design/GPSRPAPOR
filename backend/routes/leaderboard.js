const express = require('express');
const router = express.Router();
const leaderboardController = require('../controllers/leaderboardController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, leaderboardController.getLeaderboard);
router.get('/summary', authenticateToken, leaderboardController.getWeeklySummary);

module.exports = router;
