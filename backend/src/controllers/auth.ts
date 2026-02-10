import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { User } from '@/models';
import {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '@/middleware/auth';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ApiResponse,
} from '@/types';
import { logInfo, logError, logSecurity } from '@/utils/logger';
import { validationResult } from 'express-validator';

/**
 * User registration controller
 */
export const register = async (req: Request, res: Response): Promise<void> => {
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
    }: RegisterRequest = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { personnelId },
    });

    if (existingUser) {
      logSecurity('Registration attempt with existing personnel ID', undefined, {
        personnelId,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
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

    if (email) userData.email = email;
    if (phone) userData.phone = phone;

    const user = await User.create(userData);

    logInfo('New user registered', {
      userId: user.id,
      personnelId: user.personnelId,
      role: user.role,
      ip: req.ip,
    });

    const userResponse: any = {
      id: user.id,
      personnelId: user.personnelId,
      name: user.name,
      role: user.role,
    };

    if (user.email) userResponse.email = user.email;
    if (user.phone) userResponse.phone = user.phone;

    const response: RegisterResponse = {
      success: true,
      user: userResponse,
      message: 'User registered successfully',
    };

    res.status(201).json(response);
  } catch (error) {
    logError(error as Error, {
      operation: 'register',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * User login controller
 */
export const login = async (req: Request, res: Response): Promise<void> => {
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

    const { username, password, deviceInfo }: LoginRequest = req.body;

    // Find user by personnel ID or email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { personnelId: username },
          { email: username },
        ],
      },
    });

    if (!user) {
      logSecurity('Login attempt with non-existent user', undefined, {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Check if user is active
    if (!user.isActive) {
      logSecurity('Login attempt with inactive user', user.id, {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(403).json({
        success: false,
        error: 'Account is deactivated',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logSecurity('Login attempt with invalid password', user.id, {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Update user's last seen and device info
    const updateData: any = {
      lastSeen: new Date(),
    };

    if (deviceInfo) updateData.deviceInfo = deviceInfo;

    await user.update(updateData);

    // Generate tokens
    const accessToken = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    logInfo('User logged in successfully', {
      userId: user.id,
      personnelId: user.personnelId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    const userResponse: any = {
      id: user.id,
      personnelId: user.personnelId,
      name: user.name,
      role: user.role,
    };

    if (user.email) userResponse.email = user.email;
    if (user.phone) userResponse.phone = user.phone;
    if (user.avatar) userResponse.avatar = user.avatar;
    if (user.lastSeen) userResponse.lastSeen = user.lastSeen;

    const response: LoginResponse = {
      success: true,
      user: userResponse,
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logError(error as Error, {
      operation: 'login',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(500).json({
      success: false,
      error: 'Login failed',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Token refresh controller
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
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

    const { refreshToken: token }: RefreshTokenRequest = req.body;

    // Verify refresh token
    let userId: number;
    try {
      userId = verifyRefreshToken(token);
    } catch (error) {
      logSecurity('Invalid refresh token used', undefined, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(403).json({
        success: false,
        error: 'Invalid refresh token',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Get user from database
    const user = await User.findByPk(userId);
    if (!user || !user.isActive) {
      logSecurity('Refresh token used for invalid/inactive user', userId, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(403).json({
        success: false,
        error: 'Invalid user',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Generate new tokens
    const accessToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    logInfo('Tokens refreshed successfully', {
      userId: user.id,
      ip: req.ip,
    });

    const response: RefreshTokenResponse = {
      success: true,
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: 24 * 60 * 60, // 24 hours in seconds
      },
    };

    res.status(200).json(response);
  } catch (error) {
    logError(error as Error, {
      operation: 'refreshToken',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * User logout controller
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (userId) {
      // Update user's last logout time
      await User.update(
        { lastLogout: new Date() },
        { where: { id: userId } }
      );

      logInfo('User logged out', {
        userId,
        ip: req.ip,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'logout',
      userId: req.user?.id,
      ip: req.ip,
    });
    res.status(500).json({
      success: false,
      error: 'Logout failed',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'getProfile',
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
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

    const userId = req.user?.id;
    const { name, email, phone, preferences } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
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
    await user.update({
      name: name || user.name,
      email: email || user.email,
      phone: phone || user.phone,
      preferences: preferences || user.preferences,
    });

    logInfo('User profile updated', {
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
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'updateProfile',
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      timestamp: new Date(),
    } as ApiResponse);
  }
};

/**
 * Change user password
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
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

    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
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

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      logSecurity('Invalid current password in password change attempt', userId, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      res.status(401).json({
        success: false,
        error: 'Current password is incorrect',
        timestamp: new Date(),
      } as ApiResponse);
      return;
    }

    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await user.update({
      passwordHash: newPasswordHash,
    });

    logInfo('User password changed', {
      userId: user.id,
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    logError(error as Error, {
      operation: 'changePassword',
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
      timestamp: new Date(),
    } as ApiResponse);
  }
};