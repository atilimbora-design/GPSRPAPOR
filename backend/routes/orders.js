const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// --- Specific Routes First ---

// Admin: Get all orders (with strict logging)
router.get('/all', (req, res, next) => {
    try { require('fs').appendFileSync('debug_route.log', `[${new Date().toISOString()}] GET /orders/all Request received from ${req.ip}\n`); } catch (e) { }
    next();
}, authenticateToken, requireAdmin, orderController.getAllOrders);

// Admin: Export Excel
router.get('/export/excel', authenticateToken, requireAdmin, orderController.exportExcel);

// Personel: Today's Order
router.get('/today', authenticateToken, orderController.todaysOrder);
router.post('/today', authenticateToken, orderController.saveOrder);
router.delete('/today', authenticateToken, orderController.deleteOrder);

// Personel: Order History
router.get('/history', authenticateToken, orderController.getHistory);

// --- Dynamic Routes Last ---

// Get Specific Order Details
router.get('/:id', authenticateToken, orderController.getOrderDetails);

// Admin: Root get all (Legacy, good to keep)
router.get('/', authenticateToken, requireAdmin, orderController.getAllOrders);

module.exports = router;
