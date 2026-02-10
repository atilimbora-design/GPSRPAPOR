"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_1 = require("@/controllers/admin");
const auth_1 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const adminRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many admin requests, please try again later',
        timestamp: new Date(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
router.use(adminRateLimit);
router.get('/users', (0, auth_1.requirePermission)(auth_1.Permission.USER_READ), admin_1.getAllUsers);
router.get('/users/statistics', (0, auth_1.requirePermission)(auth_1.Permission.USER_READ), admin_1.getUserStatistics);
router.get('/users/:userId', (0, auth_1.requirePermission)(auth_1.Permission.USER_READ), admin_1.getUserById);
router.post('/users', (0, auth_1.requirePermission)(auth_1.Permission.USER_CREATE), validation_1.validateAdminUserCreation, admin_1.createUser);
router.put('/users/:userId', (0, auth_1.requirePermission)(auth_1.Permission.USER_UPDATE), validation_1.validateAdminUserUpdate, admin_1.updateUser);
router.delete('/users/:userId', (0, auth_1.requirePermission)(auth_1.Permission.USER_DELETE), admin_1.deleteUser);
router.patch('/users/:userId/role', (0, auth_1.requirePermission)(auth_1.Permission.USER_MANAGE_ROLES), validation_1.validateRoleUpdate, admin_1.updateUserRole);
router.patch('/users/:userId/status', (0, auth_1.requirePermission)(auth_1.Permission.USER_UPDATE), admin_1.toggleUserStatus);
router.post('/users/:userId/reset-password', (0, auth_1.requirePermission)(auth_1.Permission.USER_UPDATE), validation_1.validatePasswordReset, admin_1.resetUserPassword);
exports.default = router;
//# sourceMappingURL=admin.js.map