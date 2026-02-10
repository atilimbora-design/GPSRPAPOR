import { Router } from 'express';
import { LocationController } from '@/controllers/location';
import { authenticateToken } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { body, query, param } from 'express-validator';

const router = Router();

// All location routes require authentication
router.use(authenticateToken);

/**
 * @route POST /api/locations
 * @desc Store single location update
 * @access Private
 */
router.post('/',
  [
    body('latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180'),
    body('timestamp')
      .isISO8601()
      .withMessage('Timestamp must be a valid ISO 8601 date'),
    body('accuracy')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Accuracy must be a positive number'),
    body('altitude')
      .optional()
      .isFloat()
      .withMessage('Altitude must be a number'),
    body('speed')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Speed must be a positive number'),
    body('heading')
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage('Heading must be between 0 and 360'),
    body('batteryLevel')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Battery level must be between 0 and 100'),
    body('source')
      .optional()
      .isIn(['gps', 'network', 'passive'])
      .withMessage('Source must be gps, network, or passive'),
    validateRequest
  ],
  LocationController.storeLocation
);

/**
 * @route POST /api/locations/batch
 * @desc Store multiple location updates
 * @access Private
 */
router.post('/batch',
  [
    body('locations')
      .isArray({ min: 1, max: 100 })
      .withMessage('Locations must be an array with 1-100 items'),
    body('locations.*.latitude')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Each location latitude must be between -90 and 90'),
    body('locations.*.longitude')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Each location longitude must be between -180 and 180'),
    body('locations.*.timestamp')
      .isISO8601()
      .withMessage('Each location timestamp must be a valid ISO 8601 date'),
    validateRequest
  ],
  LocationController.storeBatchLocations
);

/**
 * @route GET /api/locations/history/:userId?
 * @desc Get location history for user
 * @access Private (own data) / Admin (any user)
 */
router.get('/history/:userId?',
  [
    param('userId')
      .optional()
      .isNumeric()
      .withMessage('User ID must be a number'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Limit must be between 1 and 1000'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),
    query('source')
      .optional()
      .isIn(['gps', 'network', 'passive'])
      .withMessage('Source must be gps, network, or passive'),
    validateRequest
  ],
  LocationController.getLocationHistory
);

/**
 * @route GET /api/locations/current
 * @desc Get current locations of all active users
 * @access Admin only
 */
router.get('/current',
  LocationController.getCurrentLocations
);

/**
 * @route GET /api/locations/stats/:userId?
 * @desc Get location statistics for user
 * @access Private (own data) / Admin (any user)
 */
router.get('/stats/:userId?',
  [
    param('userId')
      .optional()
      .isNumeric()
      .withMessage('User ID must be a number'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    validateRequest
  ],
  LocationController.getLocationStats
);

/**
 * @route DELETE /api/locations/cleanup
 * @desc Clean up old location data
 * @access Admin only
 */
router.delete('/cleanup',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
    validateRequest
  ],
  LocationController.cleanupOldLocations
);

/**
 * @route POST /api/locations/compress
 * @desc Compress old location history
 * @access Admin only
 */
router.post('/compress',
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
    query('compressionRatio')
      .optional()
      .isFloat({ min: 0.1, max: 1.0 })
      .withMessage('Compression ratio must be between 0.1 and 1.0'),
    validateRequest
  ],
  LocationController.compressLocationHistory
);

export default router;