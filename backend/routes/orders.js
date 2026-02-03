const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Personel routes
router.get('/today', authenticateToken, orderController.todaysOrder);
router.post('/today', authenticateToken, orderController.saveOrder);
router.get('/history', authenticateToken, orderController.getHistory);

// Admin routes
router.get('/all', authenticateToken, requireAdmin, orderController.getAllOrders);
router.get('/export/excel', authenticateToken, requireAdmin, orderController.exportExcel);

module.exports = router;
