import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  toggleUserStatus,
  resetUserPassword,
  getUserStatistics,
} from '@/controllers/admin';
import {
  authenticateToken,
  requireAdmin,
  requirePermission,
  Permission,
} from '@/middleware/auth';
import {
  validateAdminUserCreation,
  validateAdminUserUpdate,
  validateRoleUpdate,
  validatePasswordReset,
} from '@/middleware/validation';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for admin operations
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many admin requests, please try again later',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and admin role check to all routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminRateLimit);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination and filtering
 * @access  Admin only
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 * @query   role - Filter by role (personnel | admin)
 * @query   isActive - Filter by active status (true | false)
 * @query   search - Search by name, personnelId, or email
 */
router.get('/users', requirePermission(Permission.USER_READ), getAllUsers);

/**
 * @route   GET /api/admin/users/statistics
 * @desc    Get user statistics
 * @access  Admin only
 */
router.get('/users/statistics', requirePermission(Permission.USER_READ), getUserStatistics);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    Get user by ID
 * @access  Admin only
 */
router.get('/users/:userId', requirePermission(Permission.USER_READ), getUserById);

/**
 * @route   POST /api/admin/users
 * @desc    Create new user
 * @access  Admin only
 */
router.post(
  '/users',
  requirePermission(Permission.USER_CREATE),
  validateAdminUserCreation,
  createUser
);

/**
 * @route   PUT /api/admin/users/:userId
 * @desc    Update user
 * @access  Admin only
 */
router.put(
  '/users/:userId',
  requirePermission(Permission.USER_UPDATE),
  validateAdminUserUpdate,
  updateUser
);

/**
 * @route   DELETE /api/admin/users/:userId
 * @desc    Delete user
 * @access  Admin only
 */
router.delete(
  '/users/:userId',
  requirePermission(Permission.USER_DELETE),
  deleteUser
);

/**
 * @route   PATCH /api/admin/users/:userId/role
 * @desc    Update user role
 * @access  Admin only
 */
router.patch(
  '/users/:userId/role',
  requirePermission(Permission.USER_MANAGE_ROLES),
  validateRoleUpdate,
  updateUserRole
);

/**
 * @route   PATCH /api/admin/users/:userId/status
 * @desc    Toggle user active status
 * @access  Admin only
 */
router.patch(
  '/users/:userId/status',
  requirePermission(Permission.USER_UPDATE),
  toggleUserStatus
);

/**
 * @route   POST /api/admin/users/:userId/reset-password
 * @desc    Reset user password
 * @access  Admin only
 */
router.post(
  '/users/:userId/reset-password',
  requirePermission(Permission.USER_UPDATE),
  validatePasswordReset,
  resetUserPassword
);

export default router;
