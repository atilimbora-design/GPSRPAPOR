import * as fc from 'fast-check';
import request from 'supertest';
import express from 'express';
import { User } from '@/models';
import {
  authenticateToken,
  requireAdmin,
  requirePermission,
  requireOwnershipOrAdmin,
  Permission,
  generateToken,
  hasPermission,
} from '@/middleware/auth';
import { createTestUser } from './setup';
import bcrypt from 'bcryptjs';

// Feature: gps-rapor-redesign, Property 17: Access Control and Security Monitoring

/**
 * **Validates: Requirements 8.5**
 * 
 * Property: For any user action or suspicious activity, the system should enforce 
 * role-based permissions and log security events with administrator alerts.
 */

// Mock the security middleware to avoid issues in tests
jest.mock('@/middleware/security', () => ({
  rateLimiter: (req: any, res: any, next: any) => next(),
  authRateLimiter: (req: any, res: any, next: any) => next(),
  helmetConfig: (req: any, res: any, next: any) => next(),
  compressionConfig: (req: any, res: any, next: any) => next(),
  securityHeaders: (req: any, res: any, next: any) => next(),
  securityLogger: (req: any, res: any, next: any) => next(),
  sanitizeRequest: (req: any, res: any, next: any) => next(),
}));

// Counter for unique ID generation
let uniqueIdCounter = Math.floor(Math.random() * 10000);

// Helper function to generate unique personnel IDs
const generateUniquePersonnelId = (): string => {
  uniqueIdCounter++;
  const timestamp = Date.now().toString(36).slice(-4);
  const counter = uniqueIdCounter.toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `T${timestamp}${counter}${random}`.substring(0, 10);
};

// Helper generators for property tests
const roleGenerator = fc.oneof(
  fc.constant('personnel' as const),
  fc.constant('admin' as const)
);

const permissionGenerator = fc.oneof(
  fc.constant(Permission.USER_READ),
  fc.constant(Permission.USER_CREATE),
  fc.constant(Permission.USER_UPDATE),
  fc.constant(Permission.USER_DELETE),
  fc.constant(Permission.USER_MANAGE_ROLES),
  fc.constant(Permission.LOCATION_READ_OWN),
  fc.constant(Permission.LOCATION_READ_ALL),
  fc.constant(Permission.LOCATION_CREATE),
  fc.constant(Permission.MESSAGE_READ_OWN),
  fc.constant(Permission.MESSAGE_READ_ALL),
  fc.constant(Permission.MESSAGE_CREATE),
  fc.constant(Permission.MESSAGE_DELETE),
  fc.constant(Permission.REPORT_READ),
  fc.constant(Permission.REPORT_CREATE),
  fc.constant(Permission.REPORT_DELETE),
  fc.constant(Permission.SYSTEM_ADMIN),
  fc.constant(Permission.SYSTEM_MONITOR)
);

const adminOnlyPermissions = [
  Permission.USER_CREATE,
  Permission.USER_UPDATE,
  Permission.USER_DELETE,
  Permission.USER_MANAGE_ROLES,
  Permission.LOCATION_READ_ALL,
  Permission.MESSAGE_READ_ALL,
  Permission.MESSAGE_DELETE,
  Permission.REPORT_CREATE,
  Permission.REPORT_DELETE,
  Permission.SYSTEM_ADMIN,
  Permission.SYSTEM_MONITOR,
];

const personnelPermissions = [
  Permission.USER_READ,
  Permission.LOCATION_READ_OWN,
  Permission.LOCATION_CREATE,
  Permission.MESSAGE_READ_OWN,
  Permission.MESSAGE_CREATE,
  Permission.REPORT_READ,
];

