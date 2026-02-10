"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("@/controllers/auth");
const auth_2 = require("@/middleware/auth");
const validation_1 = require("@/middleware/validation");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const router = (0, express_1.Router)();
const authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later',
        timestamp: new Date(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
const refreshRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many token refresh attempts, please try again later',
        timestamp: new Date(),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
router.post('/register', authRateLimit, auth_2.authenticateToken, auth_2.requireAdmin, validation_1.validateRegistration, auth_1.register);
router.post('/login', authRateLimit, auth_2.logAuthAttempt, validation_1.validateLogin, auth_1.login);
router.post('/refresh', refreshRateLimit, validation_1.validateRefreshToken, auth_1.refreshToken);
router.post('/logout', auth_2.authenticateToken, auth_1.logout);
router.get('/profile', auth_2.authenticateToken, auth_1.getProfile);
router.put('/profile', auth_2.authenticateToken, validation_1.validateProfileUpdate, auth_1.updateProfile);
router.put('/password', auth_2.authenticateToken, validation_1.validatePasswordChange, auth_1.changePassword);
router.get('/verify', auth_2.authenticateToken, (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            id: req.user?.id,
            role: req.user?.role,
            name: req.user?.name,
            code: req.user?.code,
        },
        message: 'Token is valid',
        timestamp: new Date(),
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map