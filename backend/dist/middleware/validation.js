"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordReset = exports.validateRoleUpdate = exports.validateAdminUserUpdate = exports.validateAdminUserCreation = exports.validateReportCriteria = exports.validateMessageData = exports.validateLocationData = exports.validatePasswordChange = exports.validateProfileUpdate = exports.validateRefreshToken = exports.validateLogin = exports.validateRegistration = void 0;
const express_validator_1 = require("express-validator");
exports.validateRegistration = [
    (0, express_validator_1.body)('personnelId')
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage('Personnel ID must be between 1 and 10 characters')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('Personnel ID can only contain letters and numbers'),
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    (0, express_validator_1.body)('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['personnel', 'admin'])
        .withMessage('Role must be either "personnel" or "admin"'),
];
exports.validateLogin = [
    (0, express_validator_1.body)('username')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Username is required and must be less than 100 characters'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 1, max: 128 })
        .withMessage('Password is required'),
    (0, express_validator_1.body)('deviceInfo')
        .optional()
        .isObject()
        .withMessage('Device info must be an object'),
    (0, express_validator_1.body)('deviceInfo.deviceId')
        .optional()
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Device ID must be between 1 and 255 characters'),
    (0, express_validator_1.body)('deviceInfo.platform')
        .optional()
        .trim()
        .isIn(['android', 'ios', 'web'])
        .withMessage('Platform must be android, ios, or web'),
    (0, express_validator_1.body)('deviceInfo.appVersion')
        .optional()
        .trim()
        .matches(/^\d+\.\d+\.\d+$/)
        .withMessage('App version must be in format x.y.z'),
    (0, express_validator_1.body)('deviceInfo.fcmToken')
        .optional()
        .trim()
        .isLength({ min: 1, max: 1000 })
        .withMessage('FCM token must be between 1 and 1000 characters'),
];
exports.validateRefreshToken = [
    (0, express_validator_1.body)('refreshToken')
        .trim()
        .isLength({ min: 1 })
        .withMessage('Refresh token is required'),
];
exports.validateProfileUpdate = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    (0, express_validator_1.body)('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
    (0, express_validator_1.body)('preferences.notifications')
        .optional()
        .isObject()
        .withMessage('Notification preferences must be an object'),
    (0, express_validator_1.body)('preferences.notifications.messages')
        .optional()
        .isBoolean()
        .withMessage('Message notifications preference must be a boolean'),
    (0, express_validator_1.body)('preferences.notifications.alerts')
        .optional()
        .isBoolean()
        .withMessage('Alert notifications preference must be a boolean'),
    (0, express_validator_1.body)('preferences.notifications.reports')
        .optional()
        .isBoolean()
        .withMessage('Report notifications preference must be a boolean'),
    (0, express_validator_1.body)('preferences.notifications.system')
        .optional()
        .isBoolean()
        .withMessage('System notifications preference must be a boolean'),
    (0, express_validator_1.body)('preferences.locationUpdateInterval')
        .optional()
        .isInt({ min: 10000, max: 300000 })
        .withMessage('Location update interval must be between 10 and 300 seconds (in milliseconds)'),
    (0, express_validator_1.body)('preferences.theme')
        .optional()
        .isIn(['light', 'dark', 'system'])
        .withMessage('Theme must be light, dark, or system'),
];
exports.validatePasswordChange = [
    (0, express_validator_1.body)('currentPassword')
        .isLength({ min: 1 })
        .withMessage('Current password is required'),
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    (0, express_validator_1.body)('confirmPassword')
        .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
        }
        return true;
    }),
];
exports.validateLocationData = [
    (0, express_validator_1.body)('latitude')
        .isFloat({ min: -90, max: 90 })
        .withMessage('Latitude must be between -90 and 90'),
    (0, express_validator_1.body)('longitude')
        .isFloat({ min: -180, max: 180 })
        .withMessage('Longitude must be between -180 and 180'),
    (0, express_validator_1.body)('accuracy')
        .isFloat({ min: 0 })
        .withMessage('Accuracy must be a positive number'),
    (0, express_validator_1.body)('altitude')
        .optional()
        .isFloat()
        .withMessage('Altitude must be a number'),
    (0, express_validator_1.body)('speed')
        .optional()
        .isFloat({ min: 0 })
        .withMessage('Speed must be a positive number'),
    (0, express_validator_1.body)('heading')
        .optional()
        .isFloat({ min: 0, max: 360 })
        .withMessage('Heading must be between 0 and 360 degrees'),
    (0, express_validator_1.body)('timestamp')
        .isISO8601()
        .withMessage('Timestamp must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('batteryLevel')
        .isInt({ min: 0, max: 100 })
        .withMessage('Battery level must be between 0 and 100'),
    (0, express_validator_1.body)('source')
        .isIn(['gps', 'network', 'passive'])
        .withMessage('Source must be gps, network, or passive'),
    (0, express_validator_1.body)('isManual')
        .optional()
        .isBoolean()
        .withMessage('isManual must be a boolean'),
    (0, express_validator_1.body)('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];
exports.validateMessageData = [
    (0, express_validator_1.body)('conversationId')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Conversation ID is required and must be less than 255 characters'),
    (0, express_validator_1.body)('content')
        .trim()
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content is required and must be less than 10000 characters'),
    (0, express_validator_1.body)('type')
        .isIn(['text', 'location', 'image', 'system'])
        .withMessage('Message type must be text, location, image, or system'),
    (0, express_validator_1.body)('recipientIds')
        .isArray({ min: 1 })
        .withMessage('At least one recipient is required'),
    (0, express_validator_1.body)('recipientIds.*')
        .isInt({ min: 1 })
        .withMessage('Recipient IDs must be positive integers'),
    (0, express_validator_1.body)('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
    (0, express_validator_1.body)('location')
        .optional()
        .isObject()
        .withMessage('Location must be an object'),
    (0, express_validator_1.body)('location.latitude')
        .optional()
        .isFloat({ min: -90, max: 90 })
        .withMessage('Location latitude must be between -90 and 90'),
    (0, express_validator_1.body)('location.longitude')
        .optional()
        .isFloat({ min: -180, max: 180 })
        .withMessage('Location longitude must be between -180 and 180'),
];
exports.validateReportCriteria = [
    (0, express_validator_1.body)('type')
        .isIn(['daily', 'weekly', 'custom'])
        .withMessage('Report type must be daily, weekly, or custom'),
    (0, express_validator_1.body)('title')
        .trim()
        .isLength({ min: 1, max: 255 })
        .withMessage('Report title is required and must be less than 255 characters'),
    (0, express_validator_1.body)('description')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Report description must be less than 1000 characters'),
    (0, express_validator_1.body)('criteria')
        .isObject()
        .withMessage('Report criteria must be an object'),
    (0, express_validator_1.body)('criteria.startDate')
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    (0, express_validator_1.body)('criteria.endDate')
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
    (0, express_validator_1.body)('criteria.userIds')
        .optional()
        .isArray()
        .withMessage('User IDs must be an array'),
    (0, express_validator_1.body)('criteria.userIds.*')
        .optional()
        .isInt({ min: 1 })
        .withMessage('User IDs must be positive integers'),
    (0, express_validator_1.body)('criteria.includeLocations')
        .isBoolean()
        .withMessage('Include locations must be a boolean'),
    (0, express_validator_1.body)('criteria.includeMessages')
        .isBoolean()
        .withMessage('Include messages must be a boolean'),
    (0, express_validator_1.body)('criteria.includeAnalytics')
        .isBoolean()
        .withMessage('Include analytics must be a boolean'),
    (0, express_validator_1.body)('criteria.format')
        .optional()
        .isIn(['pdf', 'excel', 'json'])
        .withMessage('Format must be pdf, excel, or json'),
];
exports.validateAdminUserCreation = [
    (0, express_validator_1.body)('personnelId')
        .trim()
        .isLength({ min: 1, max: 10 })
        .withMessage('Personnel ID must be between 1 and 10 characters')
        .matches(/^[A-Za-z0-9]+$/)
        .withMessage('Personnel ID can only contain letters and numbers'),
    (0, express_validator_1.body)('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    (0, express_validator_1.body)('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
    (0, express_validator_1.body)('role')
        .isIn(['personnel', 'admin'])
        .withMessage('Role must be either "personnel" or "admin"'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
];
exports.validateAdminUserUpdate = [
    (0, express_validator_1.body)('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Name can only contain letters and spaces'),
    (0, express_validator_1.body)('email')
        .optional()
        .trim()
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    (0, express_validator_1.body)('phone')
        .optional()
        .trim()
        .matches(/^[\+]?[1-9][\d]{0,15}$/)
        .withMessage('Please provide a valid phone number'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['personnel', 'admin'])
        .withMessage('Role must be either "personnel" or "admin"'),
    (0, express_validator_1.body)('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean'),
    (0, express_validator_1.body)('preferences')
        .optional()
        .isObject()
        .withMessage('Preferences must be an object'),
];
exports.validateRoleUpdate = [
    (0, express_validator_1.body)('role')
        .isIn(['personnel', 'admin'])
        .withMessage('Role must be either "personnel" or "admin"'),
];
exports.validatePasswordReset = [
    (0, express_validator_1.body)('newPassword')
        .isLength({ min: 8, max: 128 })
        .withMessage('New password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
];
//# sourceMappingURL=validation.js.map