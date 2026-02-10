"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.updateProfile = exports.getProfile = exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const auth_1 = require("@/middleware/auth");
const logger_1 = require("@/utils/logger");
const express_validator_1 = require("express-validator");
const register = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date(),
            });
            return;
        }
        const { personnelId, name, email, phone, password, role = 'personnel', } = req.body;
        const existingUser = await models_1.User.findOne({
            where: { personnelId },
        });
        if (existingUser) {
            (0, logger_1.logSecurity)('Registration attempt with existing personnel ID', undefined, {
                personnelId,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(409).json({
                success: false,
                error: 'User with this personnel ID already exists',
                timestamp: new Date(),
            });
            return;
        }
        if (email) {
            const existingEmailUser = await models_1.User.findOne({
                where: { email },
            });
            if (existingEmailUser) {
                res.status(409).json({
                    success: false,
                    error: 'Email address is already in use',
                    timestamp: new Date(),
                });
                return;
            }
        }
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(password, saltRounds);
        const userData = {
            personnelId,
            name,
            role,
            passwordHash,
            isActive: true,
            preferences: {
                notifications: {
                    messages: true,
                    alerts: true,
                    reports: true,
                    system: true,
                },
                locationUpdateInterval: 30000,
                theme: 'system',
            },
        };
        if (email)
            userData.email = email;
        if (phone)
            userData.phone = phone;
        const user = await models_1.User.create(userData);
        (0, logger_1.logInfo)('New user registered', {
            userId: user.id,
            personnelId: user.personnelId,
            role: user.role,
            ip: req.ip,
        });
        const userResponse = {
            id: user.id,
            personnelId: user.personnelId,
            name: user.name,
            role: user.role,
        };
        if (user.email)
            userResponse.email = user.email;
        if (user.phone)
            userResponse.phone = user.phone;
        const response = {
            success: true,
            user: userResponse,
            message: 'User registered successfully',
        };
        res.status(201).json(response);
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'register',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.status(500).json({
            success: false,
            error: 'Registration failed',
            timestamp: new Date(),
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date(),
            });
            return;
        }
        const { username, password, deviceInfo } = req.body;
        const user = await models_1.User.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { personnelId: username },
                    { email: username },
                ],
            },
        });
        if (!user) {
            (0, logger_1.logSecurity)('Login attempt with non-existent user', undefined, {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                timestamp: new Date(),
            });
            return;
        }
        if (!user.isActive) {
            (0, logger_1.logSecurity)('Login attempt with inactive user', user.id, {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(403).json({
                success: false,
                error: 'Account is deactivated',
                timestamp: new Date(),
            });
            return;
        }
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            (0, logger_1.logSecurity)('Login attempt with invalid password', user.id, {
                username,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(401).json({
                success: false,
                error: 'Invalid credentials',
                timestamp: new Date(),
            });
            return;
        }
        const updateData = {
            lastSeen: new Date(),
        };
        if (deviceInfo)
            updateData.deviceInfo = deviceInfo;
        await user.update(updateData);
        const accessToken = (0, auth_1.generateToken)(user);
        const refreshToken = (0, auth_1.generateRefreshToken)(user);
        (0, logger_1.logInfo)('User logged in successfully', {
            userId: user.id,
            personnelId: user.personnelId,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        const userResponse = {
            id: user.id,
            personnelId: user.personnelId,
            name: user.name,
            role: user.role,
        };
        if (user.email)
            userResponse.email = user.email;
        if (user.phone)
            userResponse.phone = user.phone;
        if (user.avatar)
            userResponse.avatar = user.avatar;
        if (user.lastSeen)
            userResponse.lastSeen = user.lastSeen;
        const response = {
            success: true,
            user: userResponse,
            tokens: {
                accessToken,
                refreshToken,
                expiresIn: 24 * 60 * 60,
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'login',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.status(500).json({
            success: false,
            error: 'Login failed',
            timestamp: new Date(),
        });
    }
};
exports.login = login;
const refreshToken = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date(),
            });
            return;
        }
        const { refreshToken: token } = req.body;
        let userId;
        try {
            userId = (0, auth_1.verifyRefreshToken)(token);
        }
        catch (error) {
            (0, logger_1.logSecurity)('Invalid refresh token used', undefined, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(403).json({
                success: false,
                error: 'Invalid refresh token',
                timestamp: new Date(),
            });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user || !user.isActive) {
            (0, logger_1.logSecurity)('Refresh token used for invalid/inactive user', userId, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(403).json({
                success: false,
                error: 'Invalid user',
                timestamp: new Date(),
            });
            return;
        }
        const accessToken = (0, auth_1.generateToken)(user);
        const newRefreshToken = (0, auth_1.generateRefreshToken)(user);
        (0, logger_1.logInfo)('Tokens refreshed successfully', {
            userId: user.id,
            ip: req.ip,
        });
        const response = {
            success: true,
            tokens: {
                accessToken,
                refreshToken: newRefreshToken,
                expiresIn: 24 * 60 * 60,
            },
        };
        res.status(200).json(response);
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'refreshToken',
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.status(500).json({
            success: false,
            error: 'Token refresh failed',
            timestamp: new Date(),
        });
    }
};
exports.refreshToken = refreshToken;
const logout = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await models_1.User.update({ lastLogout: new Date() }, { where: { id: userId } });
            (0, logger_1.logInfo)('User logged out', {
                userId,
                ip: req.ip,
            });
        }
        res.status(200).json({
            success: true,
            message: 'Logged out successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'logout',
            userId: req.user?.id,
            ip: req.ip,
        });
        res.status(500).json({
            success: false,
            error: 'Logout failed',
            timestamp: new Date(),
        });
    }
};
exports.logout = logout;
const getProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date(),
            });
            return;
        }
        const user = await models_1.User.findByPk(userId, {
            attributes: {
                exclude: ['passwordHash'],
            },
        });
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date(),
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                personnelId: user.personnelId,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                lastSeen: user.lastSeen,
                preferences: user.preferences,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'getProfile',
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to get profile',
            timestamp: new Date(),
        });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date(),
            });
            return;
        }
        const userId = req.user?.id;
        const { name, email, phone, preferences } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date(),
            });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date(),
            });
            return;
        }
        if (email && email !== user.email) {
            const existingEmailUser = await models_1.User.findOne({
                where: {
                    email,
                    id: { [sequelize_1.Op.ne]: userId }
                },
            });
            if (existingEmailUser) {
                res.status(409).json({
                    success: false,
                    error: 'Email address is already in use',
                    timestamp: new Date(),
                });
                return;
            }
        }
        await user.update({
            name: name || user.name,
            email: email || user.email,
            phone: phone || user.phone,
            preferences: preferences || user.preferences,
        });
        (0, logger_1.logInfo)('User profile updated', {
            userId: user.id,
            changes: { name, email, phone, preferences },
        });
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                personnelId: user.personnelId,
                name: user.name,
                role: user.role,
                email: user.email,
                phone: user.phone,
                preferences: user.preferences,
                updatedAt: user.updatedAt,
            },
            message: 'Profile updated successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'updateProfile',
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to update profile',
            timestamp: new Date(),
        });
    }
};
exports.updateProfile = updateProfile;
const changePassword = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array(),
                timestamp: new Date(),
            });
            return;
        }
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;
        if (!userId) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                timestamp: new Date(),
            });
            return;
        }
        const user = await models_1.User.findByPk(userId);
        if (!user) {
            res.status(404).json({
                success: false,
                error: 'User not found',
                timestamp: new Date(),
            });
            return;
        }
        const isCurrentPasswordValid = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
            (0, logger_1.logSecurity)('Invalid current password in password change attempt', userId, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });
            res.status(401).json({
                success: false,
                error: 'Current password is incorrect',
                timestamp: new Date(),
            });
            return;
        }
        const saltRounds = 12;
        const newPasswordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await user.update({
            passwordHash: newPasswordHash,
        });
        (0, logger_1.logInfo)('User password changed', {
            userId: user.id,
            ip: req.ip,
        });
        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'changePassword',
            userId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to change password',
            timestamp: new Date(),
        });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=auth.js.map