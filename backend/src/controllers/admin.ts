import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '@/models';
import { ApiResponse, PaginatedResponse } from '@/types';
import { logInfo, logError, logSecurity } from '@/utils/logger';
import { validationResult } from 'express-validator';

/**
 * Get all users (admin only)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as string;
    const isActive = req.query.isActive as string;
    const search = req.query.search as string;

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (role && (role === 'personnel' || role === 'admin')) {
      where.role = role;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { personnelId: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      attributes: {
        exclude: ['passwordHash'],
      },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    const totalPages = Math.ceil(count / limit);

    logInfo('Admin retrieved user list', {
      adminId: req.user?.id,
      page,
      limit,
      total: count,
    });

    const response: PaginatedResponse = {
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
  } catch (error) {
    logError(error as Error, {
      operation: 'getAllUsers',
      adminId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve users',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Get user by ID (admin only)
 */
export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId || '0', 10);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId, {
      attributes: {
        exclude: ['passwordHash'],
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    logInfo('Admin retrieved user details', {
      adminId: req.user?.id,
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      data: user,
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'getUserById',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Create new user (admin only)
 */
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const {
      personnelId,
      name,
      email,
      phone,
      password,
      role = 'personnel',
      isActive = true,
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { personnelId },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this personnel ID already exists',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Check if email is already in use (if provided)
    if (email) {
      const existingEmailUser = await User.findOne({
        where: { email },
      });

      if (existingEmailUser) {
        res.status(409).json({
          success: false,
          error: 'Email address is already in use',
          timestamp: new Date(),
        } as ApiResponse);
        return;
      }
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userData: any = {
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

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await User.create(userData);

    logInfo('Admin created new user', {
      adminId: req.user?.id,
      newUserId: user.id,
      personnelId: user.personnelId,
      role: user.role,
    });

    const userResponse: any = {
      id: user.id,
      personnelId: user.personnelId,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    };

    if (user.email) userResponse.email = user.email;
    if (user.phone) userResponse.phone = user.phone;

    res.status(201).json({
      success: true,
      data: userResponse,
      message: 'User created successfully',
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'createUser',
      adminId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Update user (admin only)
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const userId = parseInt(req.params.userId || '0', 10);
    const { name, email, phone, role, isActive, preferences } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Check if email is already in use by another user
    if (email && email !== user.email) {
      const existingEmailUser = await User.findOne({
        where: { 
          email, 
          id: { [Op.ne]: userId } 
        },
      });

      if (existingEmailUser) {
        res.status(409).json({
          success: false,
          error: 'Email address is already in use',
          timestamp: new Date(),
        } as ApiResponse);
        return;
      }
    }

    // Update user
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (preferences !== undefined) updateData.preferences = preferences;

    await user.update(updateData);

    logInfo('Admin updated user', {
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'updateUser',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId || '0', 10);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Prevent admin from deleting themselves
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    await user.destroy();

    logSecurity('Admin deleted user', req.user?.id, {
      targetUserId: userId,
      targetPersonnelId: user.personnelId,
      targetRole: user.role,
    });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'deleteUser',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const userId = parseInt(req.params.userId || '0', 10);
    const { role } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Prevent admin from changing their own role
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const oldRole = user.role;
    await user.update({ role });

    logSecurity('Admin changed user role', req.user?.id, {
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'updateUserRole',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update user role',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Activate/deactivate user (admin only)
 */
export const toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = parseInt(req.params.userId || '0', 10);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Prevent admin from deactivating themselves
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot change your own status',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const newStatus = !user.isActive;
    await user.update({ isActive: newStatus });

    logSecurity('Admin toggled user status', req.user?.id, {
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'toggleUserStatus',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Reset user password (admin only)
 */
export const resetUserPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const userId = parseInt(req.params.userId || '0', 10);
    const { newPassword } = req.body;

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    const user = await User.findByPk(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    await user.update({ passwordHash });

    logSecurity('Admin reset user password', req.user?.id, {
      targetUserId: userId,
    });

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'resetUserPassword',
      adminId: req.user?.id,
      userId: req.params.userId,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Get user statistics (admin only)
 */
export const getUserStatistics = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = await User.count({ where: { isActive: false } });
    const personnelCount = await User.count({ where: { role: 'personnel' } });
    const adminCount = await User.count({ where: { role: 'admin' } });

    // Get recently active users (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyActive = await User.count({
      where: {
        lastSeen: {
          [Op.gte]: oneDayAgo,
        },
      },
    });

    logInfo('Admin retrieved user statistics', {
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'getUserStatistics',
      adminId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics',
      timestamp: new Date(),
    } as ApiResponse);
  }
};
