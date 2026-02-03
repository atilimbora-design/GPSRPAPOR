const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../config/multer');

// Create Report (File Uploads)
router.post('/', authenticateToken, upload.fields([
    { name: 'fuel_receipt', maxCount: 3 },
    { name: 'maintenance_receipt', maxCount: 3 }
]), reportController.createReport);

router.get('/history', authenticateToken, reportController.getHistory);
router.get('/:reportId/pdf', authenticateToken, reportController.getPdf);

module.exports = router;