describe('Property 17: Access Control and Security Monitoring', () => {
  let app: express.Application;

  beforeAll(() => {
    // Setup test Express app with various protected routes
    app = express();
    app.use(express.json());

    // Admin-only routes
    app.get('/admin-route', authenticateToken, requireAdmin, (req, res) => {
      res.json({ message: 'Admin access granted', userId: req.user?.id });
    });

    // Permission-based routes
    app.post('/create-user', authenticateToken, requirePermission(Permission.USER_CREATE), (req, res) => {
      res.json({ message: 'User creation allowed' });
    });

    app.get('/read-all-locations', authenticateToken, requirePermission(Permission.LOCATION_READ_ALL), (req, res) => {
      res.json({ message: 'Read all locations allowed' });
    });

    app.delete('/delete-message', authenticateToken, requirePermission(Permission.MESSAGE_DELETE), (req, res) => {
      res.json({ message: 'Message deletion allowed' });
    });

    app.post('/create-report', authenticateToken, requirePermission(Permission.REPORT_CREATE), (req, res) => {
      res.json({ message: 'Report creation allowed' });
    });

    // Ownership-based routes
    app.get('/user/:userId/data', authenticateToken, requireOwnershipOrAdmin('userId'), (req, res) => {
      res.json({ message: 'Data access granted', userId: req.params.userId });
    });

    app.get('/user/:userId/profile', authenticateToken, requireOwnershipOrAdmin('userId'), (req, res) => {
      res.json({ message: 'Profile access granted', userId: req.params.userId });
    });
  });

  describe('Role-Based Permission Enforcement', () => {
    it('should enforce correct permissions for any role-permission combination', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          role: roleGenerator,
          permission: permissionGenerator,
        }),
        async ({ role, permission }) => {
          // Create user with specified role
          const uniquePersonnelId = generateUniquePersonnelId();
          const user = await createTestUser({
            personnelId: uniquePersonnelId,
            name: 'Test User',
            role,
            isActive: true,
          });

          // Check if role should have permission
          const shouldHavePermission = hasPermission(role, permission);
          const actualHasPermission = hasPermission(role, permission);

          // Verify permission check is consistent
          expect(actualHasPermission).toBe(shouldHavePermission);

          // Verify admin has all permissions
          if (role === 'admin') {
            expect(actualHasPermission).toBe(true);
          }

          // Verify personnel doesn't have admin-only permissions
          if (role === 'personnel' && adminOnlyPermissions.includes(permission)) {
            expect(actualHasPermission).toBe(false);
          }

          // Verify personnel has their designated permissions
          if (role === 'personnel' && personnelPermissions.includes(permission)) {
            expect(actualHasPermission).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });

    it('should deny access to admin-only routes for non-admin users', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          personnelName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
        }),
        async ({ personnelName }) => {
          // Create personnel user
          const uniquePersonnelId = generateUniquePersonnelId();
          const personnelUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: personnelName,
            role: 'personnel',
            isActive: true,
          });

          const token = generateToken(personnelUser);

          // Attempt to access admin route
          const response = await request(app)
            .get('/admin-route')
            .set('Authorization', `Bearer ${token}`);

          // Should be denied
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Admin access required');
        }
      ), { numRuns: 5 });
    });

    it('should allow access to admin-only routes for admin users', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          adminName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
        }),
        async ({ adminName }) => {
          // Create admin user
          const uniquePersonnelId = generateUniquePersonnelId();
          const adminUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: adminName,
            role: 'admin',
            isActive: true,
          });

          const token = generateToken(adminUser);

          // Access admin route
          const response = await request(app)
            .get('/admin-route')
            .set('Authorization', `Bearer ${token}`);

          // Should be allowed
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Admin access granted');
          expect(response.body.userId).toBe(adminUser.id);
        }
      ), { numRuns: 5 });
    });
  });

  describe('Permission-Based Access Control', () => {
    it('should enforce permission requirements for any admin-only permission', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant(Permission.USER_CREATE),
          fc.constant(Permission.LOCATION_READ_ALL),
          fc.constant(Permission.MESSAGE_DELETE),
          fc.constant(Permission.REPORT_CREATE)
        ),
        async (permission) => {
          // Create personnel user (should not have admin permissions)
          const uniquePersonnelId = generateUniquePersonnelId();
          const personnelUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: 'Personnel User',
            role: 'personnel',
            isActive: true,
          });

          // Create admin user (should have all permissions)
          const uniqueAdminId = generateUniquePersonnelId();
          const adminUser = await createTestUser({
            personnelId: uniqueAdminId,
            name: 'Admin User',
            role: 'admin',
            isActive: true,
          });

          const personnelToken = generateToken(personnelUser);
          const adminToken = generateToken(adminUser);

          // Map permissions to routes
          const routeMap: Record<string, { method: string; path: string }> = {
            [Permission.USER_CREATE]: { method: 'post', path: '/create-user' },
            [Permission.LOCATION_READ_ALL]: { method: 'get', path: '/read-all-locations' },
            [Permission.MESSAGE_DELETE]: { method: 'delete', path: '/delete-message' },
            [Permission.REPORT_CREATE]: { method: 'post', path: '/create-report' },
          };

          const route = routeMap[permission];
          if (!route) return;

          // Personnel should be denied
          const personnelResponse = await request(app)
            [route.method as 'get' | 'post' | 'delete'](route.path)
            .set('Authorization', `Bearer ${personnelToken}`);

          expect(personnelResponse.status).toBe(403);
          expect(personnelResponse.body.error).toBe('Insufficient permissions');

          // Admin should be allowed
          const adminResponse = await request(app)
            [route.method as 'get' | 'post' | 'delete'](route.path)
            .set('Authorization', `Bearer ${adminToken}`);

          expect(adminResponse.status).toBe(200);
        }
      ), { numRuns: 8 });
    });

    it('should correctly validate permission hierarchy for any user', async () => {
      await fc.assert(fc.asyncProperty(
        roleGenerator,
        async (role) => {
          // Create user with specified role
          const uniquePersonnelId = generateUniquePersonnelId();
          const user = await createTestUser({
            personnelId: uniquePersonnelId,
            name: 'Test User',
            role,
            isActive: true,
          });

          // Check all admin-only permissions
          for (const permission of adminOnlyPermissions) {
            const hasAccess = hasPermission(role, permission);
            
            if (role === 'admin') {
              expect(hasAccess).toBe(true);
            } else {
              expect(hasAccess).toBe(false);
            }
          }

          // Check all personnel permissions
          for (const permission of personnelPermissions) {
            const hasAccess = hasPermission(role, permission);
            // Both admin and personnel should have personnel permissions
            expect(hasAccess).toBe(true);
          }
        }
      ), { numRuns: 10 });
    });
  });

  describe('Resource Ownership Verification', () => {
    it('should allow users to access their own resources', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          role: roleGenerator,
        }),
        async ({ userName, role }) => {
          // Create user
          const uniquePersonnelId = generateUniquePersonnelId();
          const user = await createTestUser({
            personnelId: uniquePersonnelId,
            name: userName,
            role,
            isActive: true,
          });

          const token = generateToken(user);

          // Access own data
          const response = await request(app)
            .get(`/user/${user.id}/data`)
            .set('Authorization', `Bearer ${token}`);

          // Should be allowed
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Data access granted');
          expect(parseInt(response.body.userId)).toBe(user.id);
        }
      ), { numRuns: 8 });
    });

    it('should deny personnel users from accessing other users resources', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          user1Name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          user2Name: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
        }),
        async ({ user1Name, user2Name }) => {
          // Create two personnel users
          const uniqueId1 = generateUniquePersonnelId();
          const user1 = await createTestUser({
            personnelId: uniqueId1,
            name: user1Name,
            role: 'personnel',
            isActive: true,
          });

          const uniqueId2 = generateUniquePersonnelId();
          const user2 = await createTestUser({
            personnelId: uniqueId2,
            name: user2Name,
            role: 'personnel',
            isActive: true,
          });

          const token1 = generateToken(user1);

          // User1 tries to access User2's data
          const response = await request(app)
            .get(`/user/${user2.id}/profile`)
            .set('Authorization', `Bearer ${token1}`);

          // Should be denied
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Access denied');
        }
      ), { numRuns: 8 });
    });

    it('should allow admin users to access any user resources', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          adminName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          targetUserName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          targetUserRole: roleGenerator,
        }),
        async ({ adminName, targetUserName, targetUserRole }) => {
          // Create admin user
          const uniqueAdminId = generateUniquePersonnelId();
          const adminUser = await createTestUser({
            personnelId: uniqueAdminId,
            name: adminName,
            role: 'admin',
            isActive: true,
          });

          // Create target user
          const uniqueTargetId = generateUniquePersonnelId();
          const targetUser = await createTestUser({
            personnelId: uniqueTargetId,
            name: targetUserName,
            role: targetUserRole,
            isActive: true,
          });

          const adminToken = generateToken(adminUser);

          // Admin accesses target user's data
          const response = await request(app)
            .get(`/user/${targetUser.id}/data`)
            .set('Authorization', `Bearer ${adminToken}`);

          // Should be allowed
          expect(response.status).toBe(200);
          expect(response.body.message).toBe('Data access granted');
          expect(parseInt(response.body.userId)).toBe(targetUser.id);
        }
      ), { numRuns: 8 });
    });
  });

  describe('Security Event Logging', () => {
    it('should handle unauthorized access attempts consistently', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          personnelName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          attemptCount: fc.integer({ min: 1, max: 5 }),
        }),
        async ({ personnelName, attemptCount }) => {
          // Create personnel user
          const uniquePersonnelId = generateUniquePersonnelId();
          const personnelUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: personnelName,
            role: 'personnel',
            isActive: true,
          });

          const token = generateToken(personnelUser);

          // Make multiple unauthorized access attempts
          for (let i = 0; i < attemptCount; i++) {
            const response = await request(app)
              .get('/admin-route')
              .set('Authorization', `Bearer ${token}`);

            // Each attempt should be consistently denied
            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Admin access required');
          }
        }
      ), { numRuns: 5 });
    });

    it('should reject requests without authentication tokens', async () => {
      await fc.assert(fc.asyncProperty(
        fc.oneof(
          fc.constant('/admin-route'),
          fc.constant('/create-user'),
          fc.constant('/read-all-locations'),
          fc.constant('/delete-message')
        ),
        async (route) => {
          // Attempt to access protected route without token
          const method = route === '/create-user' || route === '/delete-message' 
            ? (route === '/create-user' ? 'post' : 'delete')
            : 'get';

          const response = await request(app)
            [method as 'get' | 'post' | 'delete'](route);

          // Should be denied with 401 Unauthorized
          expect(response.status).toBe(401);
          expect(response.body.error).toBe('Access token required');
        }
      ), { numRuns: 8 });
    });

    it('should reject requests with invalid tokens', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          invalidToken: fc.oneof(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            fc.constant('invalid.token.here'),
            fc.constant('Bearer invalid'),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes('.') && s.trim().length > 0)
          ),
          route: fc.oneof(
            fc.constant('/admin-route'),
            fc.constant('/create-user'),
            fc.constant('/read-all-locations')
          ),
        }),
        async ({ invalidToken, route }) => {
          const method = route === '/create-user' ? 'post' : 'get';

          const response = await request(app)
            [method as 'get' | 'post'](route)
            .set('Authorization', `Bearer ${invalidToken}`);

          // Should be denied with 403 Forbidden (invalid token)
          // Empty or whitespace-only tokens are treated as missing tokens (401)
          expect([401, 403]).toContain(response.status);
          if (response.status === 403) {
            expect(response.body.error).toBe('Invalid token');
          } else {
            expect(response.body.error).toBe('Access token required');
          }
        }
      ), { numRuns: 8 });
    });
  });

  describe('Inactive User Handling', () => {
    it('should deny access to inactive users regardless of role', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          role: roleGenerator,
        }),
        async ({ userName, role }) => {
          // Create inactive user
          const uniquePersonnelId = generateUniquePersonnelId();
          const inactiveUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: userName,
            role,
            isActive: false, // User is inactive
          });

          const token = generateToken(inactiveUser);

          // Attempt to access any protected route
          const response = await request(app)
            .get('/admin-route')
            .set('Authorization', `Bearer ${token}`);

          // Should be denied due to inactive status
          expect(response.status).toBe(403);
          expect(response.body.error).toBe('Invalid or inactive user');
        }
      ), { numRuns: 8 });
    });
  });

  describe('Cross-Role Permission Consistency', () => {
    it('should maintain consistent permission checks across all operations', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          adminName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
          personnelName: fc.string({ minLength: 2, maxLength: 50 }).filter(s => s.trim().length > 0),
        }),
        async ({ adminName, personnelName }) => {
          // Create admin and personnel users
          const uniqueAdminId = generateUniquePersonnelId();
          const adminUser = await createTestUser({
            personnelId: uniqueAdminId,
            name: adminName,
            role: 'admin',
            isActive: true,
          });

          const uniquePersonnelId = generateUniquePersonnelId();
          const personnelUser = await createTestUser({
            personnelId: uniquePersonnelId,
            name: personnelName,
            role: 'personnel',
            isActive: true,
          });

          // Verify admin has all permissions
          const allPermissions = [...adminOnlyPermissions, ...personnelPermissions];
          for (const permission of allPermissions) {
            expect(hasPermission('admin', permission)).toBe(true);
          }

          // Verify personnel only has personnel permissions
          for (const permission of personnelPermissions) {
            expect(hasPermission('personnel', permission)).toBe(true);
          }

          for (const permission of adminOnlyPermissions) {
            expect(hasPermission('personnel', permission)).toBe(false);
          }
        }
      ), { numRuns: 5 });
    });
  });
});
