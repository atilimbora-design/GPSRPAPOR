import { body, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { logError } from '@/utils/logger';

/**
 * Middleware to handle validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logError(new Error('Validation failed'), {
      errors: errors.array(),
      path: req.path,
      method: req.method,
    });
    
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  
  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegistration: ValidationChain[] = [
  body('personnelId')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Personnel ID must be between 1 and 10 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Personnel ID can only contain letters and numbers'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('role')
    .optional()
    .isIn(['personnel', 'admin'])
    .withMessage('Role must be either "personnel" or "admin"'),
];

/**
 * Validation rules for user login
 */
export const validateLogin: ValidationChain[] = [
  body('username')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Username is required and must be less than 100 characters'),

  body('password')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password is required'),

  body('deviceInfo')
    .optional()
    .isObject()
    .withMessage('Device info must be an object'),

  body('deviceInfo.deviceId')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Device ID must be between 1 and 255 characters'),

  body('deviceInfo.platform')
    .optional()
    .trim()
    .isIn(['android', 'ios', 'web'])
    .withMessage('Platform must be android, ios, or web'),

  body('deviceInfo.appVersion')
    .optional()
    .trim()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('App version must be in format x.y.z'),

  body('deviceInfo.fcmToken')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('FCM token must be between 1 and 1000 characters'),
];

/**
 * Validation rules for token refresh
 */
export const validateRefreshToken: ValidationChain[] = [
  body('refreshToken')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Refresh token is required'),
];

/**
 * Validation rules for profile update
 */
export const validateProfileUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),

  body('preferences.notifications')
    .optional()
    .isObject()
    .withMessage('Notification preferences must be an object'),

  body('preferences.notifications.messages')
    .optional()
    .isBoolean()
    .withMessage('Message notifications preference must be a boolean'),

  body('preferences.notifications.alerts')
    .optional()
    .isBoolean()
    .withMessage('Alert notifications preference must be a boolean'),

  body('preferences.notifications.reports')
    .optional()
    .isBoolean()
    .withMessage('Report notifications preference must be a boolean'),

  body('preferences.notifications.system')
    .optional()
    .isBoolean()
    .withMessage('System notifications preference must be a boolean'),

  body('preferences.locationUpdateInterval')
    .optional()
    .isInt({ min: 10000, max: 300000 })
    .withMessage('Location update interval must be between 10 and 300 seconds (in milliseconds)'),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
];

/**
 * Validation rules for password change
 */
export const validatePasswordChange: ValidationChain[] = [
  body('currentPassword')
    .isLength({ min: 1 })
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    }),
];

/**
 * Validation rules for location data
 */
export const validateLocationData: ValidationChain[] = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),

  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),

  body('accuracy')
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
    .withMessage('Heading must be between 0 and 360 degrees'),

  body('timestamp')
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date'),

  body('batteryLevel')
    .isInt({ min: 0, max: 100 })
    .withMessage('Battery level must be between 0 and 100'),

  body('source')
    .isIn(['gps', 'network', 'passive'])
    .withMessage('Source must be gps, network, or passive'),

  body('isManual')
    .optional()
    .isBoolean()
    .withMessage('isManual must be a boolean'),

  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
];

/**
 * Validation rules for message data
 */
export const validateMessageData: ValidationChain[] = [
  body('conversationId')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Conversation ID is required and must be less than 255 characters'),

  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Message content is required and must be less than 10000 characters'),

  body('type')
    .isIn(['text', 'location', 'image', 'system'])
    .withMessage('Message type must be text, location, image, or system'),

  body('recipientIds')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),

  body('recipientIds.*')
    .isInt({ min: 1 })
    .withMessage('Recipient IDs must be positive integers'),

  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),

  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),

  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Location latitude must be between -90 and 90'),

  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Location longitude must be between -180 and 180'),
];

/**
 * Validation rules for report criteria
 */
export const validateReportCriteria: ValidationChain[] = [
  body('type')
    .isIn(['daily', 'weekly', 'custom'])
    .withMessage('Report type must be daily, weekly, or custom'),

  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Report title is required and must be less than 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Report description must be less than 1000 characters'),

  body('criteria')
    .isObject()
    .withMessage('Report criteria must be an object'),

  body('criteria.startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  body('criteria.endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      const startDate = new Date(req.body.criteria.startDate);
      const endDate = new Date(value);
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),

  body('criteria.userIds')
    .optional()
    .isArray()
    .withMessage('User IDs must be an array'),

  body('criteria.userIds.*')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User IDs must be positive integers'),

  body('criteria.includeLocations')
    .isBoolean()
    .withMessage('Include locations must be a boolean'),

  body('criteria.includeMessages')
    .isBoolean()
    .withMessage('Include messages must be a boolean'),

  body('criteria.includeAnalytics')
    .isBoolean()
    .withMessage('Include analytics must be a boolean'),

  body('criteria.format')
    .optional()
    .isIn(['pdf', 'excel', 'json'])
    .withMessage('Format must be pdf, excel, or json'),
];

/**
 * Validation rules for admin user creation
 */
export const validateAdminUserCreation: ValidationChain[] = [
  body('personnelId')
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage('Personnel ID must be between 1 and 10 characters')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Personnel ID can only contain letters and numbers'),

  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  body('role')
    .isIn(['personnel', 'admin'])
    .withMessage('Role must be either "personnel" or "admin"'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

/**
 * Validation rules for admin user update
 */
export const validateAdminUserUpdate: ValidationChain[] = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
    .withMessage('Name can only contain letters and spaces'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d]{0,15}$/)
    .withMessage('Please provide a valid phone number'),

  body('role')
    .optional()
    .isIn(['personnel', 'admin'])
    .withMessage('Role must be either "personnel" or "admin"'),

  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),

  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
];

/**
 * Validation rules for role update
 */
export const validateRoleUpdate: ValidationChain[] = [
  body('role')
    .isIn(['personnel', 'admin'])
    .withMessage('Role must be either "personnel" or "admin"'),
];

/**
 * Validation rules for password reset
 */
export const validatePasswordReset: ValidationChain[] = [
  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
];
