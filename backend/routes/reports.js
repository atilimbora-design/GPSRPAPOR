const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const upload = require('../config/multer');

// Create Report (File Uploads)
router.post('/', authenticateToken, upload.fields([
    { name: 'fuel_receipt', maxCount: 3 },
    { name: 'maintenance_receipt', maxCount: 3 }
]), reportController.createReport);

router.get('/history', authenticateToken, reportController.getHistory);
router.get('/all', authenticateToken, reportController.getAllReports);
router.get('/:reportId/pdf', authenticateToken, reportController.getPdf);
// Export Excel (Daily Summary)
router.get('/export/excel', authenticateToken, reportController.exportExcel);

router.delete('/:id', authenticateToken, requireAdmin, reportController.deleteReport); // DELETE Route

module.exports = router;
