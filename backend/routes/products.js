const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Note: Using the 'NewLogic' function which handles the dynamic table creation
router.get('/', authenticateToken, productController.getAllProductsWithNewLogic);
router.post('/:productId/favorite', authenticateToken, productController.toggleFavorite);

// Admin: Manage products logic can be added later (POST, PUT, DELETE)

module.exports = router;
