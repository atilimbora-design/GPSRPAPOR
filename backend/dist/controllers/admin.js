"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStatistics = exports.resetUserPassword = exports.toggleUserStatus = exports.updateUserRole = exports.deleteUser = exports.updateUser = exports.createUser = exports.getUserById = exports.getAllUsers = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sequelize_1 = require("sequelize");
const models_1 = require("@/models");
const logger_1 = require("@/utils/logger");
const express_validator_1 = require("express-validator");
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const role = req.query.role;
        const isActive = req.query.isActive;
        const search = req.query.search;
        const offset = (page - 1) * limit;
        const where = {};
        if (role && (role === 'personnel' || role === 'admin')) {
            where.role = role;
        }
        if (isActive !== undefined) {
            where.isActive = isActive === 'true';
        }
        if (search) {
            where[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { personnelId: { [sequelize_1.Op.like]: `%${search}%` } },
                { email: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows: users } = await models_1.User.findAndCountAll({
            where,
            attributes: {
                exclude: ['passwordHash'],
            },
            limit,
            offset,
            order: [['createdAt', 'DESC']],
        });
        const totalPages = Math.ceil(count / limit);
        (0, logger_1.logInfo)('Admin retrieved user list', {
            adminId: req.user?.id,
            page,
            limit,
            total: count,
        });
        const response = {
            success: true,
            data: users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages,
            },
            timestamp: new Date(),
        };
        res.status(200).json(response);
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'getAllUsers',
            adminId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve users',
            timestamp: new Date(),
        });
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId || '0', 10);
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
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
        (0, logger_1.logInfo)('Admin retrieved user details', {
            adminId: req.user?.id,
            targetUserId: userId,
        });
        res.status(200).json({
            success: true,
            data: user,
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'getUserById',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve user',
            timestamp: new Date(),
        });
    }
};
exports.getUserById = getUserById;
const createUser = async (req, res) => {
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
        const { personnelId, name, email, phone, password, role = 'personnel', isActive = true, } = req.body;
        const existingUser = await models_1.User.findOne({
            where: { personnelId },
        });
        if (existingUser) {
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
            isActive,
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
        (0, logger_1.logInfo)('Admin created new user', {
            adminId: req.user?.id,
            newUserId: user.id,
            personnelId: user.personnelId,
            role: user.role,
        });
        const userResponse = {
            id: user.id,
            personnelId: user.personnelId,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
        };
        if (user.email)
            userResponse.email = user.email;
        if (user.phone)
            userResponse.phone = user.phone;
        res.status(201).json({
            success: true,
            data: userResponse,
            message: 'User created successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'createUser',
            adminId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            timestamp: new Date(),
        });
    }
};
exports.createUser = createUser;
const updateUser = async (req, res) => {
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
        const userId = parseInt(req.params.userId || '0', 10);
        const { name, email, phone, role, isActive, preferences } = req.body;
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
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
        const updateData = {};
        if (name !== undefined)
            updateData.name = name;
        if (email !== undefined)
            updateData.email = email;
        if (phone !== undefined)
            updateData.phone = phone;
        if (role !== undefined)
            updateData.role = role;
        if (isActive !== undefined)
            updateData.isActive = isActive;
        if (preferences !== undefined)
            updateData.preferences = preferences;
        await user.update(updateData);
        (0, logger_1.logInfo)('Admin updated user', {
            adminId: req.user?.id,
            targetUserId: userId,
            changes: updateData,
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
                isActive: user.isActive,
                preferences: user.preferences,
                updatedAt: user.updatedAt,
            },
            message: 'User updated successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'updateUser',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to update user',
            timestamp: new Date(),
        });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId || '0', 10);
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                timestamp: new Date(),
            });
            return;
        }
        if (userId === req.user?.id) {
            res.status(400).json({
                success: false,
                error: 'Cannot delete your own account',
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
        await user.destroy();
        (0, logger_1.logSecurity)('Admin deleted user', req.user?.id, {
            targetUserId: userId,
            targetPersonnelId: user.personnelId,
            targetRole: user.role,
        });
        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'deleteUser',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to delete user',
            timestamp: new Date(),
        });
    }
};
exports.deleteUser = deleteUser;
const updateUserRole = async (req, res) => {
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
        const userId = parseInt(req.params.userId || '0', 10);
        const { role } = req.body;
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                timestamp: new Date(),
            });
            return;
        }
        if (userId === req.user?.id) {
            res.status(400).json({
                success: false,
                error: 'Cannot change your own role',
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
        const oldRole = user.role;
        await user.update({ role });
        (0, logger_1.logSecurity)('Admin changed user role', req.user?.id, {
            targetUserId: userId,
            oldRole,
            newRole: role,
        });
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                personnelId: user.personnelId,
                name: user.name,
                role: user.role,
                updatedAt: user.updatedAt,
            },
            message: 'User role updated successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'updateUserRole',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to update user role',
            timestamp: new Date(),
        });
    }
};
exports.updateUserRole = updateUserRole;
const toggleUserStatus = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId || '0', 10);
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
                timestamp: new Date(),
            });
            return;
        }
        if (userId === req.user?.id) {
            res.status(400).json({
                success: false,
                error: 'Cannot change your own status',
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
        const newStatus = !user.isActive;
        await user.update({ isActive: newStatus });
        (0, logger_1.logSecurity)('Admin toggled user status', req.user?.id, {
            targetUserId: userId,
            newStatus,
        });
        res.status(200).json({
            success: true,
            data: {
                id: user.id,
                personnelId: user.personnelId,
                name: user.name,
                isActive: user.isActive,
                updatedAt: user.updatedAt,
            },
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully`,
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'toggleUserStatus',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to update user status',
            timestamp: new Date(),
        });
    }
};
exports.toggleUserStatus = toggleUserStatus;
const resetUserPassword = async (req, res) => {
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
        const userId = parseInt(req.params.userId || '0', 10);
        const { newPassword } = req.body;
        if (isNaN(userId)) {
            res.status(400).json({
                success: false,
                error: 'Invalid user ID',
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
        const saltRounds = 12;
        const passwordHash = await bcryptjs_1.default.hash(newPassword, saltRounds);
        await user.update({ passwordHash });
        (0, logger_1.logSecurity)('Admin reset user password', req.user?.id, {
            targetUserId: userId,
        });
        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'resetUserPassword',
            adminId: req.user?.id,
            userId: req.params.userId,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to reset password',
            timestamp: new Date(),
        });
    }
};
exports.resetUserPassword = resetUserPassword;
const getUserStatistics = async (req, res) => {
    try {
        const totalUsers = await models_1.User.count();
        const activeUsers = await models_1.User.count({ where: { isActive: true } });
        const inactiveUsers = await models_1.User.count({ where: { isActive: false } });
        const personnelCount = await models_1.User.count({ where: { role: 'personnel' } });
        const adminCount = await models_1.User.count({ where: { role: 'admin' } });
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentlyActive = await models_1.User.count({
            where: {
                lastSeen: {
                    [sequelize_1.Op.gte]: oneDayAgo,
                },
            },
        });
        (0, logger_1.logInfo)('Admin retrieved user statistics', {
            adminId: req.user?.id,
        });
        res.status(200).json({
            success: true,
            data: {
                total: totalUsers,
                active: activeUsers,
                inactive: inactiveUsers,
                personnel: personnelCount,
                admin: adminCount,
                recentlyActive,
            },
            timestamp: new Date(),
        });
    }
    catch (error) {
        (0, logger_1.logError)(error, {
            operation: 'getUserStatistics',
            adminId: req.user?.id,
        });
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve statistics',
            timestamp: new Date(),
        });
    }
};
exports.getUserStatistics = getUserStatistics;
//# sourceMappingURL=admin.js.map