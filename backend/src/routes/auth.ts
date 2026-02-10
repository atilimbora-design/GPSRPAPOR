import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
} from '@/controllers/auth';
import {
  authenticateToken,
  logAuthAttempt,
  requireAdmin,
} from '@/middleware/auth';
import {
  validateRegistration,
  validateLogin,
  validateRefreshToken,
  validateProfileUpdate,
  validatePasswordChange,
} from '@/middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Allow more refresh attempts
  message: {
    success: false,
    error: 'Too many token refresh attempts, please try again later',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public (but restricted to admin users in production via middleware)
 */
router.post('/register', authRateLimit, authenticateToken, requireAdmin, validateRegistration, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login', authRateLimit, logAuthAttempt, validateLogin, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', refreshRateLimit, validateRefreshToken, refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate tokens on client side)
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, validateProfileUpdate, updateProfile);

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password', authenticateToken, validatePasswordChange, changePassword);

/**
 * @route   GET /api/auth/verify
 * @desc    Verify if token is valid (for client-side token validation)
 * @access  Private
 */
router.get('/verify', authenticateToken, (req, res) => {
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

export default router;